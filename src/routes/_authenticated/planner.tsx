import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar as CalIcon, Loader2, Plus, Sparkles, Trash2, Coffee, Target, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { planDay } from "@/lib/ai-actions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Task Planner — Lumen" }] }),
  component: PlannerPage,
});

type Block = { start: string; end: string; title: string; kind: string };

function PlannerPage() {
  const qc = useQueryClient();
  const run = useServerFn(planDay);
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: schedule, refetch: refetchSchedule } = useQuery({
    queryKey: ["schedule", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_schedules")
        .select("*")
        .eq("date", today)
        .maybeSingle();
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [est, setEst] = useState(30);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [brk, setBrk] = useState(60);
  const [tips, setTips] = useState<string[]>([]);

  const addTask = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Add a task title");
      const { error } = await supabase
        .from("tasks")
        .insert({ title, priority, est_minutes: est, user_id: (await supabase.auth.getUser()).data.user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setEst(30);
      refetchTasks();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("tasks").delete().eq("id", id);
    },
    onSuccess: () => refetchTasks(),
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      await supabase.from("tasks").update({ status: done ? "done" : "todo" }).eq("id", id);
    },
    onSuccess: () => {
      refetchTasks();
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const plan = useMutation({
    mutationFn: () =>
      run({
        data: {
          tasks: tasks
            .filter((t) => t.status !== "done")
            .map((t) => ({
              title: t.title,
              priority: t.priority,
              est_minutes: t.est_minutes,
              deadline: t.deadline ?? undefined,
            })),
          start,
          end,
          break_minutes: brk,
        },
      }),
    onSuccess: (r) => {
      setTips(r.tips);
      refetchSchedule();
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
      toast.success("Schedule ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blocks = (schedule?.blocks as Block[] | undefined) ?? [];

  const priorityColor = (p: string) =>
    p === "urgent"
      ? "destructive"
      : p === "high"
        ? "default"
        : p === "low"
          ? "outline"
          : "secondary";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold lg:text-4xl">AI Task Planner</h1>
        <p className="mt-1 text-muted-foreground">
          Drop in your tasks. Get a prioritized, balanced day in seconds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
            <h2 className="mb-4 font-display text-lg font-semibold">Add a task</h2>
            <div className="space-y-3">
              <Input
                placeholder="Finish client proposal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask.mutate()}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={est}
                  onChange={(e) => setEst(parseInt(e.target.value) || 30)}
                  placeholder="Minutes"
                />
              </div>
              <Button
                onClick={() => addTask.mutate()}
                disabled={addTask.isPending}
                className="w-full gap-1.5"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> Add task
              </Button>
            </div>

            <div className="mt-5 space-y-1.5">
              {tasks.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No tasks yet.</p>
              )}
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5"
                >
                  <input
                    type="checkbox"
                    checked={t.status === "done"}
                    onChange={(e) => toggleDone.mutate({ id: t.id, done: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`truncate text-sm font-medium ${t.status === "done" ? "line-through opacity-60" : ""}`}>
                      {t.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.est_minutes} min</div>
                  </div>
                  <Badge variant={priorityColor(t.priority)} className="capitalize">
                    {t.priority}
                  </Badge>
                  <button
                    onClick={() => removeTask.mutate(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
            <h2 className="mb-4 font-display text-lg font-semibold">Working hours</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Label>Lunch break (min)</Label>
              <Input
                type="number"
                value={brk}
                onChange={(e) => setBrk(parseInt(e.target.value) || 0)}
              />
            </div>
            <Button
              onClick={() => {
                if (tasks.length === 0) return toast.error("Add at least one task first");
                plan.mutate();
              }}
              disabled={plan.isPending}
              className="mt-4 w-full gap-2 gradient-primary text-primary-foreground"
            >
              {plan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate schedule
            </Button>
          </Card>
        </div>

        <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today's schedule</h2>
            <Badge variant="outline">
              <CalIcon className="mr-1.5 h-3 w-3" />
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </Badge>
          </div>

          {blocks.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Your AI-generated schedule will appear here.
            </div>
          )}

          <ol className="relative space-y-2 border-l border-border/60 pl-6">
            {blocks.map((b, i) => {
              const Icon =
                b.kind === "break" ? Coffee : b.kind === "focus" ? Target : b.kind === "buffer" ? Zap : CalIcon;
              const colors =
                b.kind === "break"
                  ? "bg-warning/10 border-warning/30 text-warning-foreground"
                  : b.kind === "focus"
                    ? "bg-accent/10 border-accent/30"
                    : b.kind === "buffer"
                      ? "bg-muted border-border"
                      : "bg-primary/10 border-primary/30";
              return (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full bg-background ring-4 ring-background">
                    <span className="h-2.5 w-2.5 rounded-full gradient-primary" />
                  </span>
                  <div className={`flex items-center gap-3 rounded-xl border p-3 ${colors}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{b.title}</div>
                      <div className="text-xs opacity-70">
                        {b.start} – {b.end} · {b.kind}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {tips.length > 0 && (
            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI tips
              </h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {tips.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
      <FloatingAssistant />
    </AppShell>
  );
}
