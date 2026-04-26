import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function InviteAccept() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const { refresh, setCurrentOrgId } = useOrg();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ org_name: string; status: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("lookup_invite", { _token: token }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setInfo({ org_name: row.org_name, status: row.status });
    });
  }, [token]);

  async function accept() {
    if (!token) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_invite", { _token: token });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    if (data) setCurrentOrgId(data as string);
    toast.success("Joined organization");
    navigate("/app");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 shadow-card text-center space-y-4">
        <h1 className="text-xl font-semibold">You've been invited</h1>
        {info ? <p className="text-sm text-muted-foreground">Join <span className="font-medium text-foreground">{info.org_name}</span></p>
          : <p className="text-sm text-muted-foreground">Loading invite…</p>}
        {!user ? (
          <Link to={`/auth?redirect=/invite/${token}`}><Button className="w-full">Sign in to accept</Button></Link>
        ) : (
          <Button className="w-full" onClick={accept} disabled={busy || info?.status !== "pending"}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Accept invitation
          </Button>
        )}
      </div>
    </div>
  );
}
