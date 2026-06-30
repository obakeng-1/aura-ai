import { motion } from "framer-motion";
import { Sparkles, Copy, Download, Pencil, Share2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
  rawText?: string;
  filename?: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
  loading?: boolean;
};

export function AIResponseCard({
  title = "AI Response",
  children,
  rawText,
  filename = "ai-response.txt",
  onEdit,
  onRegenerate,
  loading,
}: Props) {
  const copy = async () => {
    if (!rawText) return;
    await navigator.clipboard.writeText(rawText);
    toast.success("Copied to clipboard");
  };
  const download = () => {
    if (!rawText) return;
    const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const share = async () => {
    if (!rawText) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: rawText });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-elegant backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 gradient-aurora" />
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg gradient-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                ✨ AI Response
              </div>
              <div className="text-sm font-semibold">{title}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {rawText && (
              <>
                <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={download} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button variant="ghost" size="sm" onClick={share} className="hidden gap-1.5 sm:inline-flex">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </>
            )}
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Redo
              </Button>
            )}
          </div>
        </div>
        <div className="p-5">{children}</div>
      </Card>
    </motion.div>
  );
}
