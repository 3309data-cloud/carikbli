import React, { useEffect, useState } from "react";

// Hooks yang telah kita buat
import { useKbliData } from "./hooks/useKbliData";
import { useInference } from "./hooks/useInference";
import { useChatActions } from "./hooks/useChatActions";
import { useScrollLogic } from "./hooks/useScrollLogic";

// Utils (diimpor untuk getKbliHierarchy di result)
import { getKbliHierarchy } from "./utils/getKbliHierarchy";

// Sub-Components UI (Asumsi dipisah ke file masing-masing, atau definisikan di bawah)
import ChatBubble from "./components/Chat/ChatBubble";
import InferenceResult from "./components/Result/InferenceResult";
import SearchInput from "./components/Input/SearchInput";
import {ChatSkeleton} from "./components/UI/Skeleton";
import {ResultSkeleton} from "./components/UI/Skeleton";


const WelcomeView = () => (
  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
    <div className="bg-orange-100 p-6 rounded-full text-orange-500">
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
    </div>
    <div>
      <p className="text-gray-800 font-bold text-lg px-6">Halo Petugas Lapangan!</p>
      <p className="text-gray-500 text-sm px-10">Ketik aktivitas ekonomi yang Anda temukan untuk diklasifikasikan.</p>
    </div>
  </div>
);

const TypingIndicator = React.forwardRef((props, ref) => (
  <div ref={ref} className="flex justify-start">
    <div className="bg-white border border-gray-200 rounded-full px-4 py-3 flex gap-1 shadow-sm">
      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></span>
      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
    </div>
  </div>
));

// --- MAIN APPLICATION ---
function App() {
  // 1. Data & Sync Hook
  const { data, isLoading, uploadLog } = useKbliData();
  
  // 2. Chat Actions Hook
  const {
    query, setQuery, submittedQuery, answers, setAnswers, chatMessages, setChatMessages,
    isBotTyping, setIsBotTyping, showResult, setShowResult,
    processSubmit, handleAnswer, resetChat
  } = useChatActions(data);

  // 3. Inference Engine Hook
  const inference = useInference(submittedQuery, data, answers);

  // 4. Scroll Logic Hook
  const { mainRef, resultCardRef, typingRef, verifikasiRef, scrollToElement } = useScrollLogic();

  // 5. Local UI State
  const [isListening, setIsListening] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isReporting, setIsReporting] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("kbli_history_v2");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedKbli, setSelectedKbli] = useState(null);

  // --- HANDLERS ---
  const handleCopyKbli = (kode, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(kode);
    setCopiedCode(kode);
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser tidak mendukung Voice Search.");
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => setQuery(e.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

// Di dalam function App() { ... }

const handleReportError = async () => {
    if (!inference?.topResult?.kode || isReporting || isReported) return;
    setIsReporting(true);

    const payload = { 
      query: submittedQuery, 
      wrong_kode: inference.topResult.kode, 
      answers_snapshot: answers, 
      created_at: new Date().toISOString() 
    };

    // Panggil uploadLog dari hook, tidak perlu panggil supabase langsung
    await uploadLog('feedback_logs', payload);
    
    setIsReported(true);
    setIsReporting(false);
  };

  const handleTrainingSubmit = async (selectedItem) => {
    setSelectedKbli(selectedItem);
    
    const payload = { 
      raw_query: submittedQuery, 
      selected_kode: selectedItem.kode, 
      final_candidates: inference.finalResults.slice(0, 6), 
      chat_history: answers, 
      created_at: new Date().toISOString() 
    };

    // Panggil uploadLog dari hook
    await uploadLog('training_logs', payload);
    
    setIsReported(true);
  };

  const handleResetAll = () => {
    resetChat();
    setIsReported(false);
    setCopiedCode(null);
    setSelectedKbli(null);
  };

  // --- EFFECTS ---
  // Menangani Auto-Response Bot untuk Pertanyaan
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
  }, [inference?.currentQuestion, chatMessages, setIsBotTyping, setChatMessages]);

  // Menangani Delay Munculnya Hasil (Typing Effect)
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
  }, [inference, showResult, setIsBotTyping, setShowResult]);

  // Update History LocalStorage
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

  // Auto Scroll Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showResult) {
        if (inference?.confidence < 80 && verifikasiRef.current) scrollToElement(verifikasiRef.current);
        else if (resultCardRef.current) scrollToElement(resultCardRef.current);
      } else if (isBotTyping && typingRef.current) {
        scrollToElement(typingRef.current);
      } else if (chatMessages.length > 0 && !showResult && !isBotTyping) {
        if (mainRef.current) mainRef.current.scrollTop = mainRef.current.scrollHeight;
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [chatMessages, isBotTyping, showResult, inference?.confidence, scrollToElement, verifikasiRef, resultCardRef, mainRef]);

// Di App.jsx
if (isLoading) return (
  <div className="fixed inset-0 bg-gray-100 flex justify-center items-start sm:items-center p-0 sm:p-4">
    <div className="w-full max-w-2xl bg-white sm:rounded-3xl shadow-xl h-full sm:h-[90vh] flex flex-col overflow-hidden">
      <header className="p-4 border-b border-gray-100 h-16 bg-white"></header>
      <main className="flex-1 p-4 space-y-6 bg-gray-50/50">
        <ChatSkeleton />
        <ChatSkeleton />
      </main>
      <div className="p-4 bg-white border-t h-20"></div>
    </div>
  </div>
);

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center items-start sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white sm:rounded-3xl shadow-xl h-full sm:h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        
{/* Header - Identik dengan Kode Awal */}
<header className="bg-white border-b border-gray-100 p-4 shrink-0 flex justify-between items-center z-50">
  <div>
    <h1 className="text-lg font-black text-gray-800 flex items-center gap-2">
      {/* Ikon Box Orange */}
      <span className="bg-orange-500 text-white p-1 rounded-md shadow-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      Pencarian KBLI
    </h1>
    {/* Sub-header spesifik BPS Boyolali */}
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
      BPS Kabupaten Boyolali • Sensus Ekonomi 2026
    </p>
  </div>

  {/* Tombol Reset Header (Hanya muncul jika belum ada chat) */}
  {chatMessages.length === 0 && (
    <button onClick={handleResetAll} className="text-gray-400 hover:text-orange-500 p-2 transition-colors">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  )}
</header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
          {chatMessages.length === 0 && <WelcomeView />}

          {chatMessages.map((msg, idx) => (
            <ChatBubble 
              key={idx} 
              msg={msg} 
              data={data} 
              answers={answers} 
              onAnswer={handleAnswer} 
            />
          ))}

          {isBotTyping && <TypingIndicator ref={typingRef} />}

          {showResult && inference.topResult && !inference.currentQuestion && !isBotTyping && (
            <InferenceResult 
              inference={inference}
              isReported={isReported}
              isReporting={isReporting}
              selectedKbli={selectedKbli}
              onReport={handleReportError}
              onTraining={handleTrainingSubmit}
              onReset={handleResetAll}
              onCopy={handleCopyKbli}
              copiedCode={copiedCode}
              verifikasiRef={verifikasiRef}
              resultCardRef={resultCardRef}
              data={data} // Dibutuhkan untuk settings & hierarchy
            />
          )}
        </main>

        <SearchInput 
          query={query}
          setQuery={setQuery}
          onSubmit={() => processSubmit(query)}
          onVoice={handleVoiceSearch}
          isListening={isListening}
          history={history}
          onSelectHistory={(item) => { handleResetAll(); processSubmit(item.query); }}
          chatMessages={chatMessages}
          onReset={handleResetAll}
        />
      </div>
    </div>
  );
}

export default App;