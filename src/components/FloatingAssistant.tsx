import { useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X } from "lucide-react";
import { useState } from "react";

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();
  if (loc.pathname.startsWith("/chatbot")) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI assistant"
        className="fixed bottom-20 right-5 z-40 grid h-14 w-14 place-items-center rounded-full gradient-aurora shadow-glow lg:bottom-6 lg:right-8"
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Bot className="h-6 w-6 text-white" />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            className="fixed bottom-36 right-5 z-40 w-72 rounded-2xl border border-border/60 bg-card p-4 shadow-elegant lg:bottom-24 lg:right-8"
          >
            <div className="text-sm font-semibold">Need a hand?</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Open the AI chatbot to draft, summarize, or plan anything.
            </p>
            <button
              onClick={() => {
                setOpen(false);
                navigate({ to: "/chatbot" });
              }}
              className="mt-3 w-full rounded-lg gradient-primary py-2 text-xs font-semibold text-primary-foreground"
            >
              Open chatbot
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
