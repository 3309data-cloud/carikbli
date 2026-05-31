export function extractAnswers(query, flatKeywords) {
  const answers = {};
  
  if (!query || !flatKeywords || flatKeywords.length === 0) {
    return answers;
  }

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 1. NORMALISASI QUERY: Ubah tanda baca jadi spasi, lalu satukan spasi ganda menjadi 1 spasi saja
  const cleanQueryText = query
    .toLowerCase()
    .replace(/[,./?#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ") // Mengubah spasi ganda/banyak menjadi hanya satu spasi bersih
    .trim();

  const preparedKeywords = [];
  
  flatKeywords.forEach(item => {
    if (!item.keyword) return;
    
    // Pecah keyword koma
    const subKeywords = item.keyword.split(',');
    
    subKeywords.forEach(subKw => {
      // 2. NORMALISASI KEYWORD DB: Amankan dari spasi liar dan paksa huruf kecil
      const trimmedSub = subKw.trim().toLowerCase().replace(/\s+/g, " ");
      if (trimmedSub) {
        preparedKeywords.push({
          ...item,
          singleKeyword: trimmedSub
        });
      }
    });
  });

  // Urutkan dari sub-keyword karakter terpanjang
  preparedKeywords.sort((a, b) => b.singleKeyword.length - a.singleKeyword.length);

  // 3. PROSES PENCOCOKAN YANG LEBIH FLEKSIBEL
  for (const item of preparedKeywords) {
    // Menggunakan regex pintar yang toleran terhadap variasi spasi namun tetap menjaga keutuhan kata
    const safeKeyword = escapeRegExp(item.singleKeyword);
    const regex = new RegExp(`(?:^|\\s)${safeKeyword}(?:$|\\s)`, 'i');
    
    const isMatch = regex.test(cleanQueryText);

    // Filter khusus pelacak di konsol
    const lowerKeyword = item.singleKeyword.toLowerCase();
    if (lowerKeyword.includes("ruminansia") || lowerKeyword.includes("sapi")) {
      console.log(
        `🔎 [TRACKING KEYWORD DB] -> Kata DB: "${item.singleKeyword}" | ` +
        `Dimensi: "${item.dimension}" | Value: "${item.value}" | ` +
        `Apakah Match dengan Query? ${isMatch ? "✅ MATCH" : "❌ NO"}`
      );
    }

    if (isMatch) {
      if (answers[item.dimension] === undefined) {
        answers[item.dimension] = item.value;
        console.log(`🚀 [EXTRACT SUCCESS] -> Dimensi "${item.dimension}" otomatis terisi nilai: "${item.value}"`);
      }
    }
  }

  return answers;
}