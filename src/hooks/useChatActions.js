import { useState, useCallback } from "react";
import { extractAnswers } from "../utils/extractAnswers";
import { cleanQuery } from "../utils/textProcessor";
import { expandQuery } from "../utils/synonym";

export function useChatActions(data) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [answers, setAnswers] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showResult, setShowResult] = useState(false);

const processSubmit = useCallback((searchQuery) => {
    console.log("🔥 [TRIGGERED] processSubmit berjalan! Parameter searchQuery berisi:", `"${searchQuery}"`);

    const q = (searchQuery || query || "").trim();
    if (!q) return;

    setShowResult(false);
    setAnswers({}); 
    
    const cleaned = cleanQuery(q);
    console.log("🔍 [DEBUG 1] Hasil setelah cleanQuery:", `"${cleaned}"`);
    
    const expandedTerms = expandQuery(cleaned, data.synonyms);
    console.log("🔍 [DEBUG 2] Hasil array dari expandQuery:", expandedTerms);
    
    const megaQuery = Array.isArray(expandedTerms) 
      ? expandedTerms.map(t => t.word).join(" ")
      : cleaned;
    console.log("🔍 [DEBUG 3] Hasil akhir megaQuery untuk Chatbot & Extract:", `"${megaQuery}"`);

    // =======================================================================
    // JEMBATAN OTOMATIS: LANGSUNG MEMAKAI DATA OPTIONS ASLI KAMU
    // =======================================================================
    // Kita ubah struktur data.options secara dinamis agar bisa dibaca oleh mesin pengekstrak
    const mappedKeywordsFromOptions = (data?.options || []).map(opt => {
      // Ambil nama dimensi dari question_id (misal: 'q_jenis_potong' menjadi 'jenis_potong')
      const dimensionName = opt.question_id ? opt.question_id.replace('q_', '') : '';
      
      return {
        dimension: dimensionName,
        // Daftarkan teks yang akan dicari di dalam kalimat (Label: "HEWAN RUMINANSIA", Value: "hewan ruminansia")
        keyword: `${opt.label}, ${opt.value}`, 
        value: opt.value
      };
    });

    // Panggil extractAnswers menggunakan data options yang sudah dipetakan
    const autoAnswers = extractAnswers(megaQuery, mappedKeywordsFromOptions);
    console.log("🔍 [DEBUG 4] Hasil ekstraksi jawaban otomatis (autoAnswers):", autoAnswers);
    // =======================================================================
    
    if (Object.keys(autoAnswers).length > 0) {
      setAnswers(autoAnswers);
      console.log("🚀 [SUCCESS] State answers berhasil diisi otomatis:", autoAnswers);
    }

    setSubmittedQuery(q);
    setChatMessages([{ type: "user", text: q }]);
  }, [data, query]);

  const handleAnswer = useCallback((question, value) => {
    setShowResult(false);
    setAnswers(prev => ({ ...prev, [question.dimension]: value }));
    setChatMessages(prev => [...prev, { type: "user", text: value }]);
  }, []);

  const resetChat = useCallback(() => {
    setQuery("");
    setSubmittedQuery("");
    setAnswers({});
    setChatMessages([]);
    setShowResult(false);
  }, []);

  return {
    query, setQuery,
    submittedQuery, setSubmittedQuery,
    answers, setAnswers,
    chatMessages, setChatMessages,
    isBotTyping, setIsBotTyping,
    showResult, setShowResult,
    processSubmit, handleAnswer, resetChat
  };
}