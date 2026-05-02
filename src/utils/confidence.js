export function calculateConfidence(results) {
  if (!results || results.length < 2) return 100;

  const diff = Math.abs(results[0].finalScore - results[1].finalScore);

  // Jika selisih tipis (di bawah 10), paksa confidence sangat rendah
  if (diff < 10) return 15; 
  if (diff < 20) return 40;
  
  return Math.min(100, diff * 2);
}