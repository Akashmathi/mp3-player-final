// Safe fallback defaults to prevent React app from crashing on load
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || import.meta.env.VITE_SUPABASE_URL?.split('https://')[1]?.split('.supabase.co')[0] || "dummy_id";
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "dummy_key";
