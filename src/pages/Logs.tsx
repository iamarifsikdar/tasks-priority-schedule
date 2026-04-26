import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Mail, Webhook } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

type Log = { id: string; type: "email" | "webhook"; status: string; error_message: string | null; task_count: number; triggered_by: string; sent_at: string; };

export default function Logs() {
  const { currentOrgId } = useOrg();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrgId) { setLoading(false); return; }
    supabase.from("automation_logs")
      .select("id, type, status, error_message, task_count, triggered_by, sent_at")
      .eq("org_id", currentOrgId)
      .order("sent_at", { ascending: false }).limit(100)
      .then(({ data }) => { setLogs((data ?? []) as Log[]); setLoading(false); });
  }, [currentOrgId]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">Recent email and webhook deliveries.</p>
      </div>
      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : logs.length === 0 ? <EmptyState title="No activity yet" description="Send a test email or webhook to see logs here." />
        : <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", l.type === "email" ? "bg-priority-urgent-bg text-priority-urgent" : "bg-secondary")}>
                  {l.type === "email" ? <Mail className="h-4 w-4" /> : <Webhook className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium capitalize">{l.type} · {l.task_count} task{l.task_count === 1 ? "" : "s"}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(l.sent_at), "PPp")} · {l.triggered_by}</div>
                  {l.error_message && <div className="text-xs text-destructive mt-0.5 truncate">{l.error_message}</div>}
                </div>
                <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase", l.status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{l.status}</span>
              </div>
            ))}
          </div>}
    </div>
  );
}
