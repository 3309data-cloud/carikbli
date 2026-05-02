export function expandQuery(query, synonyms) {
  // Guard clause: Jika query kosong atau tidak ada data sinonim
  if (!query || !synonyms || synonyms.length === 0) {
    return query || "";
  }

  let finalQuery = query.trim();
  const lowerQuery = finalQuery.toLowerCase();
  
  // OPTIMASI 1: Set untuk Mencegah Duplikasi
  // Kita tampung sinonim yang sudah ditambahkan agar tidak diulang-ulang
  const addedSynonyms = new Set();

  // Helper untuk mengamankan karakter spesial dalam Regex
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const item of synonyms) {
    // Validasi data kotor dari database Supabase
    if (!item.keyword || !item.synonym) continue;

    const keyword = item.keyword.toLowerCase().trim();
    const synonym = item.synonym.trim();

    // OPTIMASI 2: Word Boundary (\b)
    // Memastikan kecocokan kata utuh. "jas" tidak akan cocok dengan "jasa"
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');

    if (regex.test(lowerQuery)) {
      const lowerSynonym = synonym.toLowerCase();
      
      // OPTIMASI 3: Smart Append
      // Cek apakah sinonim ini belum pernah kita tambahkan, 
      // DAN pastikan sinonim ini belum ada di teks asli yang diketik user.
      // (Mencegah hasil: "jual gorengan jajanan jajanan")
      if (!addedSynonyms.has(lowerSynonym) && !lowerQuery.includes(lowerSynonym)) {
        addedSynonyms.add(lowerSynonym);
        finalQuery += ` ${synonym}`;
      }
    }
  }

  return finalQuery;
}