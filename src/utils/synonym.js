// utils/synonym.js

export function expandQuery(query, synonymsData) {
  if (!query) return [];
  
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  
  // 1. Masukkan kata/kalimat asli sebagai prioritas tertinggi
  const expandedTerms = [{ word: trimmedQuery, weight: 1 }];
  
  if (!synonymsData || synonymsData.length === 0) return expandedTerms;

  // PERBAIKAN 1: Jangan masukkan kalimat utuh ke Set. 
  // Pecah query asli menjadi kata-kata tunggal agar sistem tahu kata apa saja yang diketik user.
  const queryWords = lowerQuery.split(/\s+/);
  const addedWords = new Set([...queryWords, lowerQuery]); 
  // Sekarang Set berisi: {"membuat", "es", "batu", "membuat es batu"}

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const item of synonymsData) {
    if (!item.keyword || !item.synonym) continue;

    // Pecah keyword koma menjadi array
    const keywordArray = item.keyword
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    // Cek kecocokan menggunakan regex word boundary (\b)
    const isMatch = keywordArray.some(kw => {
      const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      return regex.test(lowerQuery);
    });

    if (isMatch) {
      try {
        const synList = typeof item.synonym === 'string' 
          ? JSON.parse(item.synonym) 
          : item.synonym;

        if (Array.isArray(synList)) {
          synList.forEach(synObj => {
            if (!synObj.word) return;
            const lowerSynWord = synObj.word.toLowerCase().trim();
            
            // PERBAIKAN 2: Jika kata sinonim belum pernah ada, masukkan secara aman
            if (!addedWords.has(lowerSynWord)) {
              addedWords.add(lowerSynWord);
              expandedTerms.push({
                word: synObj.word.trim(),
                weight: parseFloat(synObj.weight) || 0.5
              });
            }
          });
        }
      } catch (e) {
        console.error("Gagal parse JSON sinonim untuk keyword:", item.keyword, e);
      }
    }
  }

  // PERBAIKAN 3: Pastikan kata asli individual ("es", "batu") yang lolos cleanQuery 
  // tetap dipaksa masuk ke array hasil jika belum ada, agar tidak hilang di scoring.
  queryWords.forEach(w => {
    if (w.length > 1 && !expandedTerms.some(t => t.word.toLowerCase() === w)) {
      expandedTerms.push({ word: w, weight: 1 });
    }
  });

  return expandedTerms;
}