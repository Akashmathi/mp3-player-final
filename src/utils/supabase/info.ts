// Safe fallback defaults to prevent React app from crashing on load
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL || "";
const urlMatch = supabaseUrl.match(/https?:\/\/([^./]+)\.supabase\.co/i);
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || (urlMatch ? urlMatch[1] : "dummy_id");
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLIC_ANON_KEY || "dummy_key";
export const supabaseUrlString = supabaseUrl;
