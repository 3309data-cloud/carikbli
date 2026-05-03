export function extractAnswers(query, dimensionKeywords) {
  const answers = {};
  
  if (!query || !dimensionKeywords || dimensionKeywords.length === 0) {
    return answers;
  }

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const sortedKeywords = [...dimensionKeywords].sort((a, b) => {
    const lenA = a.keyword ? a.keyword.length : 0;
    const lenB = b.keyword ? b.keyword.length : 0;
    return lenB - lenA; 
  });

  // Tambahan: Bersihkan query dari tanda baca agar \b bekerja maksimal
  const cleanQuery = query.toLowerCase().replace(/[,./?#!$%^&*;:{}=\-_`~()]/g, " ");

  for (const item of sortedKeywords) {
    if (!item.keyword || item.keyword.trim() === "") continue;

    const keyword = item.keyword.toLowerCase().trim();
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');

    if (regex.test(cleanQuery)) {
      // First-come first-serve (karena sudah disort terpanjang)
      if (answers[item.dimension] === undefined) {
        answers[item.dimension] = item.value;
      }
    }
  }

  return answers;
}