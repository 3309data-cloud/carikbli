import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./services/api";

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek session saat ini
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Pantau perubahan auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  // Jika tidak login, arahkan ke halaman login (kita buat rutenya di langkah 2)
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}