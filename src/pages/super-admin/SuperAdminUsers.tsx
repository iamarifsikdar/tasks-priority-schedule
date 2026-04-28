import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

type Row = {
  user_id: string; email: string; display_name: string | null; org_count: number;
  is_platform_admin: boolean; created_at: string;
};

export default function SuperAdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("super_admin_list_users");
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(s) || (r.display_name ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">All registered users on the platform.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-2.5 top-3 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((r) => (
            <Card key={r.user_id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.display_name ?? r.email.split("@")[0]}</div>
                <div className="text-xs text-muted-foreground truncate">{r.email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.is_platform_admin && <Badge variant="default" className="text-[10px]">Platform Admin</Badge>}
                <Badge variant="secondary" className="text-[10px]">{r.org_count} org{r.org_count === 1 ? "" : "s"}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}