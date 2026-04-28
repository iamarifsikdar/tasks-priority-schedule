import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type Log = {
  id: string; admin_email: string; target_org_name: string | null; target_org_id: string;
  action: "start" | "end"; reason: string | null; created_at: string;
};

export default function SuperAdminLogs() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("platform_admin_list_logs", { _limit: 200 });
      setRows((data ?? []) as Log[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impersonation Logs</h1>
        <p className="text-sm text-muted-foreground">Every super-admin "view as" event is recorded here.</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-2">
          {rows.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No activity yet.</Card>}
          {rows.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  <Badge variant={r.action === "start" ? "default" : "secondary"} className="text-[10px] mr-2">{r.action}</Badge>
                  {r.admin_email} → {r.target_org_name ?? r.target_org_id}
                </div>
                {r.reason && <div className="text-xs text-muted-foreground truncate">{r.reason}</div>}
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}