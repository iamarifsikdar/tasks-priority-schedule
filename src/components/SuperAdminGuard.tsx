import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { Loader2 } from "lucide-react";

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { loading, isAdmin, sessionToken } = useSuperAdmin();
  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <Navigate to="/super-admin/login" replace />;
  if (!isAdmin) return <Navigate to="/super-admin/login" replace />;
  if (!sessionToken) return <Navigate to="/super-admin/login" replace />;
  return <>{children}</>;
}