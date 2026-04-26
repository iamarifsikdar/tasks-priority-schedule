import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.slice(0, 100) }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </div>
      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div className="space-y-1.5"><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} /></div>
        <Button onClick={saveProfile} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save profile</Button>
      </section>
      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold">Appearance</h2>
        <div className="space-y-1.5 max-w-xs">
          <Label>Theme</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem><SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold">Account</h2>
        <Button variant="destructive" onClick={signOut}>Sign out</Button>
      </section>
    </div>
  );
}
