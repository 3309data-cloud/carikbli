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
    // ---- TARUH DI SINI (BARIS PERTAMA SEBELUM IF) ----
    console.log("🔥 [TRIGGERED] processSubmit berjalan! Parameter searchQuery berisi:", `"${searchQuery}"`);
    console.log("🔥 [TRIGGERED] State query internal saat ini berisi:", `"${query}"`);
    // --------------------------------------------------

    const q = (searchQuery || query || "").trim();
    if (!q) {
      console.warn("🛑 [BLOCKED] Fungsi berhenti karena teks terbaca kosong!");
      return;
    }

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

    const autoAnswers = extractAnswers(megaQuery, data.dimensionKeywords);
    console.log("🔍 [DEBUG 4] Hasil ekstraksi jawaban otomatis (autoAnswers):", autoAnswers);
    
    if (Object.keys(autoAnswers).length > 0) {
      setAnswers(autoAnswers);
    }

    setSubmittedQuery(q);
    setChatMessages([{ type: "user", text: q }]);
  }, [data.synonyms, data.dimensionKeywords, query]); // Tambahkan query ke dependency array

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