import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { isPast, isToday, startOfDay } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Flame, Plus } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { sortByPriorityThenNewest, PRIORITIES, PRIORITY_LABELS } from "@/lib/priority";
import { useState } from "react";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: tasks = [], isLoading } = useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quickAdd, setQuickAdd] = useState(false);

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending");
    const today = startOfDay(new Date()).getTime();
    return {
      totalPending: pending.length,
      completedToday: tasks.filter(
        (t) => t.status === "completed" && t.completed_at && new Date(t.completed_at).getTime() >= today,
      ).length,
      overdue: pending.filter(
        (t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)),
      ).length,
      urgent: pending.filter((t) => t.priority === "urgent").length,
      breakdown: PRIORITIES.map((p) => ({
        priority: p,
        count: pending.filter((t) => t.priority === p).length,
      })),
    };
  }, [tasks]);

  const topPending = useMemo(
    () => sortByPriorityThenNewest(tasks.filter((t) => t.status === "pending")).slice(0, 6),
    [tasks],
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Here's your priority focus
          </h1>
        </div>
        <Button onClick={() => setQuickAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.totalPending} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Completed today" value={stats.completedToday} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Overdue" value={stats.overdue} icon={<AlertTriangle className="h-4 w-4" />} tone="destructive" />
        <StatCard label="Urgent" value={stats.urgent} icon={<Flame className="h-4 w-4" />} tone="urgent" />
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold mb-4">Pending by priority</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.breakdown.map((b) => (
            <div key={b.priority} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {PRIORITY_LABELS[b.priority]}
              </span>
              <span className="text-lg font-semibold">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top pending tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Top priorities</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/tasks")}>View all →</Button>
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : topPending.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-10 w-10" />}
            title="You're all caught up"
            description="No pending tasks. Add one to keep the momentum going."
            action={<Button onClick={() => setQuickAdd(true)}><Plus className="h-4 w-4 mr-2" />Add task</Button>}
          />
        ) : (
          <div className="space-y-2">
            {topPending.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        )}
      </div>

      <QuickAddDialog open={quickAdd} onOpenChange={setQuickAdd} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "success" | "destructive" | "urgent";
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 shadow-card",
      tone === "urgent" && "border-priority-urgent-border bg-priority-urgent-bg/40",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <span className={cn(
          "text-muted-foreground",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
          tone === "urgent" && "text-priority-urgent",
        )}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}