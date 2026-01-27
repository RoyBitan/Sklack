import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase credentials missing! Check your .env.local file.");
  if (typeof window !== "undefined") {
    console.info("Current environment:", import.meta.env);
  }
}

// Export a dummy client if missing, or throw a more helpful error
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://MISSING_URL.supabase.co", "placeholder");
