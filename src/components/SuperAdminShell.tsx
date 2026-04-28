import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, Building2, Users, BarChart3, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { to: "/super-admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/super-admin/organizations", label: "Organizations", icon: Building2 },
  { to: "/super-admin/users", label: "Users", icon: Users },
  { to: "/super-admin/metrics", label: "Platform Metrics", icon: BarChart3 },
  { to: "/super-admin/logs", label: "Impersonation Logs", icon: History },
];

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { email, viewAsOrgId, endSession } = useSuperAdmin();

  const isActive = (to: string, end?: boolean) =>
    end ? loc.pathname === to : loc.pathname.startsWith(to);

  const handleSignOut = async () => {
    await endSession();
    await signOut();
    navigate("/super-admin/login");
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-priority-urgent/15 text-priority-urgent flex items-center justify-center">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight">Platform Admin</div>
            <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">{email}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.end);
            return (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}>
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        {viewAsOrgId && (
          <div className="bg-warning/10 border-b border-warning/30 text-warning-foreground px-4 py-2 text-xs flex items-center justify-between">
            <span><strong>Read-only:</strong> viewing organization data as super admin.</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/super-admin/organizations")}>
              Stop viewing
            </Button>
          </div>
        )}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}