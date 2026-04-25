import { cn } from "@/lib/utils";
import { PRIORITY_BADGE_CLASSES, PRIORITY_DOT_CLASSES, PRIORITY_LABELS, type Priority } from "@/lib/priority";

interface Props {
  priority: Priority;
  className?: string;
  size?: "sm" | "md";
}

export function PriorityBadge({ priority, className, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full border",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        "uppercase tracking-wider",
        PRIORITY_BADGE_CLASSES[priority],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT_CLASSES[priority])} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}