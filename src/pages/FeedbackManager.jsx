import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/api";

export default function FeedbackManager() {
  // --- STATES ---
  const [feedbackList, setFeedbackList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        { data: fData, error: fError },
        { data: kData, error: kError }
      ] = await Promise.all([
        supabase
          .from('feedback_logs')
          .select('*')
          .eq('is_processed', false)
          .order('created_at', { ascending: false }),
        supabase.from('master_kbli').select('kode, nama, uraian')
      ]);

      if (fError) throw fError;
      if (kError) throw kError;

      // Perbaikan: Konversi kode ke String agar pencocokan akurat (misal kode "0111")
      const combined = (fData || []).map(f => ({
        ...f,
        master_kbli: kData?.find(k => String(k.kode) === String(f.wrong_kode)) || { 
          nama: "KBLI Tidak Ditemukan", 
          uraian: `Data master untuk kode ${f.wrong_kode} tidak tersedia di database.` 
        }
      }));

      setFeedbackList(combined);
    } catch (err) {
      console.error("❌ Detail Error:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Feedback Center</h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5">Sensus Ekonomi 2026 - Monitoring Ketidakakuratan</p>
          </div>
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">
            {feedbackList.length} Laporan Masuk
          </div>
        </header>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Hanya render table jika data ada dan tidak sedang loading */}
            {!isLoading && feedbackList.length > 0 && (
              <table className="w-full text-left table-fixed border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5 w-[25%]">Input & Waktu</th>
                    <th className="px-8 py-5 w-[35%]">Detail KBLI (Yang Salah)</th>
                    <th className="px-8 py-5 w-[40%]">Snapshot Jawaban</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feedbackList.map((item) => (
                    <tr key={item.id} className="transition-all hover:bg-slate-50/50 align-top">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-black text-slate-700 leading-snug italic break-words">"{item.query}"</p>
                          <span className="bg-slate-100 text-slate-400 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter border border-slate-200 inline-flex items-center gap-1.5 w-fit">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(item.created_at).toLocaleDateString('id-ID', { 
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase shrink-0">
                              KBLI {item.wrong_kode}
                            </span>
                            <span className="text-sm font-black text-slate-800 uppercase break-words">
                              {item.master_kbli?.nama}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 italic leading-relaxed break-words">
                            {item.master_kbli?.uraian}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[10px] font-mono text-amber-700 bg-amber-50 px-4 py-3 rounded-2xl border border-amber-100 italic shadow-inner break-all whitespace-pre-wrap leading-normal">
                          {item.answers_snapshot ? (
                            Object.entries(item.answers_snapshot).map(([key, val]) => (
                              <div key={key} className="mb-1 border-b border-amber-200/50 pb-1 last:border-0 last:mb-0">
                                <span className="font-black uppercase text-[8px] text-amber-900 opacity-60 mr-1">{key}:</span>
                                <span className="font-bold">{String(val)}</span>
                              </div>
                            ))
                          ) : (
                            "Empty Snapshot"
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {/* Loading State - Di luar table */}
            {isLoading && (
              <div className="p-32 text-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">
                Menghubungkan ke Pusat Data...
              </div>
            )}

            {/* Empty State - Di luar table */}
            {!isLoading && feedbackList.length === 0 && (
              <div className="p-32 text-center text-slate-400 font-black uppercase tracking-widest text-xs italic">
                Antrean Bersih - Tidak Ada Laporan Ambiguitas
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}