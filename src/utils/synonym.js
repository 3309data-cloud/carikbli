export function expandQuery(query, synonyms) {
  if (!query || !synonyms || synonyms.length === 0) {
    return query || "";
  }

  let finalQuery = query.trim();
  const lowerQuery = finalQuery.toLowerCase();
  const addedSynonyms = new Set();
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const item of synonyms) {
    if (!item.keyword || !item.synonym) continue;

    // --- PERUBAHAN UTAMA: Memecah Keyword Koma ---
    // Ubah "semangka, blewah, melon" menjadi array: ["semangka", "blewah", "melon"]
    const keywordArray = item.keyword
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    let isMatchFound = false;

    // Cek setiap kata di dalam array keyword tersebut
    for (const kw of keywordArray) {
      const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
      if (regex.test(lowerQuery)) {
        isMatchFound = true;
        break; // Hentikan loop jika SATU saja kata sudah cocok (biar efisien)
      }
    }

    // Jika salah satu dari keyword koma tersebut ada yang cocok
    if (isMatchFound) {
      const cleanSynonymText = item.synonym
        .replace(/[,./?#!$%^&*;:{}=\-_`~()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const synonymWords = cleanSynonymText.split(" ");
      const newSynonymsToAppend = [];

      synonymWords.forEach(synWord => {
        const lowerSynWord = synWord.toLowerCase();
        
        // Pastikan kata sinonim belum ada di query asli atau belum pernah ditambahkan
        if (!addedSynonyms.has(lowerSynWord) && !lowerQuery.includes(lowerSynWord)) {
          addedSynonyms.add(lowerSynWord);
          newSynonymsToAppend.push(synWord);
        }
      });

      if (newSynonymsToAppend.length > 0) {
        finalQuery += ` ${newSynonymsToAppend.join(" ")}`;
      }
    }
  }

  return finalQuery;
}