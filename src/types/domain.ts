export type UrgencyLevel = "low" | "medium" | "high";
export type ChatRole = "user" | "assistant";
export type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export interface Device {
  id: string;
  userId: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface DiagnosisIssue {
  name: string;
  probability: UrgencyLevel;
  why: string;
}

export interface Scan {
  id: string;
  deviceId: string;
  imageUrl: string; // signed URL, ~1h TTL
  speciesScientific: string | null;
  speciesCommon: string | null;
  speciesConfidence: number | null;
  urgency: UrgencyLevel | null;
  summary: string | null;
  likelyIssues: DiagnosisIssue[];
  recommendedActions: string[];
  followUpQuestions: string[];
  isFavorite: boolean;
  createdAt: string;
}

export interface ScanWithMessages extends Scan {
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  scanId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  deviceId: string;
  scanId: string | null;
  title: string;
  notes: string | null;
  dueAt: string;
  recurrence: RecurrenceType;
  doneAt: string | null;
  createdAt: string;
}
