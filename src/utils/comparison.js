export function compareTopCandidates({ finalResults, kbliDimensions }) {
  if (!finalResults || finalResults.length < 2) {
    return null;
  }

  const first = finalResults[0];
  const second = finalResults[1];

  // OPTIMASI 1: Early Exit (Pencegahan Kerja Sia-sia)
  // Jika Kandidat 1 menang telak (selisih skor > 20), hentikan perbandingan.
  // Sistem sudah yakin, jadi tidak perlu memicu pertanyaan Tie-Breaker.
  if (first.finalScore - second.finalScore > 20) {
    return null;
  }

  // OPTIMASI 2: Single-Pass Filtering (O(N) bukan O(2N))
  // Kita siapkan dua 'keranjang'. Kita sapu tabel kbliDimensions SATU KALI saja,
  // lalu masukkan datanya ke keranjang masing-masing. Jauh lebih ringan!
  const firstDimensions = [];
  const secondDimensions = [];
  const firstKode = String(first.kode);
  const secondKode = String(second.kode);

  for (const d of kbliDimensions) {
    const dKode = String(d.kode);
    if (dKode === firstKode) {
      firstDimensions.push(d);
    } else if (dKode === secondKode) {
      secondDimensions.push(d);
    }
  }

  // OPTIMASI 3: Hash Map Lookup (Pencarian Instan O(1))
  // Ubah array dimensi Kandidat 2 menjadi bentuk Object Key-Value.
  // Ini menghindari penggunaan .find() di dalam loop yang memakan banyak memori.
  const secondDimMap = {};
  for (const sd of secondDimensions) {
    secondDimMap[sd.dimension] = sd.value;
  }

  const differences = [];

  // Sekarang kita tinggal bandingkan Kandidat 1 dengan Hash Map Kandidat 2
  for (const fd of firstDimensions) {
    const secondValue = secondDimMap[fd.dimension];

    // Jika Kandidat 2 juga punya dimensi ini, DAN nilainya berbeda
    if (secondValue !== undefined && secondValue !== fd.value) {
      differences.push({
        dimension: fd.dimension,
        firstValue: fd.value,
        secondValue: secondValue
      });
    }
  }

  return {
    first,
    second,
    differences
  };
}