import { z } from "zod";

// ---------- Shared ----------

export const UrgencySchema = z.enum(["low", "medium", "high"]);
export const RecurrenceSchema = z.enum(["none", "daily", "weekly", "biweekly", "monthly"]);

export const DiagnosisIssueSchema = z.object({
  name: z.string(),
  probability: UrgencySchema,
  why: z.string(),
});

export const DiagnosisOutputSchema = z.object({
  summary: z.string(),
  likelyIssues: z.array(DiagnosisIssueSchema),
  recommendedActions: z.array(z.string()),
  urgency: UrgencySchema,
  followUpQuestions: z.array(z.string()),
  careLight: z.string().nullable().optional(),
  careWater: z.string().nullable().optional(),
  careToxic: z.string().nullable().optional(),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;

// ---------- POST /api/scan ----------

export const ScanOrganSchema = z.enum(["leaf", "flower", "fruit", "bark", "auto"]);
export type ScanOrgan = z.infer<typeof ScanOrganSchema>;

// ---------- GET /api/scans ----------

export const ScansQuerySchema = z.object({
  favorite: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(), // ISO timestamp for cursor-based pagination
});

// ---------- PATCH /api/scans/[id] ----------

export const PatchScanSchema = z.object({
  is_favorite: z.boolean().optional(),
});

// ---------- POST /api/chat ----------

export const PostChatSchema = z.object({
  scan_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

// ---------- POST /api/reminders ----------

export const CreateReminderSchema = z.object({
  scan_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  due_at: z.string().datetime(),
  recurrence: RecurrenceSchema.default("none"),
});

// ---------- PATCH /api/reminders/[id] ----------

export const PatchReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
  due_at: z.string().datetime().optional(),
  recurrence: RecurrenceSchema.optional(),
  done_at: z.string().datetime().nullable().optional(),
});
