/**
 * Menghitung skor akhir kandidat KBLI dengan logging asal-usul skor yang detail.
 */
export function calculateScores(results, rules, answers) {
  if (!results || results.length === 0) return [];

  // 1. Indexing Rules (O(n))
  const rulesByKode = {};
  if (rules) {
    rules.forEach(rule => {
      const kode = String(rule.kode);
      if (!rulesByKode[kode]) rulesByKode[kode] = [];
      rulesByKode[kode].push(rule);
    });
  }

  console.log("--- 🧮 STARTING KBLI SCORING ENGINE ---");

  const scoredResults = results.map(item => {
    const targetKode = String(item.kode);
    const prefix2 = targetKode.substring(0, 2);
    
    // DETAIL SKOR AWAL
    // Kita asumsikan 'item' membawa informasi tambahan seperti scoreText atau scoreSemantic
    let currentScore = item.finalScore || 0;
    
    console.group(`📊 Analisis KBLI: ${targetKode} - ${item.nama?.substring(0, 40)}...`);
    
    // --- LOG DETAIL SKOR AWAL ---
    console.log(`📍 RINCIAN SKOR AWAL:`);
    if (item.scoreText || item.scoreSemantic) {
        console.log(`   - Text Match Score     : ${(item.scoreText || 0).toFixed(2)}`);
        console.log(`   - Semantic/AI Score    : ${(item.scoreSemantic || 0).toFixed(2)}`);
        console.log(`   - Total Base Score     : ${currentScore.toFixed(2)}`);
    } else {
        console.log(`   - Base Score (Default) : ${currentScore.toFixed(2)}`);
    }
    console.log(`-------------------------------------------`);

    // 2. Ambil Aturan Relevan
    const itemRules = [
      ...(rulesByKode[prefix2] || []),
      ...(rulesByKode[targetKode] || [])
    ];

    // 3. Kelompokkan Aturan per Dimensi
    const rulesByDimension = {};
    itemRules.forEach(r => {
      if (!rulesByDimension[r.dimension]) rulesByDimension[r.dimension] = [];
      rulesByDimension[r.dimension].push(r);
    });

    // 4. Proses Perhitungan per Dimensi
    Object.entries(rulesByDimension).forEach(([dimName, dimRules]) => {
      const userAnswer = answers[dimName];
      if (userAnswer === undefined) return;

      const baseBonus = Number(dimRules[0]?.score || 20);
      const penalty = baseBonus; 

      const matchingRule = dimRules.find(r => 
        String(r.answer || r.value).toLowerCase() === String(userAnswer).toLowerCase()
      );

      if (matchingRule) {
        currentScore += baseBonus;
        console.log(`✅ MATCH [${dimName}] -> +${baseBonus}`);
        console.log(`   (User: "${userAnswer}" cocok dengan Rule)`);
      } else {
        currentScore -= penalty;
        console.log(`❌ MISMATCH [${dimName}] -> -${penalty}`);
        console.log(`   (User: "${userAnswer}" tidak cocok)`);
      }
    });

    console.log(`🏁 SKOR AKHIR: ${currentScore.toFixed(2)}`);
    console.groupEnd();

    return { 
      ...item, 
      finalScore: currentScore,
      isReEvaluated: true 
    };
  });

  return scoredResults.sort((a, b) => b.finalScore - a.finalScore);
}