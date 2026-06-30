import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Mic, Upload, Sparkles, Users, Flag, Calendar as CalIcon, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { AIResponseCard } from "@/components/AIResponseCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { summarizeMeeting } from "@/lib/ai-actions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "Meeting Summarizer — Lumen" }] }),
  component: MeetingsPage,
});

type Result = Awaited<ReturnType<typeof summarizeMeeting>>;

function MeetingsPage() {
  const qc = useQueryClient();
  const run = useServerFn(summarizeMeeting);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<unknown | null>(null);

  const mut = useMutation({
    mutationFn: () => run({ data: { title: title || "Meeting", notes } }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) return toast.error("Please upload files under 2MB. For PDFs, paste the text.");
    const txt = await f.text();
    setNotes((n) => (n ? n + "\n\n" : "") + txt);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    toast.success("File loaded");
  };

  const toggleMic = () => {
    type SR = { new (): { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: { transcript: string }[][] }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void } };
    const w = window as unknown as { webkitSpeechRecognition?: SR; SpeechRecognition?: SR };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return toast.error("Speech-to-text not supported in this browser");
    if (listening) {
      (recogRef.current as { stop: () => void } | null)?.stop();
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const txt = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join(" ");
      setNotes((n) => (n ? n + " " : "") + txt);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold lg:text-4xl">Meeting Notes Summarizer</h1>
        <p className="mt-1 text-muted-foreground">
          Turn messy notes into clear summaries, decisions, and action items.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
          <div className="space-y-4">
            <div>
              <Label htmlFor="t">Meeting title</Label>
              <Input
                id="t"
                placeholder="Q4 Roadmap sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="n">Notes</Label>
                <div className="flex gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent">
                    <Upload className="h-3 w-3" /> Upload
                    <input type="file" className="hidden" accept=".txt,.md" onChange={onUpload} />
                  </label>
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${listening ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-background hover:bg-accent"}`}
                  >
                    <Mic className="h-3 w-3" /> {listening ? "Stop" : "Voice"}
                  </button>
                </div>
              </div>
              <Textarea
                id="n"
                rows={14}
                placeholder="Paste raw meeting notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (notes.trim().length < 20) return toast.error("Add some notes first (at least 20 chars)");
                mut.mutate();
              }}
              disabled={mut.isPending}
              className="w-full gap-2 gradient-primary text-primary-foreground"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Summarize
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {mut.isPending && (
            <Card className="border-border/60 p-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-2 text-sm">Reading and summarizing your notes…</p>
            </Card>
          )}
          {result && (
            <>
              <AIResponseCard
                title={title || "Meeting summary"}
                rawText={JSON.stringify(result, null, 2)}
                filename="meeting-summary.txt"
                onRegenerate={() => mut.mutate()}
              >
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </AIResponseCard>

              <div className="grid gap-3 md:grid-cols-2">
                <ResultList title="Decisions" icon={Flag} items={result.decisions} />
                <ResultList title="Highlights" icon={Sparkles} items={result.highlights} />
              </div>

              <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
                <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                  <AlertCircle className="h-4 w-4 text-primary" /> Action items
                </h3>
                <ul className="space-y-2">
                  {result.action_items.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                      <Badge variant="secondary" className="shrink-0">
                        {a.owner || "—"}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">{a.task}</div>
                        {a.due && <div className="text-xs text-muted-foreground">Due: {a.due}</div>}
                      </div>
                    </li>
                  ))}
                  {result.action_items.length === 0 && (
                    <li className="text-sm text-muted-foreground">No action items detected.</li>
                  )}
                </ul>
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
                  <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                    <CalIcon className="h-4 w-4 text-secondary" /> Deadlines
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {result.deadlines.map((d, i) => (
                      <li key={i} className="flex justify-between rounded bg-muted/50 px-3 py-2">
                        <span>{d.label}</span>
                        <span className="text-muted-foreground">{d.date}</span>
                      </li>
                    ))}
                    {result.deadlines.length === 0 && (
                      <li className="text-muted-foreground">None</li>
                    )}
                  </ul>
                </Card>
                <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
                  <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                    <Users className="h-4 w-4 text-accent" /> Participants
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.participants.map((p, i) => (
                      <Badge key={i} variant="outline">
                        {p}
                      </Badge>
                    ))}
                    {result.participants.length === 0 && (
                      <span className="text-sm text-muted-foreground">None detected</span>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
          {!result && !mut.isPending && (
            <Card className="border-2 border-dashed bg-transparent p-10 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8" />
              Your summary, action items, decisions and deadlines will appear here.
            </Card>
          )}
        </div>
      </div>
      <FloatingAssistant />
    </AppShell>
  );
}

function ResultList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}) {
  return (
    <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
      <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{it}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted-foreground">None</li>}
      </ul>
    </Card>
  );
}
