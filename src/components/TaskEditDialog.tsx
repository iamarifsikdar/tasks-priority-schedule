import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateTask, type Task } from "@/hooks/useTasks";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";

interface Props {
  task: Task;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TaskEditDialog({ task, open, onOpenChange }: Props) {
  const update = useUpdateTask();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : "");

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setNotes(task.notes ?? "");
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
    }
  }, [open, task]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await update.mutateAsync({
      id: task.id,
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 2000) || null,
      notes: notes.trim().slice(0, 2000) || null,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ed-title">Title</Label>
            <Input id="ed-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-desc">Description</Label>
            <Textarea id="ed-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-due">Due date</Label>
              <Input id="ed-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-notes">Notes</Label>
            <Textarea id="ed-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Private notes (optional)" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}