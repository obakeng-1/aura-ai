import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Clock, Mail, FileText, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Lumen" }] }),
  component: AnalyticsPage,
});

const COLORS = ["oklch(0.547 0.224 277.4)", "oklch(0.715 0.143 215.2)", "oklch(0.715 0.157 162.5)", "oklch(0.78 0.16 70)", "oklch(0.65 0.22 320)"];

function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: logs } = await supabase
        .from("activity_log")
        .select("kind, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      const byDay: Record<string, Record<string, number>> = {};
      const byKind: Record<string, number> = {};
      (logs ?? []).forEach((l) => {
        const d = new Date(l.created_at).toLocaleDateString(undefined, { weekday: "short" });
        byDay[d] = byDay[d] || {};
        byDay[d][l.kind] = (byDay[d][l.kind] || 0) + 1;
        byKind[l.kind] = (byKind[l.kind] || 0) + 1;
      });

      const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dailySeries = dayOrder.map((d) => ({
        day: d,
        email: byDay[d]?.email ?? 0,
        meeting: byDay[d]?.meeting ?? 0,
        task: byDay[d]?.task ?? 0,
        research: byDay[d]?.research ?? 0,
        chat: byDay[d]?.chat ?? 0,
      }));

      const totalAI = Object.values(byKind).reduce((a, b) => a + b, 0);
      const kindPie = Object.entries(byKind).map(([name, value]) => ({ name, value }));

      // Productivity score: weighted across categories, capped 0-100
      const score = Math.min(
        100,
        Math.round(
          (byKind.email ?? 0) * 6 +
            (byKind.meeting ?? 0) * 12 +
            (byKind.task ?? 0) * 4 +
            (byKind.research ?? 0) * 10 +
            (byKind.chat ?? 0) * 2,
        ),
      );

      const hoursSaved = ((byKind.email ?? 0) * 5 + (byKind.meeting ?? 0) * 15 + (byKind.task ?? 0) * 5 + (byKind.research ?? 0) * 20) / 60;

      return { dailySeries, kindPie, totalAI, score, hoursSaved: hoursSaved.toFixed(1), byKind };
    },
  });

  const stats = [
    { label: "Emails generated", value: data?.byKind?.email ?? 0, icon: Mail },
    { label: "Meetings summarized", value: data?.byKind?.meeting ?? 0, icon: FileText },
    { label: "Tasks completed", value: data?.byKind?.task ?? 0, icon: CheckCircle2 },
    { label: "Hours saved", value: data?.hoursSaved ?? "0.0", icon: Clock },
    { label: "AI requests", value: data?.totalAI ?? 0, icon: Sparkles },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold lg:text-4xl">Productivity Analytics</h1>
        <p className="mt-1 text-muted-foreground">Your last 7 days at a glance.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60 bg-card/80 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-1 font-display text-2xl font-bold">{s.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/80 p-5 backdrop-blur lg:col-span-2">
          <h3 className="mb-4 font-display font-semibold">AI activity by day</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.dailySeries ?? []}>
                <XAxis dataKey="day" stroke="currentColor" className="text-xs text-muted-foreground" />
                <YAxis stroke="currentColor" className="text-xs text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="email" stackId="a" fill="oklch(0.547 0.224 277.4)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="meeting" stackId="a" fill="oklch(0.715 0.143 215.2)" />
                <Bar dataKey="task" stackId="a" fill="oklch(0.715 0.157 162.5)" />
                <Bar dataKey="research" stackId="a" fill="oklch(0.78 0.16 70)" />
                <Bar dataKey="chat" stackId="a" fill="oklch(0.65 0.22 320)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
          <h3 className="mb-2 font-display font-semibold">Weekly score</h3>
          <p className="text-xs text-muted-foreground">Composite productivity index</p>
          <div className="mt-6 flex items-center justify-center">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#grad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(2 * Math.PI * 42 * (data?.score ?? 0)) / 100} 999`}
                />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="oklch(0.547 0.224 277.4)" />
                    <stop offset="100%" stopColor="oklch(0.715 0.143 215.2)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="font-display text-4xl font-bold">{data?.score ?? 0}</div>
                  <div className="text-xs text-muted-foreground">of 100</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-success" /> Keep going!
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 p-5 backdrop-blur lg:col-span-3">
          <h3 className="mb-4 font-display font-semibold">AI usage mix</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data?.kindPie ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(data?.kindPie ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <FloatingAssistant />
    </AppShell>
  );
}
