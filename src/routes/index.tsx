import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Mail, FileText, Calendar, BookOpen, Bot, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Lumen — Smart Workplace AI Assistant" },
      {
        name: "description",
        content:
          "AI workplace productivity platform. Generate emails, summarize meetings, plan your day, research topics, and chat with your assistant.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Mail, title: "Smart Email Generator", desc: "Draft polished emails in seconds with the right tone and length." },
  { icon: FileText, title: "Meeting Summarizer", desc: "Turn messy notes into clear summaries, decisions, and action items." },
  { icon: Calendar, title: "AI Task Planner", desc: "Get a focused, prioritized schedule for your day in one click." },
  { icon: BookOpen, title: "Research Assistant", desc: "Instant briefings on any workplace topic with findings and recommendations." },
  { icon: Bot, title: "AI Chatbot", desc: "Your always-on workplace assistant for ideas, drafts, and answers." },
  { icon: BarChart3, title: "Productivity Analytics", desc: "Track emails, meetings, tasks, and hours saved with AI." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-aurora shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold">Lumen</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button className="gradient-primary text-primary-foreground shadow-soft">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pb-20 pt-12 text-center lg:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-success" />
            AI-powered workplace assistant
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight lg:text-7xl">
            Less busywork.{" "}
            <span className="text-gradient">More deep work.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Lumen automates the small things — emails, summaries, planning, research — so you can
            focus on the work that matters.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2 gradient-primary text-primary-foreground shadow-elegant">
                Start free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                See it in action
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="container mx-auto grid grid-cols-1 gap-5 px-6 pb-24 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur transition hover:shadow-elegant"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary shadow-soft">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          );
        })}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <div className="container mx-auto max-w-3xl px-6">
          <p>
            <strong>Responsible AI:</strong> Lumen uses generative AI to assist with drafting,
            summarizing, planning, and research. AI responses may be inaccurate — review outputs
            before using them for important decisions, and avoid entering confidential information.
          </p>
        </div>
      </footer>
    </div>
  );
}
