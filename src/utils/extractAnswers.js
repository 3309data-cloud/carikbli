export function extractAnswers(query, dimensionKeywords) {
  const answers = {};
  
  // Guard clause
  if (!query || !dimensionKeywords || dimensionKeywords.length === 0) {
    return answers;
  }

  // OPTIMASI 1: Helper untuk mengamankan karakter spesial dalam Regex
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // OPTIMASI 2: Urutkan keyword dari yang PALING PANJANG ke yang paling pendek.
  // Ini mencegah kata "grosir" membatalkan hasil dari "bukan grosir"
  const sortedKeywords = [...dimensionKeywords].sort((a, b) => {
    const lenA = a.keyword ? a.keyword.length : 0;
    const lenB = b.keyword ? b.keyword.length : 0;
    return lenB - lenA; // Descending (terpanjang di atas)
  });

  const lowerQuery = query.toLowerCase();

  for (const item of sortedKeywords) {
    // Abaikan jika ada data kotor/kosong dari database
    if (!item.keyword || item.keyword.trim() === "") continue;

    const keyword = item.keyword.toLowerCase().trim();

    // OPTIMASI 3: Gunakan Word Boundary (\b)
    // Arti \b: Memastikan kata berdiri sendiri, tidak menempel pada huruf lain.
    // Jadi "ban" tidak akan cocok dengan "bangunan".
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');

    if (regex.test(lowerQuery)) {
      // OPTIMASI 4: Kunci Jawaban Pertama (First-Come, First-Serve)
      // Karena kita sudah mengurutkan dari yang terpanjang, jika dimensi
      // ini sudah terisi, jangan biarkan keyword yang lebih pendek menimpanya.
      if (answers[item.dimension] === undefined) {
        answers[item.dimension] = item.value;
      }
    }
  }

  return answers;
}