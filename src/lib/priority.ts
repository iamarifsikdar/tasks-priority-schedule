import type { Database } from "@/integrations/supabase/types";

export type Priority = Database["public"]["Enums"]["task_priority"];
export type Status = Database["public"]["Enums"]["task_status"];

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

export const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  urgent:
    "bg-priority-urgent-bg text-priority-urgent border-priority-urgent-border priority-urgent-glow",
  high: "bg-priority-high-bg text-priority-high border-priority-high-border",
  medium: "bg-priority-medium-bg text-priority-medium border-priority-medium-border",
  low: "bg-priority-low-bg text-priority-low border-priority-low-border",
};

export const PRIORITY_DOT_CLASSES: Record<Priority, string> = {
  urgent: "bg-priority-urgent",
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

export function sortByPriorityThenNewest<T extends { priority: Priority; created_at: string }>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const dp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (dp !== 0) return dp;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export const WEEKDAYS = [
  { value: 0, label: "Sun", full: "Sunday" },
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
];