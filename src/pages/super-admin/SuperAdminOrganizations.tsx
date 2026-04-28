import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Search, Eye, Pause, Play, Trash2, Pencil } from "lucide-react";

type Org = {
  id: string; name: string; slug: string; owner_id: string; owner_email: string | null;
  suspended: boolean; member_count: number; task_count: number; created_at: string;
};

export default function SuperAdminOrganizations() {
  const { setViewAsOrgId } = useSuperAdmin();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createOwnerEmail, setCreateOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("super_admin_list_organizations");
    if (error) toast.error(error.message);
    setOrgs((data ?? []) as Org[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(s) || (o.owner_email ?? "").toLowerCase().includes(s));
  }, [orgs, q]);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("super_admin_create_organization", {
      _name: createName.trim(), _owner_email: createOwnerEmail.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Organization created");
    setCreateOpen(false); setCreateName(""); setCreateOwnerEmail("");
    void load();
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase.rpc("super_admin_update_organization", { _org_id: editing.id, _name: editName.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setEditing(null); void load();
  }

  async function toggleSuspended(o: Org) {
    const { error } = await supabase.rpc("super_admin_set_org_suspended", { _org_id: o.id, _suspended: !o.suspended });
    if (error) { toast.error(error.message); return; }
    toast.success(o.suspended ? "Reactivated" : "Suspended");
    void load();
  }

  async function deleteOrg(o: Org) {
    const { error } = await supabase.rpc("super_admin_delete_organization", { _org_id: o.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted"); void load();
  }

  async function viewAs(o: Org) {
    const { error } = await supabase.rpc("platform_admin_view_as", { _org_id: o.id, _reason: null });
    if (error) { toast.error(error.message); return; }
    setViewAsOrgId(o.id);
    toast.success(`Viewing ${o.name} (read-only)`);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">Manage all tenants on the platform.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New organization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create organization</DialogTitle></DialogHeader>
            <form onSubmit={createOrg} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Organization name</Label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} required maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label>Owner email (must already be a registered user)</Label>
                <Input type="email" value={createOwnerEmail} onChange={(e) => setCreateOwnerEmail(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-2.5 top-3 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search by name or owner email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No organizations.</Card>}
          {filtered.map((o) => (
            <Card key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold truncate">{o.name}</div>
                  {o.suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Owner: {o.owner_email ?? "—"} · {o.member_count} members · {o.task_count} tasks
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => viewAs(o)}><Eye className="h-4 w-4 mr-1" />View as</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(o); setEditName(o.name); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => toggleSuspended(o)}>
                  {o.suspended ? <><Play className="h-4 w-4 mr-1" />Reactivate</> : <><Pause className="h-4 w-4 mr-1" />Suspend</>}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {o.name}?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently removes the organization and all its tasks, announcements, members, and automations. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteOrg(o)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit organization</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}