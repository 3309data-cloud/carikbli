import { createClient } from '@supabase/supabase-js';

// Ganti dengan URL dan Key dari Project Settings Supabase Anda
const supabaseUrl = 'https://qqaorugyfmlhrvsnifum.supabase.co';
const supabaseKey = 'sb_publishable_560BQC_aSfd-9UiEH-lc-g_8hzj4r4s';

export const supabase = createClient(supabaseUrl, supabaseKey);