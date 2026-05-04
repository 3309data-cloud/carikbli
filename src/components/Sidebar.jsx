export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'keyword', label: 'Keyword Training', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'feedback', label: 'Feedback Salah KBLI', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: 'kbli', label: 'Kelola data KBLI', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' },
    { id: 'synonym', label: 'Kelola Synonym', icon: 'M18 10h.01M12 10h.01M6 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: 'admintest', label: 'Test', icon: 'M18 10h.01M12 10h.01M6 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' }
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 hidden lg:flex flex-col shrink-0 shadow-2xl">
      <div className="p-8 flex items-center gap-3">
        <div>
          <h2 className="text-white font-black text-lg leading-none tracking-tighter uppercase">Manajemen Cari KBLI</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">BPS Kabupaten Boyolali</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 mt-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full px-4 py-4 rounded-xl flex items-center gap-3 border transition-all ${
              activeTab === item.id 
                ? "bg-blue-600/10 text-blue-400 border-blue-600/20 font-black shadow-inner" 
                : "border-transparent hover:bg-slate-800 text-slate-500 font-bold"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
            </svg>
            <span className="text-xs uppercase tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-8 border-t border-slate-800/50">
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
          <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest leading-none">Status Engine</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-[11px] text-slate-400 font-bold uppercase">Online & Learning</p>
          </div>
        </div>
      </div>
    </aside>
  );
}