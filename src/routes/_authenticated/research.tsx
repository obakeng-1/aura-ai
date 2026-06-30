import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, Sparkles, TrendingUp, ShieldAlert, Lightbulb, Link as LinkIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { AIResponseCard } from "@/components/AIResponseCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { researchTopic } from "@/lib/ai-actions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({ meta: [{ title: "Research Assistant — Lumen" }] }),
  component: ResearchPage,
});

type Result = Awaited<ReturnType<typeof researchTopic>>;

function ResearchPage() {
  const qc = useQueryClient();
  const run = useServerFn(researchTopic);
  const [topic, setTopic] = useState("");
  const [compare, setCompare] = useState("");
  const [useCompare, setUseCompare] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      run({ data: { topic, compare_with: useCompare && compare ? compare : undefined } }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suggestions = ["Digital Transformation", "OKRs vs KPIs", "Remote work best practices", "Generative AI in marketing"];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold lg:text-4xl">AI Research Assistant</h1>
        <p className="mt-1 text-muted-foreground">
          Get a structured briefing on any workplace topic — instantly.
        </p>
      </div>

      <Card className="mb-6 border-border/60 bg-card/80 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="e.g. Digital transformation in mid-sized firms"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && topic.trim() && mut.mutate()}
            className="flex-1"
          />
          <Button
            onClick={() => topic.trim() ? mut.mutate() : toast.error("Enter a topic")}
            disabled={mut.isPending}
            className="gap-2 gradient-primary text-primary-foreground"
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Research
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Switch id="cmp" checked={useCompare} onCheckedChange={setUseCompare} />
          <Label htmlFor="cmp" className="text-sm">Compare with another topic</Label>
        </div>
        {useCompare && (
          <Input
            className="mt-2"
            placeholder="Compare with..."
            value={compare}
            onChange={(e) => setCompare(e.target.value)}
          />
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setTopic(s)}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {mut.isPending && (
        <Card className="border-border/60 p-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          <p className="mt-2 text-sm">Researching {topic}…</p>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <AIResponseCard
            title={`Overview: ${topic}`}
            rawText={result.overview}
            filename={`research-${topic.slice(0, 30)}.txt`}
            onRegenerate={() => mut.mutate()}
          >
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{result.overview}</ReactMarkdown>
            </div>
          </AIResponseCard>

          <div className="grid gap-3 md:grid-cols-2">
            <KnowledgeCard title="Key findings" icon={TrendingUp} items={result.key_findings} color="text-primary" />
            <KnowledgeCard title="Recommendations" icon={Lightbulb} items={result.recommendations} color="text-accent" />
            <KnowledgeCard title="Advantages" icon={Sparkles} items={result.advantages} color="text-success" />
            <KnowledgeCard title="Challenges" icon={ShieldAlert} items={result.challenges} color="text-warning" />
          </div>

          <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
              <LinkIcon className="h-4 w-4 text-primary" /> References
            </h3>
            <ul className="space-y-2 text-sm">
              {result.refs.map((r, i) => (
                <li key={i} className="rounded-lg bg-muted/50 px-3 py-2">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.source}</div>
                </li>
              ))}
              {result.refs.length === 0 && (
                <li className="text-muted-foreground">No references suggested.</li>
              )}
            </ul>
          </Card>
        </div>
      )}

      {!result && !mut.isPending && (
        <Card className="border-2 border-dashed bg-transparent p-12 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-3 h-8 w-8" />
          Run a search to see your structured briefing here.
        </Card>
      )}

      <FloatingAssistant />
    </AppShell>
  );
}

function KnowledgeCard({
  title,
  icon: Icon,
  items,
  color,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  color: string;
}) {
  return (
    <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
      <h3 className={`mb-3 flex items-center gap-2 font-display font-semibold`}>
        <Icon className={`h-4 w-4 ${color}`} /> {title}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
