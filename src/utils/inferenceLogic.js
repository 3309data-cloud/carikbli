import Fuse from "fuse.js";
import { cleanQuery } from "./textProcessor";
import { expandQuery } from "./synonym";
import { calculateScores } from "./scoring";
import { calculateConfidence } from "./confidence";

/**
 * Fungsi Inti Inferensi (Pure Function)
 * Digunakan bersama oleh useInference.js (App) dan AdminQualityTest.jsx (Test)
 */
export function performInferenceManual(submittedQuery, data, answers = {}) {
  if (!submittedQuery || !data || !data.kbli) {
    return { topResult: null, finalResults: [], confidence: 0 };
  }

  // 1. Inisialisasi Fuse.js (Identik dengan App)
  const fuse = new Fuse(data.kbli, {
    keys: [
      { name: 'keyword', weight: 0.7 },
      { name: 'nama', weight: 0.2 },
      { name: 'uraian', weight: 0.1 }
    ],
    threshold: 0.25,
    ignoreLocation: true,
    useExtendedSearch: true,
    includeScore: true,
  });

  // 2. Pembersihan & Perluasan Sinonim
  const cleaned = cleanQuery(submittedQuery);
  const expandedTerms = expandQuery(cleaned, data.synonyms || []);

  if (expandedTerms.length === 0) return { topResult: null, finalResults: [], confidence: 0 };

  const aggregateResults = {};

  // 3. Pencarian Fuse per Term
  expandedTerms.forEach((term) => {
    if (term.word.length <= 2) return;
    
    const results = fuse.search(term.word);
    results.forEach((res) => {
      const id = res.item.kode;
      const weightedFuseScore = res.score / term.weight;

      if (!aggregateResults[id]) {
        aggregateResults[id] = { ...res, combinedScore: weightedFuseScore };
      } else {
        aggregateResults[id].combinedScore = Math.min(aggregateResults[id].combinedScore, weightedFuseScore);
      }
    });
  });

  const sortedResults = Object.values(aggregateResults).sort((a, b) => a.combinedScore - b.combinedScore);
  if (sortedResults.length === 0) return { finalResults: [], topResult: null, confidence: 0 };

  // 4. Ambil 30 kandidat & Hitung Text Score
  let candidates = sortedResults.slice(0, 30).map(res => ({
    ...res.item,
    textScore: Math.min(100, Math.max(0, (1 - res.combinedScore) * 100))
  }));

  // 5. Perhitungan Exact Bonus & Frasa
  const baseResults = candidates.map((c) => {
    let exactBonus = 0;

    expandedTerms.forEach(term => {
      const wordRegex = new RegExp(`\\b${term.word}\\b`, 'i');
      let wordBonus = 0;
      let matchCount = 0;

      if (c.keyword && wordRegex.test(c.keyword.toLowerCase())) { 
        wordBonus += (25 * term.weight); 
        matchCount++; 
      }
      if (c.nama && wordRegex.test(c.nama.toLowerCase())) { 
        wordBonus += (15 * term.weight); 
        matchCount++; 
      }
      if (c.uraian && c.uraian.toLowerCase().includes(term.word.toLowerCase())) { 
        wordBonus += (5 * term.weight); 
        matchCount++; 
      }

      if (matchCount >= 2) wordBonus += (10 * term.weight);
      exactBonus += wordBonus;
    });

    // Bonus Frasa
    const primaryTerms = expandedTerms.filter(t => t.weight >= 1.0).map(t => t.word);
    if (primaryTerms.length >= 2) {
      for (let i = 0; i < primaryTerms.length - 1; i++) {
        const phrase = `${primaryTerms[i]} ${primaryTerms[i + 1]}`;
        const phraseRegex = new RegExp(`\\b${phrase}\\b`, 'i');
        if (c.nama && phraseRegex.test(c.nama.toLowerCase())) exactBonus += 40;
        else if (c.keyword && phraseRegex.test(c.keyword.toLowerCase())) exactBonus += 60;
      }
    }

    return { ...c, finalScore: c.textScore + exactBonus };
  });

  // 6. Integrasi Skor Dimensi (Rules)
  const scoredResults = calculateScores(baseResults, data.rules || [], answers);
  const sortedFinal = [...scoredResults].sort((a, b) => b.finalScore - a.finalScore);
  
  // 7. Kalkulasi Confidence
  const conf = calculateConfidence(sortedFinal);

  return {
    topResult: sortedFinal[0] || null,
    finalResults: sortedFinal,
    confidence: conf
  };
}