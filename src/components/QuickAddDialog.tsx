import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTasks";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";
import { AssigneePicker } from "./AssigneePicker";
import { useAuth } from "@/contexts/AuthContext";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; defaultPriority?: Priority; }

export function QuickAddDialog({ open, onOpenChange, defaultPriority = "medium" }: Props) {
  const create = useCreateTask();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>(defaultPriority);
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription(""); setPriority(defaultPriority); setDueDate("");
      setAssignees(user ? [user.id] : []);
    }
  }, [open, defaultPriority, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 5000) || null,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      assignees,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qa-title">Title</Label>
            <Input id="qa-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-desc">Description</Label>
            <Textarea id="qa-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-due">Due date</Label>
              <Input id="qa-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignees</Label>
            <AssigneePicker value={assignees} onChange={setAssignees} />
            <p className="text-[11px] text-muted-foreground">Defaults to you. Add teammates to share the task.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
