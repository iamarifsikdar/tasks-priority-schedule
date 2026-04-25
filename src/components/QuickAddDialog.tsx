import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTasks";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]),
  due_date: z.string().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultPriority?: Priority;
}

export function QuickAddDialog({ open, onOpenChange, defaultPriority = "medium" }: Props) {
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>(defaultPriority);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setPriority(defaultPriority);
      setDueDate("");
      setError(null);
    }
  }, [open, defaultPriority]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ title, description, priority, due_date: dueDate });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    await create.mutateAsync({
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      due_date: parsed.data.due_date ? new Date(parsed.data.due_date).toISOString() : null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qa-title">Title</Label>
            <Input
              id="qa-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-desc">Description</Label>
            <Textarea
              id="qa-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={3}
              maxLength={2000}
            />
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
              <Label htmlFor="qa-due">Due date</Label>
              <Input id="qa-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}