import { useMemo, useState } from "react";
import { Search, Filter, ListChecks, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "./TaskCard";
import { EmptyState } from "./EmptyState";
import { sortByPriorityThenNewest, PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";
import { useBulkDelete, useBulkUpdate, type Task } from "@/hooks/useTasks";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  defaultStatus?: "all" | "pending" | "completed" | "archived";
  view?: "list" | "kanban";
  onViewChange?: (v: "list" | "kanban") => void;
}

export function TaskList({ tasks, defaultStatus = "all" }: Props) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"list" | "kanban">("list");

  const bulkUpdate = useBulkUpdate();
  const bulkDelete = useBulkDelete();

  const filtered = useMemo(() => {
    let out = tasks;
    if (statusFilter !== "all") out = out.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") out = out.filter((t) => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }
    return sortByPriorityThenNewest(out);
  }, [tasks, search, priorityFilter, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectedIds = Array.from(selected);
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as Priority | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden md:flex border border-border rounded-md p-0.5 bg-card">
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded",
              view === "list" ? "bg-secondary" : "text-muted-foreground",
            )}
          >List</button>
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded",
              view === "kanban" ? "bg-secondary" : "text-muted-foreground",
            )}
          >Kanban</button>
        </div>
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value={statusFilter} className="mt-4">
          {/* Bulk action bar */}
          {hasSelection && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 animate-fade-in">
              <ListChecks className="h-4 w-4" />
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    bulkUpdate.mutate({
                      ids: selectedIds,
                      patch: { status: "completed", completed_at: new Date().toISOString() },
                    });
                    setSelected(new Set());
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Mark done
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Delete ${selectedIds.length} tasks?`)) {
                      bulkDelete.mutate(selectedIds);
                      setSelected(new Set());
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="h-10 w-10" />}
              title="No tasks found"
              description={search ? "Try a different search." : "Create your first task to get started."}
            />
          ) : view === "kanban" ? (
            <KanbanView tasks={filtered} selected={selected} onToggleSelect={toggleSelect} />
          ) : (
            <div className="space-y-2">
              {filtered.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={selected.has(task.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KanbanView({
  tasks,
  selected,
  onToggleSelect,
}: {
  tasks: Task[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const cols: Record<Priority, Task[]> = { urgent: [], high: [], medium: [], low: [] };
  for (const t of tasks) cols[t.priority].push(t);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {(Object.keys(cols) as Priority[]).map((p) => (
        <div key={p} className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {PRIORITY_LABELS[p]}
            </h3>
            <span className="text-xs text-muted-foreground">{cols[p].length}</span>
          </div>
          <div className="space-y-2 min-h-[100px] rounded-lg bg-secondary/40 p-2">
            {cols[p].map((t) => (
              <TaskCard key={t.id} task={t} selected={selected.has(t.id)} onToggleSelect={onToggleSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}