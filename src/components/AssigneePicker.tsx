import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

export function AssigneePicker({ value, onChange }: Props) {
  const { data: members = [] } = useOrgMembers();
  const { user } = useAuth();

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const assignSelf = () => {
    if (user && !value.includes(user.id)) onChange([...value, user.id]);
  };

  const labelFor = (m: { user_id: string; display_name: string | null }) =>
    (m.display_name?.trim() || (m.user_id === user?.id ? "You" : "Unnamed")) +
    (m.user_id === user?.id && m.display_name ? " (you)" : "");

  const summary =
    value.length === 0
      ? "Assign to me (default)"
      : value.length === 1
        ? labelFor(members.find((m) => m.user_id === value[0]) ?? { user_id: value[0], display_name: null })
        : `${value.length} assignees`;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="flex-1 justify-start font-normal">
            <Users className="h-4 w-4 mr-2" />
            <span className="truncate">{summary}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="max-h-72 overflow-y-auto py-1">
            {members.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No members</div>
            )}
            {members.map((m) => {
              const checked = value.includes(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggle(m.user_id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary text-left",
                    checked && "bg-secondary/60",
                  )}
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {(m.display_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{labelFor(m)}</div>
                    <div className="text-[10px] text-muted-foreground">{m.role}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-2 flex justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={assignSelf}>
              + Assign me
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
