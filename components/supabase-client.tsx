import { createClient } from "@supabase/supabase-js@2.49.8";
import { projectId, publicAnonKey } from "../utils/supabase/info";

// Singleton Supabase client for the frontend
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
