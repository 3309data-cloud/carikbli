import { supabase } from "./services/api";
import { useState, useEffect } from "react";
// 1. Import Hook Data
import { useKbliData } from "./hooks/useKbliData"; 

import AdminPanel from "./pages/AdminPanel";
import FeedbackManager from "./pages/FeedbackManager";
import AdminKbliManager from "./pages/AdminKbliManager";
import Sidebar from "./components/Sidebar";
import SynonymManager from "./pages/SynonymManager";
import AdminQualityTest from "./pages/AdminQualityTest";

export default function MainContainer() {
  const [activeTab, setActiveTab] = useState(localStorage.getItem("adminTab") || "keyword");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("...");

  // 2. Inisialisasi Hook di sini
  const { data: appData, isLoading: isLoadingKbli } = useKbliData();

  useEffect(() => {
    localStorage.setItem("adminTab", activeTab);
    fetchCurrentVersion();
  }, [activeTab]);

  const fetchCurrentVersion = async () => {
    const { data } = await supabase
      .from('app_metadata')
      .select('value')
      .eq('key', 'db_version')
      .single();
    if (data) setCurrentVersion(data.value);
  };

  const handlePushUpdate = async () => {
    // ... (kode push update tetap sama)
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // 3. Masukkan data ke dalam komponen yang membutuhkan
  const renderContent = () => {
    switch (activeTab) {
      case "keyword": return <AdminPanel />;
      case "feedback": return <FeedbackManager />;
      case "kbli": return <AdminKbliManager />;
      case "synonym": return <SynonymManager />;
      case "admintest": 
        return (
          <AdminQualityTest 
            data={appData} 
            isLoadingAppData={isLoadingKbli} 
          />
        );
      default: return <AdminPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 flex justify-end items-center gap-4 bg-white border-b shadow-sm">
          {/* Info Versi & Logout Section */}
          <div className="flex items-center gap-2 border-r pr-4 border-slate-100">
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Database Version</p>
              <p className="text-xs font-black text-blue-600 leading-none">{currentVersion}</p>
            </div>
            <button 
              onClick={handlePushUpdate}
              disabled={isUpdating}
              className={`ml-2 p-2 rounded-lg transition-all active:scale-90 ${
                isUpdating ? 'bg-slate-100' : 'bg-blue-50 hover:bg-blue-600 group'
              }`}
            >
               <svg className={`w-4 h-4 ${isUpdating ? 'text-slate-400 animate-spin' : 'text-blue-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <button onClick={handleLogout} className="text-[10px] font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all tracking-widest">
            LOGOUT
          </button>
        </div>

        {/* 4. Render menggunakan fungsi agar props ter-update */}
        <div className="flex-1 overflow-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}