import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Zap, Users, Webhook, ArrowRight, LayoutDashboard } from "lucide-react";

export default function Landing() {
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-urgent flex items-center justify-center text-priority-urgent-foreground font-bold text-sm">T</div>
            <span className="font-semibold tracking-tight">Task Priority Scheduler</span>
          </div>
          <div className="flex gap-2">
            {loading ? null : user ? (
              <Link to="/app"><Button size="sm" className="gap-2"><LayoutDashboard className="h-4 w-4" />Go to dashboard</Button></Link>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
                <Link to="/auth"><Button size="sm">Get started</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-20 lg:py-28 text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full border border-priority-urgent-border bg-priority-urgent-bg px-3 py-1 text-xs font-medium text-priority-urgent">
          <Sparkles className="h-3 w-3" /> Multi-tenant team productivity
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          Prioritize what matters.<br />
          <span className="bg-gradient-to-r from-priority-urgent to-warning bg-clip-text text-transparent">Together.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Organizations, roles, assignments, announcements, and scheduled email & webhook digests — all in one premium SaaS.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {user ? (
            <Link to="/app"><Button size="lg" className="gap-2">Go to dashboard <ArrowRight className="h-4 w-4" /></Button></Link>
          ) : (
            <Link to="/auth"><Button size="lg" className="gap-2">Start free <ArrowRight className="h-4 w-4" /></Button></Link>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        <Feature icon={<Users className="h-5 w-5" />} title="Teams & roles" description="Owner, Admin, Team Manager, Member — invites, codes, role-based access." />
        <Feature icon={<Zap className="h-5 w-5" />} title="Priority-first tasks" description="Assign to teammates, sort by urgency, track progress." />
        <Feature icon={<Webhook className="h-5 w-5" />} title="Email & webhook automation" description="Scheduled digests, Pabbly/Zapier/Make integrations." />
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Task Priority Scheduler</footer>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-shadow">
      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-foreground mb-4">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
    </div>
  );
}
