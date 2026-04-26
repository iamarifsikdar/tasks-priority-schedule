import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export interface OrgMembership {
  org_id: string;
  user_id: string;
  role: AppRole;
  organizations: { id: string; name: string; slug: string; invite_code: string; owner_id: string };
}

interface OrgContextValue {
  loading: boolean;
  memberships: OrgMembership[];
  currentOrgId: string | null;
  currentOrg: OrgMembership["organizations"] | null;
  role: AppRole | null;
  isOwner: boolean;
  isAdmin: boolean;       // owner OR admin
  isManager: boolean;     // owner OR admin OR team_manager
  setCurrentOrgId: (id: string) => void;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

const LS_KEY = "tps:current_org";

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(
    () => localStorage.getItem(LS_KEY),
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("organization_members")
      .select("org_id, user_id, role, organizations:org_id(id, name, slug, invite_code, owner_id)")
      .eq("user_id", user.id);
    if (!error && data) {
      const rows = (data as unknown as OrgMembership[]).filter((r) => r.organizations);
      setMemberships(rows);
      // Pick a current org: persisted -> first
      const persisted = localStorage.getItem(LS_KEY);
      const next =
        rows.find((r) => r.org_id === persisted)?.org_id ?? rows[0]?.org_id ?? null;
      setCurrentOrgIdState(next);
      if (next) localStorage.setItem(LS_KEY, next);
      else localStorage.removeItem(LS_KEY);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const setCurrentOrgId = (id: string) => {
    localStorage.setItem(LS_KEY, id);
    setCurrentOrgIdState(id);
  };

  const current = memberships.find((m) => m.org_id === currentOrgId) ?? null;
  const role = current?.role ?? null;

  const value: OrgContextValue = {
    loading,
    memberships,
    currentOrgId,
    currentOrg: current?.organizations ?? null,
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    isManager: role === "owner" || role === "admin" || role === "team_manager",
    setCurrentOrgId,
    refresh,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
