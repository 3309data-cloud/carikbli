export function getAnswerOptionsForDimension({
  dimension,
  candidates,
  candidateDimsMap,
  optionsTable // tabel options dari DB
}) {
  const uniqueAnswers = new Set();

  // ambil semua jawaban dari rules kandidat aktif
  for (const cand of candidates) {
    const kode = String(cand.kode);
    const rules = candidateDimsMap[kode] || [];

    rules
      .filter(r => r.dimension === dimension)
      .forEach(r => {
        const val = r.answer || r.value;
        if (val) uniqueAnswers.add(val.toLowerCase());
      });
  }

  // mapping ke label dari tabel options
  const result = optionsTable
    .filter(opt =>
      uniqueAnswers.has(String(opt.value).toLowerCase())
    )
    .map(opt => ({
      value: opt.value,
      label: opt.label
    }));

  return result;
}