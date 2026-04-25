import { useTasks } from "@/hooks/useTasks";
import { TaskList } from "@/components/TaskList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { QuickAddDialog } from "@/components/QuickAddDialog";

interface Props {
  defaultStatus?: "all" | "pending" | "completed" | "archived";
  title?: string;
}

export default function Tasks({ defaultStatus = "all", title = "All tasks" }: Props) {
  const { data: tasks = [], isLoading } = useTasks();
  const [quickAdd, setQuickAdd] = useState(false);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} total
          </p>
        </div>
        <Button onClick={() => setQuickAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <TaskList tasks={tasks} defaultStatus={defaultStatus} />
      )}
      <QuickAddDialog open={quickAdd} onOpenChange={setQuickAdd} />
    </div>
  );
}