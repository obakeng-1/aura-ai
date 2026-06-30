import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Bot, Loader2, Pin, Plus, Send, Sparkles, Trash2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { chatSend } from "@/lib/ai-actions.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chatbot")({
  head: () => ({ meta: [{ title: "AI Chatbot — Lumen" }] }),
  component: ChatPage,
});

const suggested = [
  "Write a resignation letter",
  "Explain SWOT analysis",
  "Summarize this report for me",
  "Generate 5 project ideas",
  "Create a meeting agenda",
  "Help prepare a presentation",
];

type Conversation = { id: string; title: string; pinned: boolean; updated_at: string };
type Msg = { id: string; role: string; parts: { type: string; text?: string }[]; created_at: string };

function ChatPage() {
  const qc = useQueryClient();
  const send = useServerFn(chatSend);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id,title,pinned,updated_at")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      return (data ?? []) as Conversation[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<Msg[]> => {
      if (!activeId) return [];
      const { data } = await supabase
        .from("chat_messages")
        .select("id,role,parts,created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Msg[];
    },
  });

  const mut = useMutation({
    mutationFn: (text: string) =>
      send({ data: { conversation_id: activeId ?? undefined, message: text } }),
    onSuccess: (r) => {
      setActiveId(r.conversation_id);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", r.conversation_id] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, mut.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId, mut.isPending]);

  const onSend = () => {
    const t = input.trim();
    if (!t || mut.isPending) return;
    setInput("");
    mut.mutate(t);
  };

  const pinConv = async (id: string, pinned: boolean) => {
    await supabase.from("chat_conversations").update({ pinned: !pinned }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["conversations"] });
  };

  const delConv = async (id: string) => {
    await supabase.from("chat_conversations").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Render optimistic user message during pending
  const pendingUserText = mut.isPending ? mut.variables : null;

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[260px_1fr]">
        {/* Conversation list */}
        <Card className="hidden flex-col border-border/60 bg-card/80 p-3 backdrop-blur lg:flex">
          <Button
            onClick={() => setActiveId(null)}
            className="mb-3 w-full gap-2 gradient-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New chat
          </Button>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {conversations.length === 0 && (
                <p className="px-2 text-xs text-muted-foreground">No chats yet.</p>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition",
                    activeId === c.id ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                  )}
                >
                  <button
                    onClick={() => setActiveId(c.id)}
                    className="flex-1 truncate text-left"
                  >
                    {c.title}
                  </button>
                  <button
                    onClick={() => pinConv(c.id, c.pinned)}
                    className={cn(
                      "opacity-0 transition group-hover:opacity-100",
                      c.pinned && "text-primary opacity-100",
                    )}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => delConv(c.id)}
                    className="opacity-0 transition hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat panel */}
        <Card className="flex min-h-0 flex-col overflow-hidden border-border/60 bg-card/80 backdrop-blur">
          <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-aurora">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-display font-semibold">Lumen Assistant</div>
              <div className="text-xs text-muted-foreground">Smart Workplace AI</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
            {messages.length === 0 && !pendingUserText && (
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-aurora shadow-glow">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold">How can I help?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  I draft emails, summarize meetings, plan your day, and more.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggested.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:shadow-soft"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((m) => {
                const text = m.parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("");
                return <MessageBubble key={m.id} role={m.role} text={text} />;
              })}
              {pendingUserText && <MessageBubble role="user" text={pendingUserText as string} />}
              {mut.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-3"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-aurora">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <Dot delay={0} />
                      <Dot delay={0.15} />
                      <Dot delay={0.3} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div className="border-t border-border/60 p-4">
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-background/60 p-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder="Ask anything — draft an email, summarize notes, plan my day..."
                className="min-h-10 resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              <Button
                onClick={onSend}
                disabled={!input.trim() || mut.isPending}
                size="icon"
                className="gradient-primary text-primary-foreground"
              >
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Lumen can make mistakes. Verify important information.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="h-2 w-2 rounded-full bg-foreground/60"
      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.8, repeat: Infinity, delay }}
    />
  );
}

function MessageBubble({ role, text }: { role: string; text: string }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
          isUser ? "bg-secondary text-secondary-foreground" : "gradient-aurora",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-white" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1.5">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
