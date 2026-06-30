import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Mail, FileText, BookOpen, Bot, Calendar } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Lumen" }] }),
  component: NotificationsPage,
});

const iconMap = {
  email: Mail,
  meeting: FileText,
  research: BookOpen,
  task: Calendar,
  chat: Bot,
  info: Bell,
} as const;

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold lg:text-4xl">Notifications</h1>
          <p className="mt-1 text-muted-foreground">All your AI activity in one place.</p>
        </div>
        <Button variant="outline" onClick={markAll} className="gap-2">
          <Check className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <Card className="divide-y divide-border/60 border-border/60 bg-card/80 backdrop-blur">
        {items.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-3 h-8 w-8" />
            You're all caught up.
          </div>
        )}
        {items.map((n) => {
          const Icon = iconMap[n.kind as keyof typeof iconMap] ?? Bell;
          return (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 ${n.read ? "opacity-70" : "bg-primary/[0.03]"}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </Card>
      <FloatingAssistant />
    </AppShell>
  );
}
