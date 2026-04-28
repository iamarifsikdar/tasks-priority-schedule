import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Building2, Users, ListTodo, Megaphone, Loader2, Activity } from "lucide-react";

type Metrics = {
  organizations_total: number; organizations_active: number; organizations_suspended: number;
  users_total: number; tasks_total: number; tasks_pending: number; announcements_total: number;
};

export default function SuperAdminOverview() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("super_admin_metrics");
    setM(data as Metrics);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">High-level health of the platform.</p>
      </div>
      {loading || !m ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={Building2} label="Organizations" value={m.organizations_total} sub={`${m.organizations_active} active`} />
          <Stat icon={Activity} label="Suspended orgs" value={m.organizations_suspended} />
          <Stat icon={Users} label="Users" value={m.users_total} />
          <Stat icon={ListTodo} label="Tasks" value={m.tasks_total} sub={`${m.tasks_pending} pending`} />
          <Stat icon={Megaphone} label="Announcements" value={m.announcements_total} />
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value.toLocaleString()}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}