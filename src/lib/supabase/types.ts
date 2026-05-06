// Hand-written DB types matching 0001_init.sql.
// Replace with generated types via: npx supabase gen types typescript > src/lib/supabase/types.ts

export interface DbDevice {
  id: string;
  user_id: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface DbScan {
  id: string;
  device_id: string;
  image_path: string;
  plantnet_raw: unknown | null;
  flora_raw: unknown | null;
  gemini_raw: unknown | null;
  species_scientific: string | null;
  species_common: string | null;
  species_confidence: number | null;
  urgency: "low" | "medium" | "high" | null;
  summary: string | null;
  likely_issues: unknown | null;
  recommended_actions: unknown | null;
  follow_up_questions: unknown | null;
  is_favorite: boolean;
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  scan_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface DbReminder {
  id: string;
  device_id: string;
  scan_id: string | null;
  title: string;
  notes: string | null;
  due_at: string;
  recurrence: "none" | "daily" | "weekly" | "biweekly" | "monthly";
  done_at: string | null;
  created_at: string;
}

export interface DbRateLimit {
  device_id: string;
  tokens: number;
  last_reset: string;
}

// Supabase Database type used to type the client.
// Each table must include Relationships to satisfy GenericTable constraint.
export type Database = {
  public: {
    Tables: {
      devices: {
        Row: DbDevice;
        Insert: Omit<DbDevice, "created_at" | "last_seen_at"> & {
          created_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<DbDevice>;
        Relationships: [];
      };
      scans: {
        Row: DbScan;
        Insert: Omit<DbScan, "id" | "created_at" | "is_favorite"> & {
          id?: string;
          created_at?: string;
          is_favorite?: boolean;
        };
        Update: Partial<DbScan>;
        Relationships: [];
      };
      chat_messages: {
        Row: DbChatMessage;
        Insert: Omit<DbChatMessage, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<DbChatMessage>;
        Relationships: [];
      };
      reminders: {
        Row: DbReminder;
        Insert: Omit<DbReminder, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<DbReminder>;
        Relationships: [];
      };
      rate_limits: {
        Row: DbRateLimit;
        Insert: DbRateLimit;
        Update: Partial<DbRateLimit>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
