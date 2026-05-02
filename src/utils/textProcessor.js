// utils/textProcessor.js

const STOP_WORDS = [
  "dan", "yang", "untuk", "di", "ke", "dari", "pada", "dalam", 
  "dengan", "sebagai", "adalah", "itu", "ini", "saya", "mau", 
  "cari", "toko", "jual", "usaha", "bisnis", "jasa", "perusahaan"
];

export const cleanQuery = (text) => {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // Hapus tanda baca
    .split(/\s+/)            // Pecah jadi kata-kata
    .filter(word => !STOP_WORDS.includes(word) && word.length > 1) // Hapus stop-words & kata 1 huruf
    .join(' ');              // Gabungkan kembali
};