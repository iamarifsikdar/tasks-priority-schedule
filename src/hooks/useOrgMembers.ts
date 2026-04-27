import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface OrgMember {
  user_id: string;
  role: string;
  display_name: string | null;
}

export function useOrgMembers() {
  const { currentOrgId } = useOrg();
  return useQuery({
    enabled: !!currentOrgId,
    queryKey: ["org-members", currentOrgId],
    queryFn: async (): Promise<OrgMember[]> => {
      const { data: mems, error } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("org_id", currentOrgId!);
      if (error) throw error;
      const ids = (mems ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", ids);
      const pm = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));
      return (mems ?? []).map((m) => ({
        user_id: m.user_id, role: m.role, display_name: pm.get(m.user_id) ?? null,
      }));
    },
  });
}

export function useTaskAssignees(taskId: string | null) {
  return useQuery({
    enabled: !!taskId,
    queryKey: ["task-assignees", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_assignments")
        .select("assignee_id")
        .eq("task_id", taskId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.assignee_id);
    },
  });
}
