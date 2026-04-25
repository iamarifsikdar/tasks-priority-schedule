import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { Calendar, MoreHorizontal, Copy, Pencil, Trash2, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityBadge } from "./PriorityBadge";
import { cn } from "@/lib/utils";
import { useDeleteTask, useUpdateTask, useCreateTask, type Task } from "@/hooks/useTasks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TaskEditDialog } from "./TaskEditDialog";

interface Props {
  task: Task;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function TaskCard({ task, selected, onToggleSelect }: Props) {
  const update = useUpdateTask();
  const del = useDeleteTask();
  const create = useCreateTask();
  const [editOpen, setEditOpen] = useState(false);

  const isUrgent = task.priority === "urgent" && task.status === "pending";
  const isCompleted = task.status === "completed";
  const overdue =
    task.due_date && task.status === "pending" && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

  const toggleDone = () => {
    update.mutate({
      id: task.id,
      status: isCompleted ? "pending" : "completed",
      completed_at: isCompleted ? null : new Date().toISOString(),
    });
  };

  const duplicate = () => {
    create.mutate({
      title: `${task.title} (copy)`,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date,
      notes: task.notes,
    });
  };

  return (
    <>
      <div
        className={cn(
          "group rounded-xl border bg-card text-card-foreground shadow-card transition-all hover:shadow-elevated p-4 animate-fade-in",
          isUrgent && "ring-1 ring-priority-urgent-border",
          isCompleted && "opacity-60",
          selected && "ring-2 ring-primary",
        )}
      >
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(task.id)}
              className="mt-1"
              aria-label="Select task"
            />
          )}
          <button
            onClick={toggleDone}
            aria-label={isCompleted ? "Mark pending" : "Mark done"}
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
              isCompleted
                ? "bg-success border-success text-success-foreground"
                : "border-border hover:border-primary",
            )}
          >
            {isCompleted && <Check className="h-3 w-3" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  "font-medium text-sm leading-snug",
                  isCompleted && "line-through text-muted-foreground",
                )}
              >
                {task.title}
              </h3>
              <PriorityBadge priority={task.priority} />
            </div>

            {task.description && (
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
              {task.due_date && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    overdue && "text-destructive font-medium",
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), "MMM d")}
                  {overdue && " · overdue"}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                Created {format(new Date(task.created_at), "MMM d")}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={duplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              {isCompleted ? (
                <DropdownMenuItem onClick={toggleDone}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reopen
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={toggleDone}>
                  <Check className="h-4 w-4 mr-2" /> Mark done
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  update.mutate({
                    id: task.id,
                    status: task.status === "archived" ? "pending" : "archived",
                  })
                }
              >
                {task.status === "archived" ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm("Delete this task?")) del.mutate(task.id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <TaskEditDialog task={task} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}