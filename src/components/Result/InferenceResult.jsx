import { getKbliHierarchy } from "../../utils/getKbliHierarchy";

export default function InferenceResult({ 
  inference, isReported, isReporting, onReport, onTraining, onReset, onCopy, copiedCode, verifikasiRef, resultCardRef, selectedKbli, data 
}) {
  const { topResult, confidence, finalResults } = inference;
  const isHighConfidence = confidence >= 80;

  return (
    <div ref={resultCardRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-10">
      <div className={`rounded-3xl overflow-hidden shadow-lg transition-all border-t-8 ${
        isReported || isHighConfidence ? 'border-green-500' : 'border-yellow-400'
      }`}>

        {isHighConfidence ? (
          /* --- KARTU HIJAU (Saran Langsung) --- */
          <div className="bg-green-50 p-5 border-x border-b border-green-100">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-green-600 text-white text-[12px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0 mt-0.5">
                {getKbliHierarchy(topResult.kode).catLet}
              </span>
              <span className="text-[12px] text-green-800 font-bold uppercase leading-tight">
                {getKbliHierarchy(topResult.kode).catName}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Saran Kode KBLI</p>
              
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-black text-green-900 tracking-tighter">{topResult.kode}</h2>
                <button
                  onClick={(e) => onCopy(topResult.kode, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-200/50 hover:bg-green-200 text-green-700 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  {copiedCode === topResult.kode ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeWidth="3" points="20 6 9 17 4 12" /></svg> <span className="text-[10px] font-bold">Tersalin!</span></>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"></path></svg> <span className="text-[10px] font-bold uppercase tracking-tighter">Salin</span></>
                  )}
                </button>
              </div>

              <h3 className="text-lg font-bold text-gray-800 leading-tight pt-2">{topResult.nama}</h3>
            </div>

            <div className="mt-4 p-4 bg-white/60 rounded-2xl border border-green-200 italic text-gray-600 text-xs leading-relaxed">
              "{topResult.uraian}"
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between bg-white/80 p-3 rounded-2xl shadow-sm border border-green-100">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-black text-green-700">{Math.round(confidence)}%</span>
                  </div>
                  <span className="text-[10px] font-bold text-green-800 uppercase">Tingkat Kecocokan</span>
                </div>
              </div>

              <button onClick={onReset} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 transition-all active:scale-95">
                Mulai Pencarian Baru
              </button>

              <button onClick={onReport} disabled={isReporting || isReported}
                className={`w-full py-3 text-xs font-bold rounded-xl border-2 transition-all ${isReported ? "bg-white/50 text-gray-400 border-gray-200" : "text-red-500 border-red-200 hover:bg-red-50"}`}>
                {isReported ? "✓ Laporan Terkirim" : "⚠️ Laporkan Jika Aplikasi Salah Identifikasi"}
              </button>
            </div>
          </div>
        ) : (
          /* --- KARTU KUNING (Verifikasi Manual) --- */
          <div className="bg-white border-x border-b border-gray-200 rounded-b-3xl">
            <div ref={verifikasiRef} className={`${isReported ? 'bg-green-400' : 'bg-yellow-400'} p-4 flex items-center gap-2`}>
              <span className={`text-xs font-black uppercase tracking-tight ${isReported ? 'text-green-900' : 'text-yellow-900'}`}>
                {isReported ? "✓ Pilihan Terkonfirmasi" : "⚠️ Verifikasi Diperlukan"}
              </span>
            </div>

            <div className="p-5">
              {!isReported && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800">Saya menemukan beberapa kode KBLI yang mirip atau mendekati dengan pencarian Anda :</p>
                  <p className="text-[11px] text-gray-500 mt-1">Silakan pilih kode yang paling sesuai agar kami kedepannya bisa menyarankan kode KBLI yang tepat.</p>
                </div>
              )}

              <div className="space-y-3">
                {(isReported && selectedKbli ? [selectedKbli] : finalResults.slice(0, 6)).map((cand) => (
                  <button
                    key={cand.kode}
                    onClick={() => !isReported && onTraining(cand)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      isReported ? "border-green-200 bg-green-50 opacity-100 cursor-default" : "border-gray-100 hover:border-orange-500 bg-white shadow-sm active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-black ${isReported ? 'bg-green-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
                        KBLI {cand.kode}
                      </span>
                      {isReported && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-green-600 tracking-tighter">✓ TERVERIFIKASI</span>
                          <div onClick={(e) => onCopy(cand.kode, e)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors cursor-pointer">
                            {copiedCode === cand.kode ? 
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeWidth="3" points="20 6 9 17 4 12" /></svg> : 
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"></path></svg>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    <p className={`font-bold text-sm ${isReported ? 'text-green-900' : 'text-gray-800'}`}>{cand.nama}</p>
                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 italic">"{cand.uraian}"</p>
                  </button>
                ))}

                {/* Tombol Baru: Tidak Ada Saran yang Sesuai */}
                {!isReported && (
                  <button
                    onClick={() => onTraining({ 
                      kode: "0000", 
                      nama: "KBLI Tidak Ditemukan / Tidak Sesuai", 
                      uraian: "Petugas melaporkan bahwa tidak ada saran dari sistem yang sesuai dengan deskripsi usaha di lapangan." 
                    })}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-[0.98] group"
                  >
                    <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Tidak ada saran yang sesuai</span>
                  </button>
                )}
              </div>

              {isReported && (
                <div className="mt-4 bg-green-50 border border-green-100 p-4 rounded-2xl animate-in fade-in duration-300">
                  <p className="text-xs text-green-800 leading-relaxed font-medium">
                    {data.settings?.learning_mode === 'frequency'
                      ? "Terima kasih! Sistem telah mempelajari istilah baru ini secara otomatis."
                      : "Terima kasih! Data ini akan digunakan untuk melatih model agar lebih pintar."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}