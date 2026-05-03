export default function SearchInput({ 
  query, setQuery, onSubmit, onVoice, isListening, history, onSelectHistory, 
  chatMessages, onReset 
}) {
  // JIKA SUDAH ADA PESAN (PROSES SEARCH BERJALAN)
  if (chatMessages.length > 0) {
    return (
      <div className="shrink-0 bg-white border-t border-gray-100 p-4 shadow-lg z-20">
        <button
          onClick={onReset}
          className="w-full bg-orange-50 text-orange-600 border-2 border-orange-200 font-bold py-4 rounded-2xl hover:bg-orange-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Mulai Pencarian Baru
        </button>
      </div>
    );
  }

  // JIKA BELUM ADA PESAN (TAMPILAN AWAL/INPUT)
  return (
    <div className="shrink-0 bg-white border-t border-gray-100 p-4 shadow-lg z-20">
      {history.length > 0 && (
        <div className="mb-4 overflow-x-auto flex gap-2 no-scrollbar pb-2">
          {history.map((item, idx) => (
            <button key={idx} onClick={() => onSelectHistory(item)} className="shrink-0 bg-orange-50 px-3 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95">
              <span className="text-[10px] font-black text-orange-600">{item.kode}</span>
              <span className="text-[10px] font-bold text-gray-600">"{item.query}"</span>
            </button>
          ))}
        </div>
      )}
      
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative flex items-center bg-gray-50 border-2 border-transparent focus-within:border-orange-400 rounded-2xl px-2 transition-all">
          <input
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder={isListening ? "Mendengarkan..." : "Ketik aktivitas..."}
            className="w-full bg-transparent border-none py-4 px-3 text-sm font-medium outline-none placeholder:text-gray-400"
            autoFocus
          />
          <button 
            onClick={onVoice} 
            className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-orange-500'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            </svg>
          </button>
        </div>

        <button 
          onClick={onSubmit} 
          disabled={!query.trim() && !isListening}
          className="bg-orange-500 disabled:bg-gray-200 text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}