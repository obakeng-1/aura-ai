import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Lumen" }] }),
  component: SettingsPage,
});

const tones = ["formal", "friendly", "professional", "persuasive", "apologetic", "grateful", "urgent"];

function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [defaultTone, setDefaultTone] = useState("professional");
  const [notif, setNotif] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.full_name ?? "");
  }, [profile]);
  useEffect(() => {
    if (settings) {
      setLanguage(settings.language);
      setDefaultTone(settings.default_tone);
      setNotif(settings.notifications_enabled);
    }
  }, [settings]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const [p, s] = await Promise.all([
      supabase.from("profiles").update({ full_name: name }).eq("id", user.id),
      supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            language,
            default_tone: defaultTone as never,
            notifications_enabled: notif,
          },
          { onConflict: "user_id" },
        ),
    ]);
    setSaving(false);
    if (p.error || s.error) return toast.error("Could not save");
    toast.success("Settings saved");
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold lg:text-4xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">Customize your Lumen workspace.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="ai">AI preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
            <Label>Theme</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${theme === t ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1.5 max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-border/60 bg-card/80 p-6 backdrop-blur">
            <Label>Default email tone</Label>
            <Select value={defaultTone} onValueChange={setDefaultTone}>
              <SelectTrigger className="mt-1.5 max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tones.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="flex items-center justify-between border-border/60 bg-card/80 p-6 backdrop-blur">
            <div>
              <Label className="text-base">In-app notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when AI tasks complete.
              </p>
            </div>
            <Switch checked={notif} onCheckedChange={setNotif} />
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-warning/30 bg-warning/5 p-6">
            <div className="flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Responsible AI Notice</p>
                <p className="text-muted-foreground">
                  Lumen uses generative AI to assist with drafting content, summarizing
                  information, planning tasks, and answering questions. AI-generated responses may
                  occasionally be inaccurate, incomplete, or outdated. Review and verify all outputs
                  before using them for business, legal, financial, or other important decisions.
                  Avoid entering confidential or sensitive information unless appropriate
                  organizational security and privacy policies are in place.
                </p>
              </div>
            </div>
          </Card>
          <Card className="mt-4 border-destructive/30 bg-destructive/5 p-6">
            <p className="font-semibold">Danger zone</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign out of all sessions or contact support to delete your account.
            </p>
            <Button
              variant="destructive"
              className="mt-3"
              onClick={async () => {
                await supabase.auth.signOut({ scope: "global" });
                window.location.href = "/auth";
              }}
            >
              Sign out everywhere
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2 gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
      <FloatingAssistant />
    </AppShell>
  );
}
