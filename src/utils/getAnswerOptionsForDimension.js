export function getAnswerOptionsForDimension({
  dimension,
  candidates,
  candidateDimsMap,
  optionsTable 
}) {
  const uniqueAnswers = new Set();

  for (const cand of candidates) {
    const kode = String(cand.kode);
    const rules = candidateDimsMap[kode] || [];

    rules
      .filter(r => r.dimension === dimension)
      .forEach(r => {
        const val = r.answer || r.value;
        if (val) uniqueAnswers.add(String(val).toLowerCase()); // Tambahan String() agar lebih aman
      });
  }

  const result = optionsTable
    .filter(opt =>
      // --- PERBAIKAN: Pastikan opsi ini milik dimensi yang sedang diproses ---
      // Sesuaikan 'opt.dimension' dengan nama kolom yang ada di database Anda
      // (Bisa juga opt.question_id jika relasinya menggunakan ID)
      opt.dimension === dimension && 
      uniqueAnswers.has(String(opt.value).toLowerCase())
    )
    .map(opt => ({
      value: opt.value,
      label: opt.label
    }));

  return result;
}