// src/db.js
import Dexie from 'dexie';

export const db = new Dexie('KbliDatabase');
db.version(1).stores({
  kbli: '++id, kode, nama, keyword',
  dimensions: '++id, id',
  questions: '++id, id, dimension_id',
  options: '++id, id, question_id',
  rules: '++id, id',
  synonyms: '++id, kata_asli',
  settings: 'key',
  metadata: 'id' // Tempat menyimpan db_version lokal
});