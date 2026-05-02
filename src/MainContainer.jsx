// Di dalam MainContainer.jsx
import { supabase } from "./services/api"; // Pastikan import supabase
import { useState } from "react";
import AdminPanel from "./pages/AdminPanel";
import FeedbackManager from "./pages/FeedbackManager";
import AdminKbliManager from "./pages/AdminKbliManager";
import Sidebar from "./components/Sidebar";

export default function MainContainer() {
  const [activeTab, setActiveTab] = useState('keyword');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
       {/* Sidebar */}
       <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

       <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
         {/* Tambahkan tombol logout sederhana di pojok atas jika perlu */}
         <div className="p-4 flex justify-end bg-white border-b">
            <button 
              onClick={handleLogout}
              className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
            >
              LOGOUT
            </button>
         </div>

         {activeTab === 'keyword' ? <AdminPanel /> : activeTab === 'feedback' ? <FeedbackManager /> : <AdminKbliManager />}
       </main>
    </div>
  );
}