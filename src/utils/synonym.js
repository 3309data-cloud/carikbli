/**
 * Memperluas query dengan sinonim berbobot dari format JSON.
 * Mengembalikan array: [{ word: string, weight: number }]
 */
export function expandQuery(query, synonymsData) {
  if (!query) return [];
  
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  
  // 1. Masukkan kata asli sebagai prioritas tertinggi (Bobot 1.5 atau 2.0)
  // Ini memastikan kata yang diketik user selalu menang telak dalam skor.
  const expandedTerms = [{ word: trimmedQuery, weight: 1 }];
  
  if (!synonymsData || synonymsData.length === 0) return expandedTerms;

  const addedWords = new Set([lowerQuery]);
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
        // 2. Parsing kolom synonym (asumsi format: '[{"word":"x", "weight":0.8}]')
        const synList = typeof item.synonym === 'string' 
          ? JSON.parse(item.synonym) 
          : item.synonym;

        if (Array.isArray(synList)) {
          synList.forEach(synObj => {
            const lowerSynWord = synObj.word.toLowerCase();
            
            // Hindari duplikasi kata dalam pencarian
            if (!addedWords.has(lowerSynWord)) {
              addedWords.add(lowerSynWord);
              expandedTerms.push({
                word: synObj.word,
                weight: parseFloat(synObj.weight) || 0.5 // Default bobot jika tidak ada
              });
            }
          });
        }
      } catch (e) {
        console.error("Gagal parse JSON sinonim untuk keyword:", item.keyword, e);
      }
    }
  }

  return expandedTerms;
}