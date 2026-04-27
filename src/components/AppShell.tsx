import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckSquare, LayoutDashboard, ListTodo, Settings, History, LogOut, Plus, Menu, X, Moon, Sun, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/tasks", label: "All Tasks", icon: ListTodo },
  { to: "/app/tasks/pending", label: "Pending", icon: CheckSquare },
  { to: "/app/tasks/completed", label: "Completed", icon: CheckSquare },
  { to: "/app/team", label: "Team", icon: Users },
  { to: "/app/automation", label: "Automation", icon: Sparkles },
  { to: "/app/logs", label: "Activity", icon: History },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, resolved, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useKeyboardShortcuts({
    onQuickAdd: () => setQuickAddOpen(true),
    onGoHome: () => navigate("/app"),
    onGoTasks: () => navigate("/app/tasks"),
  });

  const isActive = (to: string, end?: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  const initials = (user?.email ?? "U")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg gradient-urgent flex items-center justify-center text-priority-urgent-foreground font-bold text-sm">
            T
          </div>
          <div className="font-semibold text-sm tracking-tight">Task Scheduler</div>
        </div>

        <div className="px-3 py-4">
          <Button
            onClick={() => setQuickAddOpen(true)}
            className="w-full justify-start gap-2 shadow-card"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Quick add task
            <kbd className="ml-auto text-[10px] font-mono opacity-60">⌘K</kbd>
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.end);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="text-xs font-medium truncate">{user?.email}</div>
                  <div className="text-[11px] text-muted-foreground">Account</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              >
                {resolved === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" /> Light mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" /> Dark mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg gradient-urgent flex items-center justify-center text-priority-urgent-foreground font-bold text-sm">T</div>
                <span className="font-semibold text-sm">Task Scheduler</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to, item.end);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm">Task Scheduler</span>
          <Button variant="ghost" size="icon" onClick={() => setQuickAddOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}