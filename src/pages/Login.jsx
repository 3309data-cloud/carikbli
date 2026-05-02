import { useState } from "react";
import { supabase } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Jika berhasil, arahkan ke panel admin
      navigate("/admin/panel");
    } catch (error) {
      setErrorMsg(error.message || "Gagal login. Periksa kembali email dan password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* Header Login */}
        <div className="bg-orange-500 p-8 text-center">
          <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Admin Login</h2>
          <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mt-1">Sensus Ekonomi 2026</p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md">
              <p className="text-xs text-red-600 font-bold">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Email Admin</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl px-5 py-3 text-sm font-medium outline-none transition-all"
              placeholder="admin@bps.go.id"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl px-5 py-3 text-sm font-medium outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:bg-gray-400 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              "MASUK KE PANEL"
            )}
          </button>
          
          <div className="text-center">
            <button 
              type="button"
              onClick={() => navigate("/")}
              className="text-[10px] font-bold text-gray-400 hover:text-orange-500 transition-colors uppercase tracking-widest"
            >
              ← Kembali ke Aplikasi Pencarian
            </button>
          </div>
        </form>

        <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
            Internal Use Only • BPS Kabupaten Boyolali
          </p>
        </div>
      </div>
    </div>
  );
}