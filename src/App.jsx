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
  // --- STATE ---
  const [data, setData] = useState({
    kbli: [], questions: [], options: [], rules: [],
    synonyms: [], kbliDimensions: [], dimensions: [], dimensionKeywords: [],
    settings: {} // ✅ Tambahkan ini agar tidak null
  });

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [answers, setAnswers] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("kbli_history_v2");
    return saved ? JSON.parse(saved) : [];
  });

  const chatEndRef = useRef(null);

  // --- 1. INITIAL LOAD ---
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
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isBotTyping]);

  // --- 2. SEARCH & INFERENCE ENGINE ---
  const fuse = useMemo(() => new Fuse(data.kbli, {
    keys: [
      { name: 'keyword', weight: 0.6 },
      { name: 'nama', weight: 0.2 },   // Naikkan bobot Nama KBLI
      { name: 'uraian', weight: 0.2 }  // Turunkan bobot Uraian agar tidak mendominasi
    ],
    // --- PERUBAHAN UTAMA DI SINI ---
    threshold: 0.25,       // Makin mendekati 0, pencarian makin ketat (wajib sama persis)
    ignoreLocation: true,  // Penting: Agar kata di awal atau di akhir kalimat dinilai sama
    // -------------------------------
    useExtendedSearch: true,
    includeScore: true,
  }), [data.kbli]);

  const expandedQuery = useMemo(() => {
    const cleaned = cleanQuery(submittedQuery);
    return expandQuery(cleaned, data.synonyms);
  }, [submittedQuery, data.synonyms]);

  const inference = useMemo(() => {
    if (!submittedQuery) return {};

    const words = [...new Set(expandedQuery.split(/\s+/).filter(w => w.length > 0))]; // Gunakan Set agar kata duplikat di input dihitung 1x

    const aggregateResults = {};

    words.forEach((word) => {
      const results = fuse.search(word);
      results.forEach((res) => {
        const id = res.item.kode;

        // LOGIKA BARU: Jika kata sudah ditemukan di KBLI ini, jangan dikalikan lagi skornya
        // Kita ambil skor terbaik (terkecil) dari kata-kata yang masuk
        if (!aggregateResults[id]) {
          aggregateResults[id] = { ...res, combinedScore: res.score };
        } else {
          // Mengambil nilai terbaik, bukan akumulasi perkalian
          aggregateResults[id].combinedScore = Math.min(aggregateResults[id].combinedScore, res.score);
        }
      });
    });

    const sortedResults = Object.values(aggregateResults).sort((a, b) => a.combinedScore - b.combinedScore);
    if (sortedResults.length === 0) return { finalResults: [] };

    // SEBELUMNYA: let candidates = sortedResults.slice(0, 5).map(res => ({
    // UBAH MENJADI:

    // 1. JARING LEBAR: Ambil 30 hasil teks terbaik agar yang relevan tidak terbuang
    let candidates = sortedResults.slice(0, 30).map(res => ({
      ...res.item,
      textScore: Math.min(100, Math.max(0, (1 - res.combinedScore) * 100))
    }));

    // Logika ambiguitas tetap berjalan untuk 30 kandidat ini...
    const isAmbiguous = candidates.length > 1 && candidates.slice(1).some(c =>
      c.keyword?.toLowerCase().includes(submittedQuery.toLowerCase())
    );

    const baseResults = candidates.map((c) => {
      let finalBase = c.textScore;
      const searchWords = submittedQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const fullQuery = submittedQuery.toLowerCase();

      let exactBonus = 0;

      // 1. Bonus per kata yang cocok di keyword (Multiplikatif)
      // Semakin banyak kata yang cocok, bonus semakin besar secara linear
      searchWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (c.keyword && regex.test(c.keyword.toLowerCase())) {
          exactBonus += 30; // Jika KBLI 01133 cocok "jagung" dan "manis", ia dapat +60
        }
      });

      // 2. Bonus Super untuk Frasa Utuh (Phrase Match)
      // Ini kunci agar "Jagung Manis" menang mutlak atas "Jagung" biasa
      if (c.keyword && c.keyword.toLowerCase().includes(fullQuery)) {
        exactBonus += 70; // Bonus tambahan jika frasa persis ditemukan
      }

      // 3. Penalti untuk Kata yang Hilang (Negative Booster)
      // Jika user mengetik "manis" tapi KBLI tidak punya keyword "manis", kurangi skornya
      if (fullQuery.includes("manis") && (!c.keyword || !c.keyword.toLowerCase().includes("manis"))) {
        exactBonus -= 50;
      }

      return { ...c, finalScore: finalBase + exactBonus };
    });

    // 2. SCORING ENGINE: Nilai dan urutkan ulang ke-30 kandidat tersebut
    const scoredResults = calculateScores(baseResults, data.rules, answers);
    const sortedFinal = [...scoredResults].sort((a, b) => b.finalScore - a.finalScore);
    const conf = calculateConfidence(sortedFinal);
    const top = sortedFinal[0];

    // 3. CORONG SEMPIT: Mesin pertanyaan otomatis hanya membedah 5 yang teratas (sesuai kode di questionEngine.js)
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

  // --- 3. HANDLERS ---

  // Automatis simpan riwayat jika bot yakin
  useEffect(() => {
    if (inference?.topResult && inference.confidence >= 80 && !inference.currentQuestion) {
      const result = inference.topResult;
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.kode !== result.kode);
        const newEntry = {
          query: submittedQuery,
          kode: result.kode,
          nama: result.nama
        };
        const newHistory = [newEntry, ...filtered].slice(0, 5);
        localStorage.setItem("kbli_history_v2", JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [inference.confidence, inference.topResult, submittedQuery]);

  const processSubmit = (searchQuery) => {
    const q = searchQuery.trim();
    if (!q) return;

    const autoAnswers = extractAnswers(q, data.dimensionKeywords);
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
    setAnswers(prev => ({ ...prev, [question.dimension]: value }));
    setChatMessages(prev => [...prev, { type: "user", text: value }]);
  };

  const handleReset = () => {
    setQuery("");
    setSubmittedQuery("");
    setAnswers({});
    setChatMessages([]);
    setIsReported(false);
    setSelectedKbli(null); // ✅ Tambahkan ini
  };

  const handleReportError = async () => {
    if (!inference?.topResult?.kode) {
      alert("Belum ada hasil yang bisa dilaporkan.");
      return;
    }
    if (isReporting || isReported) return;
    setIsReporting(true);
    try {
      const { error } = await supabase.from('feedback_logs').insert([{
        query: submittedQuery,
        wrong_kode: inference.topResult.kode,
        answers_snapshot: answers,
        created_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setIsReported(true);
    } catch (err) {
      console.error("Gagal kirim:", err.message);
    } finally {
      setIsReporting(false);
    }
  };
  // Tambahkan satu state baru di atas (bersama state lainnya)
  const [selectedKbli, setSelectedKbli] = useState(null);

  async function handleTrainingSubmit(selectedItem) {
    setSelectedKbli(selectedItem);
    setIsReported(true); // Langsung set reported agar UI berubah

    try {
      await supabase.from('training_logs').insert([{
        raw_query: submittedQuery,
        selected_kode: selectedItem.kode,
        final_candidates: inference.finalResults.slice(0, 5),
        chat_history: answers
      }]);
    } catch (err) {
      console.error("Error:", err);
    }
  }
  // Bot Typing Effect
  useEffect(() => {
    const q = inference?.currentQuestion;
    if (!q) return;
    const isAlreadyAsked = chatMessages.some(m => m.question?.id === q.id);
    if (!isAlreadyAsked) {
      setIsBotTyping(true);
      const timer = setTimeout(() => {
        setIsBotTyping(false);
        setChatMessages(prev => [...prev, { type: "bot", text: q.question, question: q }]);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [inference?.currentQuestion, chatMessages]);

  if (isLoading) return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 font-medium text-sm text-center px-4">Memuat Sistem Sensus Ekonomi 2026...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center overflow-hidden">
      <div className="w-full max-w-md bg-white shadow-2xl h-full flex flex-col relative">

        <header className="bg-blue-700 text-white p-5 shrink-0 z-30 shadow-md">
          <h1 className="text-xl font-bold tracking-tight">KBLI AI Assistant</h1>
          <p className="text-xs text-blue-200 opacity-90">Sensus Ekonomi 2026 - BPS Boyolali</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 pb-8">
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-400 py-10 text-sm">
              Ketikkan kegiatan usaha untuk memulai.<br />Contoh: "Menanam jagung manis"
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${msg.type === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
                }`}>
                {msg.text}
                {msg.type === "bot" && msg.question && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {data.options
                      .filter(opt => String(opt.question_id) === String(msg.question.id))
                      .map(opt => (
                        <button key={opt.id} onClick={() => handleAnswer(msg.question, opt.value)}
                          className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          {opt.label}
                        </button>
                      ))}
                    { //Filtered Option
                      //(() => {
                      // const dynamicOptions = getAnswerOptionsForDimension({
                      //dimension: msg.question.dimension,
                      //candidates: msg.question.candidates,
                      //candidateDimsMap: msg.question.candidateDimsMap,
                      //optionsTable: data.options
                      //  });

                      //  return dynamicOptions.map(opt => (
                      //<button
                      // key={opt.value}
                      // onClick={() => handleAnswer(msg.question, opt.value)}
                      // className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      // >
                      //</div>{opt.label}
                      //</div> </button>
                      // ));
                      //</main>  })()
                    }
                  </div>
                )}
              </div>
            </div>
          ))}

          {isBotTyping && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-2xl px-4 py-2 shadow-sm flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}

          {/* HASIL AKHIR KBLI */}
          {/* ============================================================ */}
          {/* SECTION: HASIL AKHIR & PEMBELAJARAN AI                      */}
          {/* ============================================================ */}
          {/* SECTION: HASIL AKHIR */}
          {inference.topResult && !inference.currentQuestion && !isBotTyping && (
            <div className={`bg-white border-2 ${isReported ? 'border-green-400' : 'border-yellow-400'} rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4`}>
              {inference.confidence >= 80 ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 shadow-sm">
                  {/* Visualisasi Hierarki */}
                  <div className="flex flex-col gap-2 mb-4 border-b border-green-100 pb-4">
                    <div className="flex items-start gap-2">
                      <span className="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0 mt-0.5">
                        {getKbliHierarchy(inference.topResult.kode).catLet}
                      </span>
                      <span className="text-[10px] text-green-800 font-bold uppercase leading-tight">
                        {getKbliHierarchy(inference.topResult.kode).catName}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 ml-1">
                      <div className="w-1 h-3 bg-green-200 rounded-full shrink-0 mt-1"></div>
                      <span className="text-[10px] text-green-700 font-semibold leading-tight">
                        {getKbliHierarchy(inference.topResult.kode).group}. {getKbliHierarchy(inference.topResult.kode).groupName}
                      </span>
                    </div>
                  </div>

                  {/* Informasi Utama */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Saran Kode KBLI</span>
                    <div className="text-2xl font-black text-green-900 my-1">{inference.topResult.kode}</div>
                    <h3 className="font-bold text-gray-800 leading-tight text-lg">{inference.topResult.nama}</h3>
                  </div>

                  {/* Deskripsi */}
                  <div className="bg-white/60 rounded-xl p-3 border border-green-100 mb-4">
                    <p className="text-[11px] text-gray-600 italic leading-relaxed">"{inference.topResult.uraian}"</p>
                  </div>

                  {/* Footer & Confidence */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Confidence Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${inference.confidence}%` }}></div>
                        </div>
                        <span className="text-sm font-black text-green-700">{Math.round(inference.confidence)}%</span>
                      </div>
                    </div>

                    <button onClick={handleReset} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-95">
                      Mulai Pencarian Baru
                    </button>

                    <button onClick={handleReportError} disabled={isReporting || isReported}
                      className={`w-full py-2 mt-1 text-[10px] font-bold rounded-lg border transition-all ${isReported ? "bg-gray-100 text-gray-400 border-gray-200" : "text-red-500 border-red-200 hover:bg-red-50"
                        }`}>
                      {isReported ? "✓ Laporan Terkirim" : "⚠️ Laporkan Jika Salah"}
                    </button>
                  </div>
                </div>
              ) : (
                /* DISINI PERBAIKANNYA: Elemen di bawah ini harus dibungkus satu parent */
                <div className="flex flex-col">
                  <div className={`${isReported ? 'bg-green-400' : 'bg-yellow-400'} p-3 flex items-center gap-2`}>
                    <span className={`text-xs font-black ${isReported ? 'text-green-900' : 'text-yellow-900'} uppercase`}>
                      {isReported ? "✓ Pilihan Terkonfirmasi" : "Verifikasi Diperlukan"}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    <p className="text-[11px] text-gray-600 leading-tight">
             {isReported ? "" : "Saya menemukan beberapa kode yang mendekati. Mohon pilih yang paling sesuai dengan aktivitas lapangan:"}
          </p>
                    <div className="space-y-2">
                      {(isReported && selectedKbli ? [selectedKbli] : inference.finalResults.slice(0, 6)).map((cand) => (
                        <button
                          key={cand.kode}
                          disabled={isReported}
                          onClick={() => handleTrainingSubmit(cand)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${isReported
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                            }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`${isReported ? 'bg-green-600 text-white' : 'bg-blue-100 text-blue-700'} text-[10px] font-black px-2 py-0.5 rounded uppercase`}>
                              KBLI {cand.kode}
                            </span>
                            {isReported && <span className="text-[10px] font-bold text-green-600 uppercase">✓ Terverifikasi</span>}
                          </div>
                          <div className={`font-bold ${isReported ? 'text-green-900' : 'text-gray-800'} text-sm`}>
                            {cand.nama}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 italic italic">"{cand.uraian}"</p>
                        </button>
                      ))}
                    </div>

                    {isReported && (
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl animate-in fade-in zoom-in duration-300">
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                          {data.settings?.learning_mode === 'frequency'
                            ? "Terima kasih! Sistem telah mempelajari istilah baru ini secara otomatis."
                            : "Terima kasih! Istilah ini telah dikirim ke Admin untuk divalidasi."}
                        </p>
                      </div>
                    )}

                    {isReported && (
                      <button
                        onClick={handleReset}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                      >
                        Mulai Pencarian Baru
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <div className="shrink-0 bg-white border-t shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-40">
          {query === "" && history.length > 0 && (
            <div className="p-3 pb-2 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-1.5 px-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Terakhir Dicari</span>
                <button onClick={() => { setHistory([]); localStorage.removeItem("kbli_history_v2"); }} className="text-[9px] text-red-400 hover:underline">Hapus</button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {history.map((item, idx) => (
                  <button key={idx} onClick={() => handleSelectHistory(item)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-95 group">
                    <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-1.5 py-0.5 rounded group-hover:bg-blue-600 group-hover:text-white">{item.kode}</div>
                    <div className="flex flex-col text-left max-w-[120px]">
                      <div className="text-[10px] font-bold text-gray-800 truncate italic">"{item.query}"</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <footer className="p-3 flex gap-2 items-center bg-white">
            <button onClick={handleReset} className="p-3 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-all shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Cari kegiatan usaha..."
              className="flex-1 bg-gray-50 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button onClick={handleSubmit} disabled={!query.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-md disabled:bg-gray-200 transition-all active:scale-95 shrink-0">
              Kirim
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;