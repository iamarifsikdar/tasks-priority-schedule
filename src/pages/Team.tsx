import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, type AppRole } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Member { id: string; user_id: string; role: AppRole; profile?: { display_name: string | null } | null; }

const ROLES: AppRole[] = ["owner", "admin", "team_manager", "member"];

export default function Team() {
  const { currentOrg, currentOrgId, isAdmin, role, refresh } = useOrg();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newInvite, setNewInvite] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<AppRole>("member");

  async function load() {
    if (!currentOrgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("organization_members")
      .select("id, user_id, role")
      .eq("org_id", currentOrgId);
    if (data) {
      const ids = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", ids);
      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      setMembers(data.map((m) => ({ ...m, profile: profileMap.get(m.user_id) ?? null })));
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [currentOrgId]);

  async function changeRole(memberId: string, newRole: AppRole) {
    const { error } = await supabase.from("organization_members").update({ role: newRole }).eq("id", memberId);
    if (error) toast.error(error.message); else { toast.success("Role updated"); load(); }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
    if (error) toast.error(error.message); else { toast.success("Member removed"); load(); }
  }

  async function createInvite() {
    if (!currentOrgId || !user) return;
    const { data, error } = await supabase.from("invites")
      .insert({ org_id: currentOrgId, role: inviteRole, created_by: user.id })
      .select("token").single();
    if (error) { toast.error(error.message); return; }
    setNewInvite(data.token);
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }

  function copyOrgCode() {
    if (!currentOrg) return;
    navigator.clipboard.writeText(currentOrg.invite_code);
    toast.success("Org code copied");
  }

  if (!currentOrg) return <div className="p-10 text-sm text-muted-foreground">No organization selected.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">{currentOrg.name} · {members.length} member{members.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyOrgCode}><Copy className="h-4 w-4 mr-2" />Org code</Button>
          {isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={(v) => { setInviteOpen(v); if (!v) setNewInvite(null); }}>
              <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-2" />Invite</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite a member</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createInvite} className="w-full">Generate invite link</Button>
                  {newInvite && (
                    <div className="space-y-1.5">
                      <Label>Share this link</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={`${window.location.origin}/invite/${newInvite}`} />
                        <Button variant="outline" onClick={() => copyInviteLink(newInvite)}><Copy className="h-4 w-4" /></Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Expires in 14 days.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                {(m.profile?.display_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.profile?.display_name ?? "Unnamed"}{m.user_id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</div>
                <div className="text-xs text-muted-foreground">{m.role}</div>
              </div>
              {isAdmin && m.role !== "owner" && (
                <>
                  <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as AppRole)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
