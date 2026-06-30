import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Lumen" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background bg-mesh p-6">
      <Card className="w-full max-w-md p-8">
        <div className="grid h-10 w-10 place-items-center rounded-xl gradient-aurora">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password for your Lumen account.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input
              id="pw"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
