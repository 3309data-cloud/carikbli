import { useEffect, useMemo, useState, useRef } from "react";
import Fuse from "fuse.js";

// Services & Utils
import { getAppData, supabase } from "./services/api";
import { expandQuery } from "./utils/synonym";
import { calculateScores } from "./utils/scoring";
import { calculateConfidence } from "./utils/confidence";
import { getBestQuestion } from "./utils/questionEngine";
import { generateExplanation } from "./utils/explanation";
import { compareTopCandidates } from "./utils/comparison";
import { extractAnswers } from "./utils/extractAnswers";
import { cleanQuery } from "./utils/textProcessor";
import { getKbliHierarchy } from "./utils/getKbliHierarchy";
import { getAnswerOptionsForDimension } from "./utils/getAnswerOptionsForDimension";

function App() {
  // --- STATE ---
  const [data, setData] = useState({
    kbli: [], questions: [], options: [], rules: [],
    synonyms: [], kbliDimensions: [], dimensions: [], dimensionKeywords: [],
    settings: {}
  });

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [answers, setAnswers] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk efek UI
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isListening, setIsListening] = useState(false); // ✅ State untuk Mic
  const [copiedCode, setCopiedCode] = useState(null);    // ✅ State untuk Copy Clipboard

  const [isReporting, setIsReporting] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [selectedKbli, setSelectedKbli] = useState(null);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("kbli_history_v2");
    return saved ? JSON.parse(saved) : [];
  });

  // Refs untuk Scroll Pintar
  const mainRef = useRef(null);
  const resultCardRef = useRef(null);
  const typingRef = useRef(null);
  const verifikasiRef = useRef(null);
  const isScrolling = useRef(false);

  // --- 1. INITIAL LOAD & OFFLINE SYNC ---
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const appData = await getAppData();
        setData({
          kbli: appData.kbli || [],
          questions: appData.questions || [],
          options: appData.options || [],
          rules: appData.rules || [],
          synonyms: appData.synonyms || [],
          dimensions: appData.dimensions || [],
          dimensionKeywords: appData.dimension_keywords || [],
          settings: appData.settings
        });
      } catch (error) {
        console.error("❌ [INIT] Gagal memuat data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // ✅ TRIGGER SINKRONISASI OFFLINE SAAT APLIKASI DIBUKA & SAAT ONLINE KEMBALI
    syncOfflineLogs();
    window.addEventListener('online', syncOfflineLogs);
    return () => window.removeEventListener('online', syncOfflineLogs);
  }, []);

  // ✅ FUNGSI SINKRONISASI OFFLINE (Sistem Antrean)
  const saveToOfflineQueue = (table, payload) => {
    const queueKey = `offline_${table}_queue`;
    const currentQueue = JSON.parse(localStorage.getItem(queueKey) || "[]");
    currentQueue.push(payload);
    localStorage.setItem(queueKey, JSON.stringify(currentQueue));
    console.log(`[OFFLINE] Tersimpan lokal di antrean ${table}`);
  };

  const syncOfflineLogs = async () => {
    if (!navigator.onLine) return; // Batal jika masih offline

    const tables = ['feedback_logs', 'training_logs'];
    for (const table of tables) {
      const queueKey = `offline_${table}_queue`;
      const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");

      if (queue.length > 0) {
        try {
          const { error } = await supabase.from(table).insert(queue);
          if (!error) {
            localStorage.removeItem(queueKey); // Hapus antrean jika berhasil
            console.log(`[SYNC] Berhasil upload ${queue.length} log offline ke ${table}`);
          } else {
            console.error(`[SYNC] Supabase error saat upload ${table}:`, error);
          }
        } catch (err) {
          console.error(`[SYNC] Network error saat upload ${table}:`, err);
        }
      }
    }
  };

  // --- LOGIKA SCROLL KUSTOM YANG PELAN & PINTAR ---
  const slowScrollTo = (targetScrollTop) => {
    if (!mainRef.current) return;

    const start = mainRef.current.scrollTop;
    const distance = targetScrollTop - start;
    if (Math.abs(distance) < 5) return;

    const duration = 1200;
    let startTime = null;
    isScrolling.current = true;

    const stopScroll = () => { isScrolling.current = false; };
    mainRef.current.addEventListener('touchstart', stopScroll, { once: true });
    mainRef.current.addEventListener('wheel', stopScroll, { once: true });

    const animation = (currentTime) => {
      if (!isScrolling.current) return;
      if (startTime === null) startTime = currentTime;

      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      mainRef.current.scrollTop = start + distance * ease;

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        isScrolling.current = false;
        mainRef.current.removeEventListener('touchstart', stopScroll);
        mainRef.current.removeEventListener('wheel', stopScroll);
      }
    };
    requestAnimationFrame(animation);
  };



  // --- 2. SEARCH & INFERENCE ENGINE ---
  const fuse = useMemo(() => new Fuse(data.kbli, {
    keys: [
      { name: 'keyword', weight: 0.7 },
      { name: 'nama', weight: 0.2 },
      { name: 'uraian', weight: 0.1 }
    ],
    threshold: 0.25,
    ignoreLocation: true,
    useExtendedSearch: true,
    includeScore: true,
  }), [data.kbli]);

  const expandedQuery = useMemo(() => {
    const cleaned = cleanQuery(submittedQuery);
    const expanded = expandQuery(cleaned, data.synonyms);
    console.log(expanded);
    return expanded;
  }, [submittedQuery, data.synonyms]);

const inference = useMemo(() => {
  if (!submittedQuery) return {};

  // 1. Kumpulan kata unik dari hasil ekspansi (termasuk kata asli + sinonim)
  const allTerms = [...new Set(expandedQuery.split(/\s+/).filter(w => w.length > 2))];
  const aggregateResults = {};

  // Fuse search tetap menggunakan kata per kata dari ekspansi
  allTerms.forEach((word) => {
    const results = fuse.search(word);
    results.forEach((res) => {
      const id = res.item.kode;
      if (!aggregateResults[id]) {
        aggregateResults[id] = { ...res, combinedScore: res.score };
      } else {
        aggregateResults[id].combinedScore = Math.min(aggregateResults[id].combinedScore, res.score);
      }
    });
  });

  const sortedResults = Object.values(aggregateResults).sort((a, b) => a.combinedScore - b.combinedScore);
  if (sortedResults.length === 0) return { finalResults: [] };

  let candidates = sortedResults.slice(0, 30).map(res => ({
    ...res.item,
    textScore: Math.min(100, Math.max(0, (1 - res.combinedScore) * 100))
  }));

  const baseResults = candidates.map((c, index) => {
    let exactBonus = 0;
    const isTopCandidate = index < 5;
    
    // --- KUNCI PERBAIKAN: Gunakan allTerms, bukan rawQuery ---
    const searchWords = allTerms; 
    const rawQuery = submittedQuery.toLowerCase().trim();

    if (isTopCandidate) {
      console.group(`🔍 ANALISIS SKORING: [${c.kode}] ${c.nama}`);
      console.log(`Base TextScore (Fuse): ${c.textScore.toFixed(2)}`);
      console.log(`Kata yang diproses: ${searchWords.join(", ")}`);
    }

    const ignoredWords = [];

    // 1. LOGIKA KATA PER KATA (Unigram)
    searchWords.forEach(word => {
      if (ignoredWords.includes(word.toLowerCase())) {
        if (isTopCandidate) console.log(`⏭️ Kata "${word}" diabaikan (Stopword)`);
        return;
      }

      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      let matchCount = 0;
      let wordBonus = 0;

      if (c.keyword && wordRegex.test(c.keyword.toLowerCase())) {
        wordBonus += 20;
        matchCount++;
      }
      if (c.nama && wordRegex.test(c.nama.toLowerCase())) {
        wordBonus += 10;
        matchCount++;
      }
      if (c.uraian && c.uraian.toLowerCase().includes(word)) {
        wordBonus += 5;
        matchCount++;
      }

      if (matchCount >= 2) {
        wordBonus += 15;
        if (isTopCandidate) console.log(`✨ Bonus Sinergi untuk kata "${word}" (+15)`);
      }

      exactBonus += wordBonus;
      if (isTopCandidate && wordBonus > 0) {
        console.log(`✅ Kata "${word}": +${wordBonus} poin`);
      }
    });

    // 2. LOGIKA FRASA BERURUTAN (Bigram)
    // Sekarang akan mendeteksi "kacang lain" karena ada di allTerms secara berurutan
    if (searchWords.length >= 2) {
      for (let i = 0; i < searchWords.length - 1; i++) {
        const phrase = `${searchWords[i]} ${searchWords[i + 1]}`;
        
        const phraseRegex = new RegExp(`\\b${phrase}\\b`, 'i');

        if (c.nama && phraseRegex.test(c.nama.toLowerCase())) {
          exactBonus += 30;
          if (isTopCandidate) console.log(`🔥 Frasa Berurutan (Nama): "${phrase}" +20`);
        } else if (c.keyword && phraseRegex.test(c.keyword.toLowerCase())) {
          exactBonus += 50;
          if (isTopCandidate) console.log(`🔥 Frasa Berurutan (Keyword): "${phrase}" +50`);
        }
      }
    }

    // 4. PENALTI AMBIGUITAS (Hanya jika input asli petugas sangat pendek)
    const finalScore = c.textScore + exactBonus;
    
    if (isTopCandidate) {
      console.log(`📊 TOTAL BONUS: ${exactBonus}`);
      console.log(`🏆 SKOR AKHIR: ${finalScore.toFixed(2)}`);
      console.groupEnd();
    }

    return { ...c, finalScore: finalScore };
  });

  // Urutkan dan hitung konfidensi
  const scoredResults = calculateScores(baseResults, data.rules, answers);
  const sortedFinal = [...scoredResults].sort((a, b) => b.finalScore - a.finalScore);
  const conf = calculateConfidence(sortedFinal);
  const top = sortedFinal[0];

  const question = getBestQuestion({
    finalResults: sortedFinal,
    rules: data.rules,
    questions: data.questions,
    answers,
    confidence: conf,
    dimensions: data.dimensions
  });

  return {
    topResult: top,
    finalResults: sortedFinal,
    confidence: conf,
    explanations: generateExplanation({ topResult: top, answers, rules: data.rules }),
    currentQuestion: question
  };
}, [submittedQuery, expandedQuery, fuse, data, answers]);

  // --- 3. HANDLERS & EFFECTS ---
useEffect(() => {
    const timer = setTimeout(() => {
      if (!mainRef.current) return;

      // ✅ Logika kalkulasi posisi absolut yang super presisi (Anti tertutup header)
      const calculateTarget = (el) => {
        const containerTop = mainRef.current.getBoundingClientRect().top;
        const elTop = el.getBoundingClientRect().top;
        // Kurangi 16px agar ada sedikit jarak pandang yang nyaman di atas pita kuning
        return mainRef.current.scrollTop + (elTop - containerTop) - 16; 
      };

      if (showResult) {
        // Jika tingkat keyakinan < 80 (Ambigu), scroll tepat ke pita kuning verifikasi
        if (inference?.confidence < 80 && verifikasiRef.current) {
          slowScrollTo(calculateTarget(verifikasiRef.current));
        } 
        // Jika yakin, scroll ke atas kartu hijau
        else if (resultCardRef.current) {
          slowScrollTo(calculateTarget(resultCardRef.current));
        }
      } else if (isBotTyping && typingRef.current) {
        slowScrollTo(calculateTarget(typingRef.current));
      } else if (chatMessages.length > 0) {
        if (!showResult && !isBotTyping) {
          slowScrollTo(mainRef.current.scrollHeight);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [chatMessages, isBotTyping, showResult, inference?.confidence]);
  useEffect(() => {
    if (showResult && inference?.topResult && inference.confidence >= 80 && !inference.currentQuestion) {
      const result = inference.topResult;
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.kode !== result.kode);
        const newEntry = { query: submittedQuery, kode: result.kode, nama: result.nama };
        const newHistory = [newEntry, ...filtered].slice(0, 5);
        localStorage.setItem("kbli_history_v2", JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [inference.confidence, inference.topResult, submittedQuery, showResult]);

  useEffect(() => {
    let timer;
    if (inference?.topResult && !inference?.currentQuestion) {
      if (!showResult) {
        setIsBotTyping(true);
        timer = setTimeout(() => {
          setIsBotTyping(false);
          setShowResult(true);
        }, 1000);
      }
    } else {
      setShowResult(false);
    }
    return () => clearTimeout(timer);
  }, [inference, showResult]);

  useEffect(() => {
    const q = inference?.currentQuestion;
    if (!q) return;
    const isAlreadyAsked = chatMessages.some(m => m.question?.id === q.id);
    if (!isAlreadyAsked) {
      setIsBotTyping(true);
      const timer = setTimeout(() => {
        setIsBotTyping(false);
        setChatMessages(prev => [...prev, { type: "bot", text: q.question, question: q }]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inference?.currentQuestion, chatMessages]);

const processSubmit = (searchQuery) => {
    const q = searchQuery.trim();
    if (!q) return;

    setShowResult(false);

    // --- TAMBAHAN BARU: Kita buat teks yang berisi sinonim ---
    const cleaned = cleanQuery(q);
    const expandedText = expandQuery(cleaned, data.synonyms);

    // --- UBAH 'q' MENJADI 'expandedText' DI SINI ---
    const autoAnswers = extractAnswers(expandedText, data.dimensionKeywords);
    
    if (Object.keys(autoAnswers).length > 0) {
      setAnswers(prev => ({ ...prev, ...autoAnswers }));
    }

    setSubmittedQuery(q);
    setChatMessages(prev => [...prev, { type: "user", text: q }]);
    setIsReported(false);
  };

  const handleSubmit = () => {
    processSubmit(query);
    setQuery("");
  };

  const handleSelectHistory = (historyItem) => {
    setQuery("");
    setAnswers({});
    processSubmit(historyItem.query);
  };

  const handleAnswer = (question, value) => {
    setShowResult(false);
    setAnswers(prev => ({ ...prev, [question.dimension]: value }));
    setChatMessages(prev => [...prev, { type: "user", text: value }]);
  };

  const handleReset = () => {
    setQuery("");
    setSubmittedQuery("");
    setAnswers({});
    setChatMessages([]);
    setIsReported(false);
    setSelectedKbli(null);
    setShowResult(false);
    setCopiedCode(null);
  };

  // ✅ FITUR: Salin Kode ke Clipboard
  const handleCopyKbli = (kode, e) => {
    if (e) e.stopPropagation(); // Mencegah klik tombol ter-trigger
    navigator.clipboard.writeText(kode);
    setCopiedCode(kode);

    // Opsional: Beri efek getar sedikit (Haptic Feedback) jika HP mendukung
    if (window.navigator.vibrate) window.navigator.vibrate(50);

    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ✅ FITUR: Input Suara (Web Speech API)
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Maaf, browser atau perangkat Anda tidak mendukung fitur input suara.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
    };
    recognition.onerror = (event) => {
      console.error("Mic error:", event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleReportError = async () => {
    if (!inference?.topResult?.kode) {
      alert("Belum ada hasil yang bisa dilaporkan.");
      return;
    }
    if (isReporting || isReported) return;
    setIsReporting(true);

    const payload = {
      query: submittedQuery,
      wrong_kode: inference.topResult.kode,
      answers_snapshot: answers,
      created_at: new Date().toISOString(),
    };

    try {
      // ✅ SINKRONISASI OFFLINE: Jika tidak ada sinyal, simpan ke lokal
      if (navigator.onLine) {
        const { error } = await supabase.from('feedback_logs').insert([payload]);
        if (error) throw error;
      } else {
        saveToOfflineQueue('feedback_logs', payload);
      }
      setIsReported(true);
    } catch (err) {
      console.error("Gagal kirim, menyimpan ke antrean offline:", err.message);
      saveToOfflineQueue('feedback_logs', payload);
      setIsReported(true); // Tetap anggap sukses di UI agar petugas bisa lanjut bekerja
    } finally {
      setIsReporting(false);
    }
  };

  async function handleTrainingSubmit(selectedItem) {
    setSelectedKbli(selectedItem);
    setIsReported(true);

    const payload = {
      raw_query: submittedQuery,
      selected_kode: selectedItem.kode,
      final_candidates: inference.finalResults.slice(0, 6),
      chat_history: answers,
      created_at: new Date().toISOString()
    };

    try {
      // ✅ SINKRONISASI OFFLINE: Jika tidak ada sinyal, simpan ke lokal
      if (navigator.onLine) {
        const { error } = await supabase.from('training_logs').insert([payload]);
        if (error) throw error;
      } else {
        saveToOfflineQueue('training_logs', payload);
      }
    } catch (err) {
      console.error("Gagal training, menyimpan ke antrean offline:", err);
      saveToOfflineQueue('training_logs', payload);
    }
  }

  if (isLoading) return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-600 font-medium">Menyiapkan KBLI...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center items-start sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white sm:rounded-3xl shadow-xl h-full sm:h-[90vh] flex flex-col overflow-hidden border border-gray-200">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 p-4 shrink-0 flex justify-between items-center z-50">
          <div>
            <h1 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <span className="bg-orange-500 text-white p-1 rounded-md shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              Pencarian KBLI
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">BPS Kabupaten Boyolali • Sensus Ekonomi 2026</p>
          </div>
          {chatMessages.length === 0 && (
            <button onClick={handleReset} className="text-gray-400 hover:text-orange-500 p-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          )}
        </header>

        {/* Area Chat */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 bg-gray-50/50">

          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="bg-orange-100 p-6 rounded-full text-orange-500">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-lg px-6">Halo Petugas Lapangan!</p>
                <p className="text-gray-500 text-sm px-10">Ketik aktivitas ekonomi yang Anda temukan untuk diklasifikasikan.</p>
              </div>
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm transition-all ${msg.type === "user"
                ? "bg-orange-500 text-white rounded-tr-none shadow-md shadow-orange-100"
                : "bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm"
                }`}>
                {msg.text}
                {msg.type === "bot" && msg.question && (
                  <div className="grid grid-cols-1 gap-2 mt-4">
                    {data.options
                      .filter(opt => String(opt.question_id) === String(msg.question.id))
                      .map(opt => {
                        // LOGIKA PENGECEKAN
                        const isAnswered = answers[msg.question.dimension] !== undefined;
                        const isSelected = answers[msg.question.dimension] === opt.value;

                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleAnswer(msg.question, opt.value)}
                            disabled={isAnswered} // Mematikan tombol jika pertanyaan ini sudah dijawab
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${!isAnswered
                                ? "bg-gray-50 border border-gray-200 hover:bg-orange-500 hover:text-white active:scale-95 cursor-pointer group" // Belum dijawab (Aktif)
                                : isSelected
                                  ? "bg-orange-500 text-white border-transparent shadow-sm" // Jawaban yang dipilih
                                  : "bg-gray-50 text-gray-400 border border-gray-100 opacity-60 cursor-not-allowed" // Jawaban yang tidak dipilih (Mati)
                              }`}
                          >
                            <span>{opt.label}</span>

                            {/* Munculkan icon centang jika opsi ini yang dipilih */}
                            {isSelected && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isBotTyping && (
            <div ref={typingRef} className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-full px-4 py-3 flex gap-1 shadow-sm">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          {/* HASIL KBLI FINAL */}
          {showResult && inference.topResult && !inference.currentQuestion && !isBotTyping && (
            <div ref={resultCardRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-10">
              <div className={`rounded-3xl overflow-hidden shadow-lg transition-all border-t-8 ${isReported ? 'border-green-500' : (inference.confidence >= 80 ? 'border-green-500' : 'border-yellow-400')}`}>

                {inference.confidence >= 80 ? (
                  <div className="bg-green-50 p-5 border-x border-b border-green-100">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-green-600 text-white text-[12px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0 mt-0.5">
                        {getKbliHierarchy(inference.topResult.kode).catLet}
                      </span>
                      <span className="text-[12px] text-green-800 font-bold uppercase leading-tight">
                        {getKbliHierarchy(inference.topResult.kode).catName}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Saran Kode KBLI</p>

                      {/* ✅ FITUR: TOMBOL SALIN (High Confidence) */}
                      <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-green-900 tracking-tighter">{inference.topResult.kode}</h2>
                        <button
                          onClick={(e) => handleCopyKbli(inference.topResult.kode, e)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-200/50 hover:bg-green-200 text-green-700 rounded-xl transition-all shadow-sm active:scale-95"
                          title="Salin Kode"
                        >
                          {copiedCode === inference.topResult.kode ? (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points="20 6 9 17 4 12" /></svg> <span className="text-[10px] font-bold">Tersalin!</span></>
                          ) : (
                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"></path></svg> <span className="text-[10px] font-bold uppercase tracking-tighter">Salin</span></>
                          )}
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-gray-800 leading-tight pt-2">{inference.topResult.nama}</h3>
                    </div>

                    <div className="mt-4 p-4 bg-white/60 rounded-2xl border border-green-200 italic text-gray-600 text-xs leading-relaxed">
                      "{inference.topResult.uraian}"
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex items-center justify-between bg-white/80 p-3 rounded-2xl shadow-sm border border-green-100">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-xs font-black text-green-700">{Math.round(inference.confidence)}%</span>
                          </div>
                          <span className="text-[10px] font-bold text-green-800 uppercase">Tingkat Kecocokan</span>
                        </div>
                      </div>

                      <button onClick={handleReset} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 transition-all active:scale-95">
                        Mulai Pencarian Baru
                      </button>

                      <button onClick={handleReportError} disabled={isReporting || isReported}
                        className={`w-full py-3 text-xs font-bold rounded-xl border-2 transition-all ${isReported ? "bg-white/50 text-gray-400 border-gray-200" : "text-red-500 border-red-200 hover:bg-red-50"
                          }`}>
                        {isReported ? "✓ Laporan Terkirim" : "⚠️ Laporkan Jika Aplikasi Salah Identifikasi"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-x border-b border-gray-200 rounded-b-3xl">
                    <div ref={verifikasiRef} className={`${isReported ? 'bg-green-400' : 'bg-yellow-400'} p-4 flex items-center gap-2`}>
                      <span className={`text-xs font-black ${isReported ? 'text-green-900' : 'text-yellow-900'} uppercase tracking-tight`}>
                        {isReported ? "✓ Pilihan Terkonfirmasi" : "⚠️ Verifikasi Diperlukan"}
                      </span>
                    </div>

                    <div className="p-5">
                      {!isReported && (
                        <div className="mb-4">
                          <p className="text-sm font-bold text-gray-800">Saya menemukan beberapa kode KBLI yang cocok dengan pencarian anda :</p>
                          <p className="text-[11px] text-gray-500 mt-1">Untuk meningkatkan akurasi aplikasi kedepannya, pilih salah satu yang paling relevan dengan usaha responden.</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {(isReported && selectedKbli ? [selectedKbli] : inference.finalResults.slice(0, 6)).map((cand) => (
                          <button
                            key={cand.kode}
                            // ❌ ATRIBUT INI DIHAPUS: disabled={isReported} 
                            // ✅ KITA GANTI LOGIKANYA DI ONCLICK:
                            onClick={() => {
                              if (!isReported) handleTrainingSubmit(cand);
                            }}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isReported
                              ? "border-green-200 bg-green-50 opacity-100 cursor-default" // Ditambah cursor-default agar tidak terlihat seperti tombol yang bisa diklik lagi
                              : "border-gray-100 hover:border-orange-500 bg-white shadow-sm active:scale-[0.98]"
                              }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className={`px-2 py-1 rounded text-[10px] font-black ${isReported ? 'bg-green-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                KBLI {cand.kode}
                              </span>

                              {/* ✅ FITUR: TOMBOL SALIN (Untuk KBLI yang dikonfirmasi manual) */}
                              {isReported && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-green-600 tracking-tighter">✓ TERVERIFIKASI</span>
                                  <div
                                    onClick={(e) => handleCopyKbli(cand.kode, e)}
                                    // Ditambah cursor-pointer agar saat diarahkan ke ikon salin kursor berubah
                                    className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors shadow-sm ml-1 cursor-pointer"
                                    title="Salin Kode"
                                  >
                                    {copiedCode === cand.kode ? (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points="20 6 9 17 4 12" /></svg>
                                    ) : (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"></path></svg>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className={`font-bold text-sm ${isReported ? 'text-green-900' : 'text-gray-800'}`}>{cand.nama}</p>
                            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 italic">"{cand.uraian}"</p>
                          </button>
                        ))}
                      </div>

                      {isReported && (
                        <div className="mt-4 bg-green-50 border border-green-100 p-4 rounded-2xl animate-in fade-in duration-300">
                          <p className="text-xs text-green-800 leading-relaxed font-medium">
                            {data.settings?.learning_mode === 'frequency'
                              ? "Terima kasih! Sistem telah mempelajari istilah baru ini secara otomatis."
                              : "Terima kasih! Masukan Anda telah membantu meningkatkan akurasi aplikasi. Data ini akan digunakan untuk melatih model agar lebih pintar dalam memahami aktivitas ekonomi di masa depan."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-20">
          {chatMessages.length === 0 ? (
            <>
              {history.length > 0 && (
                <div className="mb-4 overflow-x-auto flex gap-2 no-scrollbar pb-2">
                  {history.map((item, idx) => (
                    <button key={idx} onClick={() => handleSelectHistory(item)}
                      className="shrink-0 bg-orange-50 hover:bg-orange-100 border border-orange-100 px-3 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 group">
                      <span className="text-[10px] font-black text-orange-600">{item.kode}</span>
                      <span className="text-[10px] font-bold text-gray-600 truncate max-w-[80px]">"{item.query}"</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-center">

                {/* ✅ FITUR: TOMBOL MIC DAN INPUT */}
                <div className="flex-1 relative flex items-center bg-gray-50 border-2 border-transparent focus-within:border-orange-400 focus-within:bg-white rounded-2xl px-2 transition-all">
                  <input
                    type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder={isListening ? "Mendengarkan..." : "Ketik aktivitas..."}
                    className="w-full bg-transparent border-none py-4 px-3 text-sm font-medium outline-none placeholder:text-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={handleVoiceSearch}
                    className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                    title="Cari dengan Suara"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="12" y1="19" x2="12" y2="23"></line><line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="8" y1="23" x2="16" y2="23"></line></svg>
                  </button>
                </div>

                <button onClick={handleSubmit} disabled={!query.trim() && !isListening}
                  className="bg-orange-500 disabled:bg-gray-200 text-white p-4 rounded-2xl shadow-lg shadow-orange-100/50 active:scale-90 transition-all flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleReset}
              className="w-full bg-orange-50 text-orange-600 border-2 border-orange-200 font-bold py-4 rounded-2xl hover:bg-orange-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Mulai Pencarian Baru
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;