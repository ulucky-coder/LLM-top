import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://daqaxdkyufelexsivywl.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Lazy-initialized Supabase client (only created when key is available)
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseAnonKey) {
    console.warn("Supabase anon key not configured. Settings sync disabled.");
    return null;
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// Legacy export for compatibility
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) {
      return {
        select: () => Promise.resolve({ data: null, error: { code: "NO_CLIENT", message: "Supabase not configured" } }),
        insert: () => Promise.resolve({ data: null, error: { code: "NO_CLIENT", message: "Supabase not configured" } }),
        update: () => Promise.resolve({ data: null, error: { code: "NO_CLIENT", message: "Supabase not configured" } }),
        upsert: () => Promise.resolve({ data: null, error: { code: "NO_CLIENT", message: "Supabase not configured" } }),
        delete: () => Promise.resolve({ data: null, error: { code: "NO_CLIENT", message: "Supabase not configured" } }),
      };
    }
    return client.from(table);
  },
};

// Types for settings table
export interface SettingsRow {
  id: string;
  user_id: string;
  settings_type: "prompts" | "patterns" | "agent_configs" | "synthesis";
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Helper functions for settings
export async function loadSettings(userId: string, settingsType: string) {
  const { data, error } = await supabase
    .from("llm_top_settings")
    .select("data")
    .eq("user_id", userId)
    .eq("settings_type", settingsType)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error loading settings:", error);
    return null;
  }

  return data?.data || null;
}

export async function saveSettings(
  userId: string,
  settingsType: string,
  data: Record<string, unknown>
) {
  const { error } = await supabase
    .from("llm_top_settings")
    .upsert(
      {
        user_id: userId,
        settings_type: settingsType,
        data,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,settings_type",
      }
    );

  if (error) {
    console.error("Error saving settings:", error);
    return false;
  }

  return true;
}

export async function loadAllSettings(userId: string) {
  const { data, error } = await supabase
    .from("llm_top_settings")
    .select("settings_type, data")
    .eq("user_id", userId);

  if (error) {
    console.error("Error loading all settings:", error);
    return null;
  }

  return data?.reduce(
    (acc, row) => {
      acc[row.settings_type] = row.data;
      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );
}
