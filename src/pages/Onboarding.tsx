import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
    + "-" + Math.random().toString(36).slice(2, 6);
}

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading, refresh, setCurrentOrgId } = useOrg();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgLoading && memberships.length > 0) navigate("/app", { replace: true });
  }, [orgLoading, memberships, navigate]);

  if (authLoading || orgLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) { navigate("/auth", { replace: true }); return null; }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("organizations")
      .insert({ name: name.trim().slice(0, 80), slug: slugify(name), owner_id: user!.id })
      .select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    if (data) setCurrentOrgId(data.id);
    toast.success("Organization created");
    navigate("/app");
  }

  async function joinOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("join_org_by_code", { _code: code.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    if (data) setCurrentOrgId(data as string);
    toast.success("Joined organization");
    navigate("/app");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl gradient-urgent text-priority-urgent-foreground"><Building2 className="h-6 w-6" /></div>
          <h1 className="text-2xl font-bold tracking-tight">Set up your workspace</h1>
          <p className="text-sm text-muted-foreground">Create a new organization or join one with a code.</p>
        </div>
        <Tabs defaultValue="create">
          <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="create">Create</TabsTrigger><TabsTrigger value="join">Join</TabsTrigger></TabsList>
          <TabsContent value="create">
            <form onSubmit={createOrg} className="space-y-4 mt-4">
              <div className="space-y-1.5"><Label>Organization name</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." maxLength={80} /></div>
              <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create organization</Button>
            </form>
          </TabsContent>
          <TabsContent value="join">
            <form onSubmit={joinOrg} className="space-y-4 mt-4">
              <div className="space-y-1.5"><Label>Invite code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc123def456" /></div>
              <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Join</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
