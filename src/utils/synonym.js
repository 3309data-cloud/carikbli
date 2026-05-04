/**
 * Memperluas query dengan sinonim berbobot dari format JSON.
 * Sekarang mendukung tokenisasi untuk pencarian per kata.
 */
export function expandQuery(query, synonymsData) {
  if (!query) return [];
  
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  
  // 1. TOKENISASI: Pecah kalimat menjadi kata individu
  // Menghapus kata hubung pendek (di, ke, dll) agar pencarian lebih fokus
  const tokens = lowerQuery.split(/\s+/).filter(t => t.length > 2);
  
  // Jika hasil tokenisasi kosong (misal hanya input "di"), gunakan query asli
  const baseWords = tokens.length > 0 ? tokens : [lowerQuery];

  // 2. Masukkan setiap kata asli sebagai prioritas (Weight 1)
  const expandedTerms = baseWords.map(word => ({ word, weight: 1 }));
  
  // Gunakan Set untuk melacak kata yang sudah ditambahkan agar tidak duplikat
  const addedWords = new Set(baseWords);

  if (!synonymsData || synonymsData.length === 0) return expandedTerms;

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const item of synonymsData) {
    if (!item.keyword || !item.synonym) continue;

    const keywordArray = item.keyword
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    // Cek kecocokan: apakah ada token user yang cocok dengan keyword sinonim
    const isMatch = keywordArray.some(kw => {
      const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      // Cek terhadap lowerQuery utuh agar konteks frase tetap terjaga
      return regex.test(lowerQuery);
    });

    if (isMatch) {
      try {
        const synList = typeof item.synonym === 'string' 
          ? JSON.parse(item.synonym) 
          : item.synonym;

        if (Array.isArray(synList)) {
          synList.forEach(synObj => {
            const lowerSynWord = synObj.word.toLowerCase();
            
            if (!addedWords.has(lowerSynWord)) {
              addedWords.add(lowerSynWord);
              expandedTerms.push({
                word: synObj.word,
                weight: parseFloat(synObj.weight) || 0.5
              });
            }
          });
        }
      } catch (e) {
        console.error("Gagal parse JSON sinonim:", item.keyword, e);
      }
    }
  }

  return expandedTerms;
}