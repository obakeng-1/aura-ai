import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Languages, Wand2, CheckCheck, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { AIResponseCard } from "@/components/AIResponseCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateEmail, rewriteEmail } from "@/lib/ai-actions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/email")({
  head: () => ({ meta: [{ title: "Email Generator — Lumen" }] }),
  component: EmailPage,
});

const tones = ["formal", "friendly", "professional", "persuasive", "apologetic", "grateful", "urgent"];

function EmailPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateEmail);
  const rewrite = useServerFn(rewriteEmail);

  const [form, setForm] = useState({
    recipient: "",
    subject: "",
    purpose: "",
    context: "",
    tone: "professional",
    length: "medium" as "short" | "medium" | "long",
  });
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);

  const gen = useMutation({
    mutationFn: () => generate({ data: form }),
    onSuccess: (r) => {
      setResult({ subject: r.subject, body: r.body });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rw = useMutation({
    mutationFn: (action: "rewrite" | "grammar" | "translate") =>
      rewrite({ data: { body: result?.body || "", action, language: "Spanish" } }),
    onSuccess: (r) => setResult((prev) => (prev ? { ...prev, body: r.body } : prev)),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold lg:text-4xl">Smart Email Generator</h1>
        <p className="mt-1 text-muted-foreground">
          Generate professional, on-tone emails in seconds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
          <h2 className="mb-4 font-display text-lg font-semibold">Inputs</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="r">Recipient</Label>
              <Input
                id="r"
                placeholder="John Smith, CTO"
                value={form.recipient}
                onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="s">Subject (optional)</Label>
              <Input
                id="s"
                placeholder="Project update"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="p">Purpose *</Label>
              <Input
                id="p"
                placeholder="Update the team on Q4 launch timeline"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="c">Context / key points</Label>
              <Textarea
                id="c"
                rows={4}
                placeholder="Launch slipped 2 weeks. Need extra QA. Want a call Friday."
                value={form.context}
                onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tone</Label>
                <Select value={form.tone} onValueChange={(v) => setForm((f) => ({ ...f, tone: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length</Label>
                <Select
                  value={form.length}
                  onValueChange={(v) => setForm((f) => ({ ...f, length: v as typeof f.length }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!form.purpose.trim()) return toast.error("Tell us the purpose of your email");
                gen.mutate();
              }}
              disabled={gen.isPending}
              className="w-full gap-2 gradient-primary text-primary-foreground shadow-soft"
            >
              {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Generate email
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {gen.isPending && !result && (
            <Card className="border-border/60 bg-card/80 p-8 backdrop-blur">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Drafting your email…</p>
              </div>
            </Card>
          )}
          {result && (
            <AIResponseCard
              title={result.subject}
              rawText={`Subject: ${result.subject}\n\n${result.body}`}
              filename={`email-${Date.now()}.txt`}
              onRegenerate={() => gen.mutate()}
              loading={gen.isPending}
            >
              <div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
                <div className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                  <span className="font-semibold">Subject:</span> {result.subject}
                </div>
                <ReactMarkdown>{result.body}</ReactMarkdown>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rw.mutate("rewrite")}
                  disabled={rw.isPending}
                  className="gap-1.5"
                >
                  <Wand2 className="h-3.5 w-3.5" /> AI Rewrite
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rw.mutate("grammar")}
                  disabled={rw.isPending}
                  className="gap-1.5"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Fix grammar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rw.mutate("translate")}
                  disabled={rw.isPending}
                  className="gap-1.5"
                >
                  <Languages className="h-3.5 w-3.5" /> Translate (ES)
                </Button>
              </div>
            </AIResponseCard>
          )}
          {!result && !gen.isPending && (
            <Card className="border-2 border-dashed border-border bg-transparent p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Your generated email will appear here. Try it — the AI picks tone, structure, and a
                clear sign-off.
              </p>
            </Card>
          )}
        </div>
      </div>
      <FloatingAssistant />
    </AppShell>
  );
}
