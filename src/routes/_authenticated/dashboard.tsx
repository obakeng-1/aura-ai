import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Mail,
  FileText,
  Calendar,
  BookOpen,
  Bot,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Lumen" }] }),
  component: Dashboard,
});

const quickActions = [
  { to: "/email", icon: Mail, label: "Generate Email", color: "from-indigo-500 to-violet-500" },
  { to: "/meetings", icon: FileText, label: "Summarize Notes", color: "from-cyan-500 to-sky-500" },
  { to: "/planner", icon: Calendar, label: "Plan My Day", color: "from-emerald-500 to-teal-500" },
  { to: "/research", icon: BookOpen, label: "Research Topic", color: "from-orange-500 to-amber-500" },
  { to: "/chatbot", icon: Bot, label: "Chat with AI", color: "from-fuchsia-500 to-pink-500" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const name =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [emails, meetings, tasks, activity] = await Promise.all([
        supabase.from("emails").select("id", { count: "exact", head: true }),
        supabase.from("meeting_summaries").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "done"),
        supabase
          .from("activity_log")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
      ]);
      const hoursSaved = ((emails.count || 0) * 5 + (meetings.count || 0) * 15 + (tasks.count || 0) * 10) / 60;
      return {
        emails: emails.count ?? 0,
        meetings: meetings.count ?? 0,
        tasks: tasks.count ?? 0,
        today: activity.count ?? 0,
        hoursSaved: hoursSaved.toFixed(1),
      };
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const statCards = [
    { label: "Emails Generated", value: stats?.emails ?? 0, icon: Mail },
    { label: "Meeting Summaries", value: stats?.meetings ?? 0, icon: FileText },
    { label: "Tasks Completed", value: stats?.tasks ?? 0, icon: CheckCircle2 },
    { label: "Hours Saved", value: stats?.hoursSaved ?? "0.0", icon: Clock },
    { label: "AI Requests Today", value: stats?.today ?? 0, icon: Sparkles },
  ];

  return (
    <AppShell>
      <section className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">{greeting()}</p>
        <h1 className="font-display text-4xl font-bold tracking-tight lg:text-5xl">
          {greeting()}, {name} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">How can AI help you today?</p>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={a.to}>
                <Card className="group relative h-full cursor-pointer overflow-hidden border-border/60 bg-card/80 p-5 backdrop-blur transition hover:shadow-elegant">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${a.color} text-white shadow-soft`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold">{a.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60 bg-card/80 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-3xl font-bold">
                {isLoading ? <Skeleton className="h-9 w-16" /> : s.value}
              </div>
            </Card>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Recent activity</h2>
        <Card className="divide-y divide-border/60 border-border/60 bg-card/80 backdrop-blur">
          {recent.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Your activity will appear here. Try generating an email or summarizing a meeting.
            </div>
          )}
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted">
                {r.kind === "email" && <Mail className="h-4 w-4 text-primary" />}
                {r.kind === "meeting" && <FileText className="h-4 w-4 text-secondary" />}
                {r.kind === "task" && <Calendar className="h-4 w-4 text-accent" />}
                {r.kind === "research" && <BookOpen className="h-4 w-4 text-warning" />}
                {r.kind === "chat" && <Bot className="h-4 w-4 text-primary" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <FloatingAssistant />
    </AppShell>
  );
}
