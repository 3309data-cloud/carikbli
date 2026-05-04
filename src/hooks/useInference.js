import { useMemo } from "react";
import Fuse from "fuse.js";
import { cleanQuery } from "../utils/textProcessor";
import { expandQuery } from "../utils/synonym";
import { calculateScores } from "../utils/scoring";
import { calculateConfidence } from "../utils/confidence";
import { getBestQuestion } from "../utils/questionEngine";
import { generateExplanation } from "../utils/explanation";

export function useInference(submittedQuery, data, answers) {
  // Inisialisasi Fuse.js untuk pencarian teks dasar
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

  // Perubahan: expandedTerms sekarang adalah Array [{word, weight}]
  const expandedTerms = useMemo(() => {
    const cleaned = cleanQuery(submittedQuery);
    return expandQuery(cleaned, data.synonyms);
  }, [submittedQuery, data.synonyms]);

  const inference = useMemo(() => {
    console.log("🔍 [DEBUG] Inisialisasi Inference. Query:", submittedQuery);
    console.log("🔍 [DEBUG] Expanded Terms:", expandedTerms);

    if (!submittedQuery || expandedTerms.length === 0) {
      console.warn("⚠️ [DEBUG] Keluar awal: Query atau Expanded Terms kosong.");
      return {};
    }
    if (!submittedQuery || expandedTerms.length === 0) return {};

    const aggregateResults = {};

    // 1. Pencarian menggunakan Fuse untuk setiap term yang diperluas
    expandedTerms.forEach((term) => {
      if (term.word.length <= 2) return;
      
      const results = fuse.search(term.word);
      results.forEach((res) => {
        const id = res.item.kode;
        // Penyesuaian skor Fuse berdasarkan bobot sinonim
        // Semakin kecil score Fuse, semakin baik. Jadi kita bagi dengan weight.
        const weightedFuseScore = res.score / term.weight;

        if (!aggregateResults[id]) {
          aggregateResults[id] = { ...res, combinedScore: weightedFuseScore };
        } else {
          // Ambil skor terbaik (terkecil)
          aggregateResults[id].combinedScore = Math.min(aggregateResults[id].combinedScore, weightedFuseScore);
        }
      });
    });

    const sortedResults = Object.values(aggregateResults).sort((a, b) => a.combinedScore - b.combinedScore);
    if (sortedResults.length === 0) return { finalResults: [] };

    // 2. Ambil 30 kandidat teratas untuk perhitungan skor mendalam
    let candidates = sortedResults.slice(0, 30).map(res => ({
      ...res.item,
      textScore: Math.min(100, Math.max(0, (1 - res.combinedScore) * 100))
    }));

    // 3. Perhitungan Exact Bonus dengan mempertimbangkan Bobot Sinonim
    const baseResults = candidates.map((c) => {
      let exactBonus = 0;

      expandedTerms.forEach(term => {
        const wordRegex = new RegExp(`\\b${term.word}\\b`, 'i');
        let wordBonus = 0;
        let matchCount = 0;

        // Bonus dikalikan dengan term.weight
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

        // Bonus kombinasi (jika kata muncul di lebih dari satu kolom)
        if (matchCount >= 2) wordBonus += (10 * term.weight);

        exactBonus += wordBonus;
      });

      // Bonus Frasa (Hanya untuk kata-kata asli/bobot tinggi)
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

    // 4. Integrasi dengan skor dimensi (Rules/Answers)
    const scoredResults = calculateScores(baseResults, data.rules, answers);
    const sortedFinal = [...scoredResults].sort((a, b) => b.finalScore - a.finalScore);
    
    // 5. Kalkulasi Confidence dan Pertanyaan Berikutnya
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
  }, [submittedQuery, expandedTerms, fuse, data, answers]);

  return inference;
}