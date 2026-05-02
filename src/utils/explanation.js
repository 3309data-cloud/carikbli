export function generateExplanation({ topResult, answers, rules }) {
  // Guard clause: Cegah error jika parameter tidak lengkap
  if (!topResult || !rules || !answers) {
    return [];
  }

  // OPTIMASI 1: Gunakan Set() alih-alih Array []
  // Set secara otomatis akan menolak nilai yang sama persis (mencegah duplikasi UI)
  const explanationSet = new Set();
  
  // Cache kode target agar tidak perlu di-String() berulang-ulang di dalam loop
  const targetKode = String(topResult.kode);

  for (const rule of rules) {
    // 1. Hanya proses rule untuk KBLI yang sedang memimpin
    if (String(rule.kode) === targetKode) {
      
      const userAnswer = answers[rule.dimension];
      
      // 2. Pastikan dimensi ini memang sudah dijawab oleh user
      // 3. Pastikan jawaban user COCOK dengan syarat rule
      if (userAnswer !== undefined && userAnswer === rule.answer) {
        
        // OPTIMASI 2: Validasi Data Kosong (Falsy Check)
        // Pastikan kolom explanation di Supabase benar-benar ada isinya
        if (rule.explanation && rule.explanation.trim() !== "") {
          explanationSet.add(rule.explanation.trim());
        }
      }
    }
  }

  // Ubah kembali Set menjadi Array agar bisa di-map() oleh React di App.jsx
  return Array.from(explanationSet);
}