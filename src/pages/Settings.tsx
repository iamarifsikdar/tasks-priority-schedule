import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Upload, Loader2 } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: tasks = [] } = useTasks();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.slice(0, 100) })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    downloadBlob(blob, `tasks-${new Date().toISOString().slice(0, 10)}.json`);
  }

  function exportCsv() {
    const header = ["title", "description", "priority", "status", "due_date", "created_at", "completed_at"];
    const rows = tasks.map((t) =>
      header.map((k) => csvEscape((t as any)[k] ?? "")).join(","),
    );
    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    downloadBlob(blob, `tasks-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      const valid = parsed
        .filter((t) => t && typeof t.title === "string")
        .map((t) => ({
          user_id: user.id,
          title: String(t.title).slice(0, 200),
          description: t.description ? String(t.description).slice(0, 2000) : null,
          priority: ["urgent", "high", "medium", "low"].includes(t.priority) ? t.priority : "medium",
          status: ["pending", "completed", "archived"].includes(t.status) ? t.status : "pending",
          due_date: t.due_date ?? null,
        }));
      if (valid.length === 0) throw new Error("No valid tasks");
      const { error } = await supabase.from("tasks").insert(valid);
      if (error) throw error;
      toast.success(`Imported ${valid.length} tasks`);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} />
        </div>
        <Button onClick={saveProfile} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save profile
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold">Appearance</h2>
        <div className="space-y-1.5 max-w-xs">
          <Label>Theme</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold">Data</h2>
        <p className="text-sm text-muted-foreground">Export or import your tasks.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportJson}><Download className="h-4 w-4 mr-2" /> Export JSON</Button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          <label className="inline-flex items-center cursor-pointer">
            <input type="file" accept="application/json" className="hidden" onChange={importJson} />
            <span className="inline-flex items-center justify-center px-3 h-9 rounded-md text-sm font-medium border border-border bg-background hover:bg-secondary">
              <Upload className="h-4 w-4 mr-2" /> Import JSON
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-semibold">Account</h2>
        <Button variant="destructive" onClick={signOut}>Sign out</Button>
      </section>
    </div>
  );
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}