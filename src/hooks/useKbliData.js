import { useState, useEffect, useCallback } from "react";
import { getAppData, supabase } from "../services/api";
import { db } from "../db";

export function useKbliData() {
  const [data, setData] = useState({
    kbli: [], questions: [], options: [], rules: [],
    synonyms: [], dimensions: [], dimensionKeywords: [], settings: {}
  });
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. LOGIKA SINKRONISASI LOG (DI PERTAHANKAN) ---
  const saveToOfflineQueue = useCallback((table, payload) => {
    const queueKey = `offline_${table}_queue`;
    const currentQueue = JSON.parse(localStorage.getItem(queueKey) || "[]");
    currentQueue.push(payload);
    localStorage.setItem(queueKey, JSON.stringify(currentQueue));
  }, []);

  const syncOfflineLogs = useCallback(async () => {
    if (!navigator.onLine) return;
    const tables = ['feedback_logs', 'training_logs'];
    for (const table of tables) {
      const queueKey = `offline_${table}_queue`;
      const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");
      if (queue.length > 0) {
        try {
          const { error } = await supabase.from(table).insert(queue);
          if (!error) {
            localStorage.removeItem(queueKey);
            console.log(`[SYNC] Berhasil upload antrean ${table}`);
          }
        } catch (err) {
          console.error(`[SYNC] Error upload ${table}:`, err);
        }
      }
    }
  }, []);

  const uploadLog = async (table, payload) => {
    try {
      if (navigator.onLine) {
        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;
        return { success: true, status: 'online' };
      } else {
        saveToOfflineQueue(table, payload);
        return { success: true, status: 'offline' };
      }
    } catch (err) {
      console.error(`[UPLOAD ERROR] ${table}:`, err);
      saveToOfflineQueue(table, payload);
      return { success: true, status: 'queued' };
    }
  };

  // --- 2. INITIAL LOAD DENGAN VERSI GLOBAL (OFFLINE-FIRST) ---
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const isOnline = navigator.onLine;

        // Cek versi lokal vs remote
        const localVersionDoc = await db.metadata.get('db_version');
        const localVersion = localVersionDoc ? localVersionDoc.value : null;

        if (isOnline) {
          try {
            const { data: remoteMeta, error } = await supabase
              .from('app_metadata')
              .select('value')
              .eq('key', 'db_version')
              .single();

            if (!error && remoteMeta && localVersion !== remoteMeta.value) {
              console.log(`🔄 Update terdeteksi: ${localVersion} -> ${remoteMeta.value}`);
              const appData = await getAppData();

              // Transaksi Atomik untuk update semua tabel
              await db.transaction('rw', [db.kbli, db.questions, db.options, db.rules, db.synonyms, db.dimensions, db.settings, db.metadata], async () => {
                await Promise.all([
                  db.kbli.clear(), db.questions.clear(), db.options.clear(), 
                  db.rules.clear(), db.synonyms.clear(), db.dimensions.clear(), 
                  db.settings.clear()
                ]);

                await Promise.all([
                  db.kbli.bulkPut(appData.kbli),
                  db.questions.bulkPut(appData.questions),
                  db.options.bulkPut(appData.options),
                  db.rules.bulkPut(appData.rules),
                  db.synonyms.bulkPut(appData.synonyms),
                  db.dimensions.bulkPut(appData.dimensions)
                ]);

                const settingsArray = Object.entries(appData.settings).map(([k, v]) => ({ key: k, value: v }));
                await db.settings.bulkPut(settingsArray);
                await db.metadata.put({ id: 'db_version', value: remoteMeta.value });
              });
            }
          } catch (vErr) {
            console.warn("Gagal cek versi, menggunakan data lokal.", vErr);
          }
        }

        // Ambil data dari IndexedDB (Lokal)
        const [lKbli, lQuestions, lOptions, lRules, lSynonyms, lDimensions, lSettings] = await Promise.all([
          db.kbli.toArray(), db.questions.toArray(), db.options.toArray(),
          db.rules.toArray(), db.synonyms.toArray(), db.dimensions.toArray(),
          db.settings.toArray()
        ]);

        // Rekonstruksi dimensionKeywords
        const dimensionKeywords = lOptions.map(opt => ({
          keyword: opt.label,
          dimension_id: lQuestions.find(q => q.id === opt.question_id)?.dimension_id,
          value: opt.value
        })).filter(item => item.dimension_id);

        const settingsMap = {};
        lSettings.forEach(s => { settingsMap[s.key] = s.value; });

        setData({
          kbli: lKbli,
          questions: lQuestions,
          options: lOptions,
          rules: lRules,
          synonyms: lSynonyms,
          dimensions: lDimensions,
          dimensionKeywords: dimensionKeywords,
          settings: settingsMap
        });

      } catch (error) {
        console.error("❌ [INIT] Gagal memuat data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Jalankan sync antrean saat aplikasi dibuka
    syncOfflineLogs();

    window.addEventListener('online', syncOfflineLogs);
    return () => window.removeEventListener('online', syncOfflineLogs);
  }, [syncOfflineLogs]);

  return { data, isLoading, saveToOfflineQueue, syncOfflineLogs, uploadLog };
}