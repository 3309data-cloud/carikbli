import { useMemo } from "react";
import Fuse from "fuse.js";
import { cleanQuery } from "../utils/textProcessor";
import { expandQuery } from "../utils/synonym";
import { calculateScores } from "../utils/scoring";
import { calculateConfidence } from "../utils/confidence";
import { getBestQuestion } from "../utils/questionEngine";
import { generateExplanation } from "../utils/explanation";

// PERBAIKAN 1: Tambahkan chatMessages ke daftar parameter input hook
export function useInference(submittedQuery, data, answers, chatMessages = []) {
  // Inisialisasi Fuse.js untuk pencarian teks dasar
  const fuse = useMemo(() => new Fuse(data.kbli, {
    keys: [
      { name: 'keyword', weight: 0.7 },
      { name: 'nama', weight: 0.2 },
      { name: 'uraian', weight: 0.1 }
    ],
    threshold: 0.3, // Dilonggarkan agar kata pendek (2-3 huruf) tetap terjaring
    ignoreLocation: true,
    useExtendedSearch: true,
    includeScore: true,
  }), [data.kbli]);

  // Ekstraksi kata dasar beserta perluasan sinonimnya
  const expandedTerms = useMemo(() => {
    const cleaned = cleanQuery(submittedQuery);
    return expandQuery(cleaned, data.synonyms);
  }, [submittedQuery, data.synonyms]);

  const inference = useMemo(() => {
    if (!submittedQuery || expandedTerms.length === 0) return {};

    const aggregateResults = {};
    const cleanTokens = cleanQuery(submittedQuery).toLowerCase().split(/\s+/).filter(t => t.length > 0);

    // =======================================================================
    // TAHAP 1: PENCARIAN FUSE DENGAN INJEKSI OVERRIDE KATA PENDEK & TAGS
    // =======================================================================
    expandedTerms.forEach((term) => {
      const word = term.word.toLowerCase().trim();
      if (!word) return;

      const isShortWord = word.length <= 2;
      const isSpecialKeyword = word === "es" || word === "teh" || word === "cat" || word === "gas";
      
      if (isShortWord && !isSpecialKeyword) return;
      
      const results = fuse.search(word);
      results.forEach((res) => {
        const id = res.item.kode;
        
        let customFuseScore = res.score;
        let finalTermWeight = term.weight;

        if (isShortWord && !isSpecialKeyword) {
          finalTermWeight = term.weight * 0.4; 
        }

        if (res.item.keyword && res.item.keyword.toLowerCase().includes(word)) {
          customFuseScore = res.score * 0.1; 
        }

        const weightedFuseScore = customFuseScore / finalTermWeight;

        if (!aggregateResults[id]) {
          aggregateResults[id] = { ...res, combinedScore: weightedFuseScore };
        } else {
          aggregateResults[id].combinedScore = Math.min(aggregateResults[id].combinedScore, weightedFuseScore);
        }
      });
    });

    const sortedResults = Object.values(aggregateResults).sort((a, b) => a.combinedScore - b.combinedScore);
    if (sortedResults.length === 0) return { finalResults: [] };

    let candidates = sortedResults.slice(0, 40).map(res => {
      let baseTextScore = Math.min(100, Math.max(0, (1 - res.combinedScore) * 100));
      
      // =======================================================================
      // TAHAP 2: MULTI-WORD KEYWORD BOOST
      // =======================================================================
      if (res.item.keyword) {
        const targetKeywordLower = res.item.keyword.toLowerCase();
        let matchedWordsCount = 0;
        
        cleanTokens.forEach(token => {
          const tokenRegex = new RegExp(`\\b${token}\\b`, 'i');
          if (tokenRegex.test(targetKeywordLower)) {
            matchedWordsCount++;
          }
        });

        if (matchedWordsCount >= 2) {
          const dynamicBoost = 85 + (matchedWordsCount * 5);
          baseTextScore = Math.max(baseTextScore, Math.min(100, dynamicBoost));
          
          if (cleanTokens.includes("es") && cleanTokens.includes("batu")) {
            console.log(`🎯 [KEYWORD HIT] KBLI: ${res.item.kode} | Relevansi: ${matchedWordsCount} Kata Pas | Skor Dasar Di-Boost: ${baseTextScore}`);
          }
        }
      }

      return {
        ...res.item,
        textScore: baseTextScore
      };
    });

    // =======================================================================
    // TAHAP 3: TAMBAHAN BONUS PENULISAN FORMAL
    // =======================================================================
    const baseResults = candidates.map((c) => {
      let exactBonus = 0;

      expandedTerms.forEach(term => {
        if (!term.word.trim()) return;
        const wordRegex = new RegExp(`\\b${term.word}\\b`, 'i');
        let wordBonus = 0;

        if (c.keyword && wordRegex.test(c.keyword.toLowerCase())) wordBonus += (30 * term.weight); 
        if (c.nama && wordRegex.test(c.nama.toLowerCase())) wordBonus += (15 * term.weight); 
        if (c.uraian && c.uraian.toLowerCase().includes(term.word.toLowerCase())) wordBonus += (5 * term.weight);

        exactBonus += wordBonus;
      });

      if (cleanTokens.length >= 2) {
        for (let len = 2; len <= Math.min(3, cleanTokens.length); len++) {
          for (let i = 0; i <= cleanTokens.length - len; i++) {
            const phrase = cleanTokens.slice(i, i + len).join(" ");
            const phraseRegex = new RegExp(`\\b${phrase}\\b`, 'i');

            if (c.keyword && phraseRegex.test(c.keyword.toLowerCase())) {
              exactBonus += (40 * len); 
            } else if (c.nama && phraseRegex.test(c.nama.toLowerCase())) {
              exactBonus += (25 * len);
            }
          }
        }
      }

      return { ...c, finalScore: c.textScore + exactBonus };
    });

    // =======================================================================
    // TAHAP 4: INTEGRASI ATURAN POHON KEPUTUSAN
    // =======================================================================
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
      dimensions: data.dimensions,
      chatMessages: chatMessages // Aman digunakan sekarang
    });

    return {
      topResult: top,
      finalResults: sortedFinal,
      confidence: conf,
      explanations: generateExplanation({ topResult: top, answers, rules: data.rules }),
      currentQuestion: question
    };
    // PERBAIKAN 2: Masukkan chatMessages ke dalam dependency array useMemo
  }, [submittedQuery, expandedTerms, fuse, data, answers, chatMessages]);

  return inference;
}