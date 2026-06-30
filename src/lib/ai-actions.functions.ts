import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, DEFAULT_MODEL, getLovableApiKey } from "./ai-gateway.server";

function getModel() {
  const gateway = createLovableAiGatewayProvider(getLovableApiKey());
  return gateway(DEFAULT_MODEL);
}

function extractJson<T>(text: string): T {
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
  const raw = (m ? m[1] : text).trim();
  // Try direct parse, then find first { ... }
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1)) as T;
    throw new Error("AI did not return valid JSON");
  }
}

/* =========================== EMAIL =========================== */

const EmailInput = z.object({
  recipient: z.string().optional().default(""),
  subject: z.string().optional().default(""),
  purpose: z.string().min(1),
  context: z.string().optional().default(""),
  tone: z.string().default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmailInput.parse(d))
  .handler(async ({ data, context }) => {
    const lengthHint =
      data.length === "short" ? "around 80 words" : data.length === "long" ? "around 280 words" : "around 160 words";
    const prompt = `Write a ${data.tone} email ${lengthHint}.
Recipient: ${data.recipient || "the recipient"}
Subject hint: ${data.subject || "(generate one)"}
Purpose: ${data.purpose}
Additional context: ${data.context || "(none)"}

Respond as JSON only, no commentary, in this exact shape:
{"subject": "...", "body": "..."}
Body should include greeting, paragraphs separated by blank lines, and a sign-off.`;

    const { text } = await generateText({ model: getModel(), prompt });
    const parsed = extractJson<{ subject: string; body: string }>(text);

    const { data: row } = await context.supabase
      .from("emails")
      .insert({
        user_id: context.userId,
        recipient: data.recipient || null,
        subject: parsed.subject,
        body: parsed.body,
        tone: data.tone as never,
        length: data.length,
        purpose: data.purpose,
        context: data.context || null,
      })
      .select()
      .single();

    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      kind: "email",
      label: `Generated email: ${parsed.subject}`,
      ref_id: row?.id ?? null,
    });
    await context.supabase.from("notifications").insert({
      user_id: context.userId,
      title: "Email ready",
      body: parsed.subject,
      kind: "email",
    });

    return { id: row?.id, ...parsed };
  });

const RewriteInput = z.object({
  body: z.string().min(1),
  action: z.enum(["rewrite", "grammar", "translate"]),
  language: z.string().optional(),
});

export const rewriteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RewriteInput.parse(d))
  .handler(async ({ data }) => {
    const instruction =
      data.action === "rewrite"
        ? "Rewrite this email to be clearer, more professional, and concise. Preserve meaning."
        : data.action === "grammar"
          ? "Fix grammar, spelling and punctuation. Preserve voice."
          : `Translate this email to ${data.language || "Spanish"}. Preserve formatting.`;
    const { text } = await generateText({
      model: getModel(),
      prompt: `${instruction}\n\nEmail:\n${data.body}\n\nReturn only the new email body, no commentary.`,
    });
    return { body: text.trim() };
  });

/* =========================== MEETING =========================== */

const MeetingInput = z.object({
  title: z.string().min(1).default("Meeting"),
  notes: z.string().min(10),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MeetingInput.parse(d))
  .handler(async ({ data, context }) => {
    const prompt = `You are an expert meeting summarizer. Summarize the notes below.
Return ONLY JSON in this exact shape:
{
  "summary": "2-4 sentence executive summary",
  "decisions": ["..."],
  "action_items": [{"owner":"name","task":"...","due":"..."}],
  "deadlines": [{"label":"...","date":"..."}],
  "participants": ["..."],
  "highlights": ["..."]
}

Notes:
${data.notes}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const parsed = extractJson<{
      summary: string;
      decisions: string[];
      action_items: Array<{ owner: string; task: string; due: string }>;
      deadlines: Array<{ label: string; date: string }>;
      participants: string[];
      highlights: string[];
    }>(text);

    const { data: row } = await context.supabase
      .from("meeting_summaries")
      .insert({
        user_id: context.userId,
        title: data.title,
        raw_notes: data.notes,
        summary: parsed.summary,
        decisions: parsed.decisions,
        action_items: parsed.action_items,
        deadlines: parsed.deadlines,
        participants: parsed.participants,
        highlights: parsed.highlights,
      })
      .select()
      .single();

    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      kind: "meeting",
      label: `Summarized: ${data.title}`,
      ref_id: row?.id ?? null,
    });
    await context.supabase.from("notifications").insert({
      user_id: context.userId,
      title: "Meeting summary ready",
      body: data.title,
      kind: "meeting",
    });

    return { id: row?.id, ...parsed };
  });

/* =========================== PLANNER =========================== */

const PlannerInput = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      est_minutes: z.number().int().positive().default(30),
      deadline: z.string().optional(),
    }),
  ),
  start: z.string().default("09:00"),
  end: z.string().default("17:00"),
  break_minutes: z.number().int().default(60),
});

export const planDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlannerInput.parse(d))
  .handler(async ({ data, context }) => {
    const prompt = `You are a productivity assistant. Build a focused day plan.
Working window: ${data.start} to ${data.end}. Lunch break length: ${data.break_minutes} minutes (place around midday).
Tasks (JSON): ${JSON.stringify(data.tasks)}

Rules:
- Prioritize urgent / high first, hardest work in the morning.
- Insert short breaks every ~90 minutes.
- Use realistic time blocks based on est_minutes.
- Include a buffer block at the end.

Return ONLY JSON:
{
  "blocks": [{"start":"HH:MM","end":"HH:MM","title":"...","kind":"task|break|focus|buffer"}],
  "tips": ["short tip", "..."]
}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const parsed = extractJson<{
      blocks: Array<{ start: string; end: string; title: string; kind: string }>;
      tips: string[];
    }>(text);

    const today = new Date().toISOString().slice(0, 10);
    await context.supabase
      .from("task_schedules")
      .upsert({ user_id: context.userId, date: today, blocks: parsed.blocks }, { onConflict: "user_id,date" });

    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      kind: "task",
      label: `Planned ${parsed.blocks.length} blocks for today`,
    });

    return parsed;
  });

/* =========================== RESEARCH =========================== */

const ResearchInput = z.object({ topic: z.string().min(2), compare_with: z.string().optional() });

export const researchTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResearchInput.parse(d))
  .handler(async ({ data, context }) => {
    const compare = data.compare_with
      ? ` Also compare and contrast "${data.topic}" with "${data.compare_with}" inside the overview.`
      : "";
    const prompt = `Research the workplace topic: "${data.topic}".${compare}
Return ONLY JSON:
{
  "overview": "2-3 paragraph overview",
  "key_findings": ["..."],
  "advantages": ["..."],
  "challenges": ["..."],
  "recommendations": ["..."],
  "refs": [{"title":"...","source":"..."}]
}`;
    const { text } = await generateText({ model: getModel(), prompt });
    const parsed = extractJson<{
      overview: string;
      key_findings: string[];
      advantages: string[];
      challenges: string[];
      recommendations: string[];
      refs: Array<{ title: string; source: string }>;
    }>(text);

    const { data: row } = await context.supabase
      .from("research_items")
      .insert({
        user_id: context.userId,
        topic: data.topic,
        overview: parsed.overview,
        key_findings: parsed.key_findings,
        advantages: parsed.advantages,
        challenges: parsed.challenges,
        recommendations: parsed.recommendations,
        refs: parsed.refs,
      })
      .select()
      .single();

    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      kind: "research",
      label: `Researched: ${data.topic}`,
      ref_id: row?.id ?? null,
    });
    await context.supabase.from("notifications").insert({
      user_id: context.userId,
      title: "Research complete",
      body: data.topic,
      kind: "research",
    });
    return { id: row?.id, ...parsed };
  });

/* =========================== CHAT =========================== */

const ChatInput = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1),
});

const SYSTEM_PROMPT = `You are Lumen, the Smart Workplace AI Assistant. You help with emails, meeting notes, task planning, research, and general workplace questions. Be concise, structured, and professional. Use Markdown for lists, headings, and code. When the user asks for a draft (email, plan, summary), produce it directly without preamble.`;

export const chatSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    let convId = data.conversation_id;

    if (!convId) {
      const { data: conv } = await context.supabase
        .from("chat_conversations")
        .insert({ user_id: context.userId, title: data.message.slice(0, 60) })
        .select()
        .single();
      convId = conv?.id;
    }
    if (!convId) throw new Error("Could not create conversation");

    // Save user message
    await context.supabase.from("chat_messages").insert({
      conversation_id: convId,
      user_id: context.userId,
      role: "user",
      parts: [{ type: "text", text: data.message }],
    });

    // Load full history
    const { data: history } = await context.supabase
      .from("chat_messages")
      .select("role, parts")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    type Part = { type: string; text?: string };
    const messages = (history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: ((m.parts as Part[]) ?? [])
        .filter((p) => p.type === "text")
        .map((p) => p.text ?? "")
        .join(""),
    }));

    const { text } = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })) as never,
    });

    await context.supabase.from("chat_messages").insert({
      conversation_id: convId,
      user_id: context.userId,
      role: "assistant",
      parts: [{ type: "text", text }],
    });

    await context.supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      kind: "chat",
      label: `Chat: ${data.message.slice(0, 50)}`,
      ref_id: convId,
    });

    return { conversation_id: convId, reply: text };
  });
