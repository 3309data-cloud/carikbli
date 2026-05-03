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
    const q = searchQuery.trim();
    if (!q) return;

    setShowResult(false);
    
    // Logika ekstraksi jawaban otomatis dari query (Sinonim aware)
    const cleaned = cleanQuery(q);
    const expandedText = expandQuery(cleaned, data.synonyms);
    const autoAnswers = extractAnswers(expandedText, data.dimensionKeywords);
    
    if (Object.keys(autoAnswers).length > 0) {
      setAnswers(prev => ({ ...prev, ...autoAnswers }));
    }

    setSubmittedQuery(q);
    setChatMessages(prev => [...prev, { type: "user", text: q }]);
  }, [data.synonyms, data.dimensionKeywords]);

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