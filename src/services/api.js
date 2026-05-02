import { supabase } from './supabaseClient';
export { supabase };

export async function getAppData() {
  try {
    const [
      { data: kbli },
      { data: dimensions },
      { data: questions },
      { data: options },
      { data: rules },
      { data: synonyms },
      { data: settings },
      { data: suggestions },
      // --- TAMBAHKAN INI UNTUK FEEDBACK MANAGER ---
      { data: feedback } 
    ] = await Promise.all([
      supabase.from('master_kbli').select('*'),
      supabase.from('dimensions').select('*'),
      supabase.from('questions').select('*'),
      supabase.from('options').select('*'),
      supabase.from('rules').select('*'),
      supabase.from('synonyms').select('*'),
      supabase.from('app_settings').select('*'),
      // Query suggestions tetap mengambil dari View
      supabase.from('v_keyword_suggestions').select('*'),
      // Tambahkan pengambilan feedback_logs yang belum diproses
      supabase.from('feedback_logs').select('*').eq('is_processed', false)
    ]);

    // Format dimension keywords
    const dimension_keywords = options?.map(opt => ({
      keyword: opt.label,
      dimension_id: questions?.find(q => q.id === opt.question_id)?.dimension_id, // Gunakan dimension_id agar konsisten
      value: opt.value
    })).filter(item => item.dimension_id) || [];

    // Format settings menjadi Object Map (key-value)
    const settingsMap = {};
    settings?.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return {
      kbli: kbli || [],
      dimensions: dimensions || [],
      questions: questions || [],
      options: options || [],
      rules: rules || [],
      synonyms: synonyms || [],
      dimension_keywords,
      settings: settingsMap,
      suggestions: suggestions || [],
      // Tambahkan feedback ke return object
      feedback: feedback || [] 
    };

  } catch (error) {
    console.error("Gagal mengambil data dari Supabase:", error);
    throw error;
  }
}