export function getBestQuestion({
  finalResults,
  rules,
  questions,
  answers,
  dimensions
}) {
  // 1. PRE-VALIDATION & GAP ANALYSIS
  const candidates = finalResults.slice(0, 5);
  if (candidates.length < 2) return null;

  const scoreGap = candidates[0].finalScore - candidates[1].finalScore;
  if (scoreGap >= 40) {
    console.log("🛑 [ENGINE] Gap skor cukup lebar (>= 40). Menghentikan pertanyaan.");
    return null;
  }

  // 2. INITIALIZE PRIORITY & MAPPING
  const priorityMap = {};
  if (dimensions) {
    dimensions.forEach(d => priorityMap[d.dimension] = Number(d.priority || 0));
  }

  const candidateCodes = candidates.map(c => String(c.kode));
  const candidateDimsMap = {};
  candidateCodes.forEach(code => candidateDimsMap[code] = []);

  // Mapping rules ke kandidat (Support 2-digit & 5-digit)
  for (const rule of rules) {
    const ruleKode = String(rule.kode);
    for (const candKode of candidateCodes) {
      if (ruleKode === candKode || ruleKode === candKode.substring(0, 2)) {
        candidateDimsMap[candKode].push(rule);
      }
    }
  }

  // 3. STRICT FILTERING (Diambil dari Versi A)
  // Memastikan kita hanya memproses kandidat yang benar-benar masih relevan dengan jawaban user saat ini
  const filteredCandidates = candidates.filter(candidate => {
    const dims = candidateDimsMap[String(candidate.kode)];
    return Object.entries(answers).every(([dimName, ansValue]) => {
      const relatedDims = dims.filter(d => d.dimension === dimName);
      if (relatedDims.length === 0) return true; // Tidak ada rule = netral
      
      return relatedDims.some(d => 
        String(d.answer || d.value).toLowerCase() === String(ansValue).toLowerCase()
      );
    });
  });

  if (filteredCandidates.length < 2) {
    console.log("ℹ️ [ENGINE] Kandidat valid tersisa < 2 setelah filtering. Stop.");
    return null;
  }

  // 4. AMBIGUITY ANALYSIS (Variasi Nilai)
  const dimensionMap = {};
  const activeCodes = filteredCandidates.map(c => String(c.kode));

  // Cari dimensi yang belum dijawab tapi dimiliki oleh kandidat aktif
  const allRelevantDimensions = new Set();
  activeCodes.forEach(code => {
    candidateDimsMap[code].forEach(d => {
      if (answers[d.dimension] === undefined) allRelevantDimensions.add(d.dimension);
    });
  });

  for (const dimName of allRelevantDimensions) {
    dimensionMap[dimName] = new Set();
    activeCodes.forEach(code => {
      const rulesForDim = candidateDimsMap[code].filter(d => d.dimension === dimName);
      if (rulesForDim.length === 0) {
        dimensionMap[dimName].add("__NO_RULE__");
      } else {
        rulesForDim.forEach(r => dimensionMap[dimName].add(String(r.answer || r.value).toLowerCase()));
      }
    });
  }

  // 5. HEURISTIC SCORING (Diambil dari Versi B)
  // =========================
  // 5. HEURISTIC SCORING DENGAN LOG DETAIL
  // =========================
  let bestDimension = null;
  let bestScore = -1;

  console.log("\n📊 [ENGINE] PERHITUNGAN SKOR DIMENSI:");
  console.log("----------------------------------------------------------------------");
  console.log(" Dimension        | Variation | Priority | Formula        | Final Score");
  console.log("----------------------------------------------------------------------");

  Object.entries(dimensionMap).forEach(([dim, values]) => {
    const variation = values.size;
    
    // Skip jika tidak ada perbedaan (tidak berguna untuk bertanya)
    if (variation <= 1) {
      console.log(` ${dim.padEnd(16)} | ${String(variation).padEnd(9)} | -        | SKIP (No Diff) | -`);
      return;
    }

    const priority = priorityMap[dim] || 0;
    
    // Formula: Variasi * (Priority + 1)
    // +1 agar dimensi dengan priority 0 tetap memiliki nilai
    const dimScore = variation * (priority + 1);

    console.log(
      ` ${dim.padEnd(16)} | ` +
      `${String(variation).padEnd(9)} | ` +
      `${String(priority).padEnd(8)} | ` +
      `${variation} * (${priority} + 1)`.padEnd(14) + 
      ` | ${dimScore}`
    );

    if (dimScore > bestScore) {
      bestScore = dimScore;
      bestDimension = dim;
    }
  });

  console.log("----------------------------------------------------------------------");

  if (bestDimension) {
    console.log(`🏆 WINNER: [${bestDimension}] dengan Skor: ${bestScore}\n`);
  } else {
    console.warn("⚠️ [ENGINE] Tidak menemukan dimensi dengan variasi > 1.\n");
  }

  if (!bestDimension) return null;

  // 6. FINAL RETRIEVAL
  const q = questions.find(q => 
    String(q.dimension) === String(bestDimension) || String(q.id) === `q_${bestDimension}`
  );

  if (!q) {
    console.error(`❌ [ENGINE] Pertanyaan untuk dimensi "${bestDimension}" tidak ditemukan di database.`);
    return null;
  }

  return {
    id: q.id,
    question: q.question,
    text: q.question,
    dimension: bestDimension,
    //candidates: filteredCandidates,
  //candidateDimsMap
  };
}