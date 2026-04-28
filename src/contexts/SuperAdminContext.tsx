import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

const LS_TOKEN = "tps:sa_session";

interface SuperAdminCtx {
  loading: boolean;
  isAdmin: boolean;
  totpEnrolled: boolean;
  email: string | null;
  sessionToken: string | null;
  viewAsOrgId: string | null;
  setSessionToken: (t: string | null) => void;
  setViewAsOrgId: (id: string | null) => void;
  refresh: () => Promise<void>;
  endSession: () => Promise<void>;
}

const Ctx = createContext<SuperAdminCtx | undefined>(undefined);

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [totpEnrolled, setTotpEnrolled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sessionToken, setSessionTokenState] = useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [viewAsOrgId, setViewAsOrgIdState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsAdmin(false); setTotpEnrolled(false); setEmail(null); setLoading(false); return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("platform_admin_status");
    if (!error && data) {
      const d = data as { is_admin: boolean; totp_enrolled?: boolean; email?: string };
      setIsAdmin(!!d.is_admin);
      setTotpEnrolled(!!d.totp_enrolled);
      setEmail(d.email ?? null);
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const setSessionToken = (t: string | null) => {
    setSessionTokenState(t);
    if (t) localStorage.setItem(LS_TOKEN, t); else localStorage.removeItem(LS_TOKEN);
  };

  const setViewAsOrgId = (id: string | null) => setViewAsOrgIdState(id);

  const endSession = async () => {
    try { await supabase.rpc("platform_admin_end_session"); } catch { /* noop */ }
    setSessionToken(null);
    setViewAsOrgId(null);
  };

  return (
    <Ctx.Provider value={{
      loading, isAdmin, totpEnrolled, email,
      sessionToken, viewAsOrgId,
      setSessionToken, setViewAsOrgId, refresh, endSession,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSuperAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSuperAdmin must be used within SuperAdminProvider");
  return ctx;
}