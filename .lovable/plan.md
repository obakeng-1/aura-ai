
# Smart Workplace AI Assistant — Build Plan

A modern, AI-powered productivity platform with authentication, email confirmation, dashboard, 5 AI tools, analytics, and settings. Built on TanStack Start + Lovable Cloud (auth, database, email) + Lovable AI (Gemini).

## 1. Design System

- **Colors** (semantic tokens in `src/styles.css`, oklch): Indigo `#4F46E5` primary, Cyan `#06B6D4` secondary, Emerald `#10B981` accent, slate `#F8FAFC` background, dark gray `#1F2937` text. Plus success/warning/destructive and gradient + glass tokens.
- **Fonts**: Poppins (headings, bold) + Inter (body) via `@fontsource` packages.
- **UI**: shadcn cards with soft shadows, rounded-2xl, glassmorphism surfaces, gradient buttons, Framer Motion animations, skeletons, sonner toasts, dark mode toggle.

## 2. Backend (Lovable Cloud)

- Enable Lovable Cloud → Supabase managed.
- Enable **email/password auth** with email confirmation + **Google OAuth**.
- Configure Lovable Emails domain so signup confirmation emails send branded.
- Tables (all with RLS scoped to `auth.uid()` + GRANTs):
  - `profiles` (id → auth.users, full_name, avatar_url, created_at)
  - `user_roles` + `app_role` enum + `has_role()` SECURITY DEFINER
  - `emails` (generated email history)
  - `meeting_summaries`
  - `tasks` + `task_schedules`
  - `research_items`
  - `chat_conversations` + `chat_messages` (UIMessage parts)
  - `notifications`
  - `user_settings` (theme, language, AI prefs)
  - `activity_log` (powers Recent Activity + analytics)
- Trigger: auto-create `profiles` row on signup.

## 3. Routes

```
src/routes/
  __root.tsx                          (providers, head, dark mode)
  index.tsx                           (marketing/landing → redirects signed-in to /dashboard)
  auth.tsx                            (login + signup, Google, forgot password)
  reset-password.tsx                  (public, type=recovery handler)
  _authenticated/route.tsx            (managed gate, ssr:false)
  _authenticated/dashboard.tsx        (home, greeting, stats, quick actions, recent activity)
  _authenticated/email.tsx            (Smart Email Generator)
  _authenticated/meetings.tsx         (Meeting Summarizer)
  _authenticated/planner.tsx          (AI Task Planner + weekly view)
  _authenticated/research.tsx         (AI Research Assistant)
  _authenticated/chatbot.tsx          (AI Chatbot, AI Elements)
  _authenticated/analytics.tsx        (Productivity Analytics, recharts)
  _authenticated/notifications.tsx    (Notifications list)
  _authenticated/settings.tsx         (Profile / Theme / Language / AI / Privacy)
  api/chat.ts                         (streaming chat for chatbot)
```

Shared `AppShell` with top navbar (search, notifications bell, dark mode, profile menu) + collapsible sidebar; mobile: hamburger + bottom nav.

## 4. AI Features (Lovable AI Gateway, `google/gemini-3-flash-preview`)

All AI calls in `createServerFn` under `src/lib/*.functions.ts`, except chatbot which streams via `src/routes/api/chat.ts` using `useChat` + AI Elements.

1. **Email Generator** — inputs (recipient, subject, purpose, context, tone dropdown, length). Server fn returns structured `{subject, body}`. Buttons: copy, download .txt, regenerate, edit, AI rewrite, grammar improve, translate.
2. **Meeting Summarizer** — paste notes / upload .txt/.md/PDF (parse client-side with pdf.js) / speech-to-text via Web Speech API. Structured output: `{summary, decisions[], actionItems[], deadlines[], participants[], highlights[]}`. Export PDF (jsPDF), copy, email summary (uses Lovable Emails).
3. **Task Planner** — task list with priority/duration/deadline + working hours/breaks. Generates timeboxed schedule, persisted. Weekly tab view; "move unfinished" action; calendar integration shown as ICS export download.
4. **Research Assistant** — topic input, returns `{overview, keyFindings[], advantages[], challenges[], recommendations[], references[]}`. Compare-two-topics mode. Export PDF/Word/copy.
5. **Chatbot** — AI Elements (`Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Shimmer`). Suggested prompts, conversation history sidebar (threads + database storage, route `/_authenticated/chatbot/$threadId` will be added if user wants threads — for now single-conversation per user with thread list as per spec; we'll use threaded). File upload + voice input (Web Speech). No custom logo: generate a domain-specific assistant mark.

Every AI response wrapped in an "AI Response Card" with copy/edit/download/share actions. Floating AI assistant button on all authed pages opens chatbot drawer.

## 5. Analytics

`activity_log` aggregated per user via server fn. Recharts: emails/week, tasks completed, meetings summarized, AI requests, weekly productivity score gauge.

## 6. Notifications

- DB-backed notifications + realtime subscription.
- Created by triggers from email/meeting/task/research completion.
- Bell badge in navbar + dedicated page.

## 7. Settings

Profile (name, avatar upload to Supabase Storage), theme (light/dark/system), language (UI labels, not full i18n), AI preferences (default tone, default model context), notifications toggles, privacy (delete account → Auth Admin via server fn), account.

## 8. Responsive & Polish

- Desktop: fixed sidebar + main workspace.
- Tablet: collapsible sidebar.
- Mobile: bottom nav (Dashboard, Chatbot, Planner, More), hamburger.
- Framer Motion page transitions, hover lift on cards, typing animation on chatbot, loading skeletons, sonner toasts.
- Responsible AI disclaimer in footer + Settings → Privacy.

## Technical Notes

- TanStack Start (existing stack), not Next.js. Tailwind v4, shadcn, Framer Motion, Recharts, AI Elements, `@ai-sdk/react`, `react-markdown`, `jspdf`, `pdfjs-dist`.
- All AI server functions read `LOVABLE_API_KEY` inside handlers; client calls via `useServerFn`.
- Email confirmation: Supabase signup with `emailRedirectTo: ${origin}/auth`; Lovable Emails domain auto-handles delivery — no custom template required beyond defaults, but we'll scaffold branded welcome + confirmation templates if a domain is configured.
- Roles in separate `user_roles` table; never on `profiles`.
- Google OAuth via `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.

## Out of Scope (Future)

OCR, team workspaces, M365/Slack/Teams/Trello/Jira integrations, sentiment analysis, full i18n, executive org-wide dashboard.

## Build Order

1. Enable Cloud + design tokens + fonts + AppShell
2. Auth pages + email confirmation + reset password + protected gate
3. Database schema (all tables, RLS, GRANTs, trigger)
4. Dashboard + Settings + Notifications shell
5. Email Generator → Meeting Summarizer → Task Planner → Research → Chatbot
6. Analytics + activity logging wiring
7. Responsive polish, animations, floating assistant, disclaimer
