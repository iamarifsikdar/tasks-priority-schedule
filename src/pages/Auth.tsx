import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const params = new URLSearchParams(location.search);
  const isReset = params.get("mode") === "reset";
  const redirect = params.get("redirect") ?? "/app";

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (user && !isReset) return <Navigate to={redirect} replace />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Note: supabase-js v2 persists by default; "Remember me" off → clear on tab close via sessionStorage swap
    if (!remember) {
      try {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      } catch { /* noop */ }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    if (!remember) {
      // Move tokens from localStorage to sessionStorage so they expire on tab close
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith("sb-"));
        for (const k of keys) {
          sessionStorage.setItem(k, localStorage.getItem(k) ?? "");
          localStorage.removeItem(k);
        }
      } catch { /* noop */ }
    }
    toast.success("Welcome back");
    navigate(redirect);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${redirect}` } });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created");
    navigate(redirect);
  }

  async function handleForgot() {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else toast.success("Password reset email sent");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-subtle border-r border-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl gradient-urgent flex items-center justify-center text-priority-urgent-foreground font-bold">T</div>
          <span className="font-semibold tracking-tight">Task Priority Scheduler</span>
        </div>
        <div className="space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-priority-urgent-border bg-priority-urgent-bg px-3 py-1 text-xs font-medium text-priority-urgent">
            <Sparkles className="h-3 w-3" />Built for teams
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Prioritize what matters.<br />
            <span className="bg-gradient-to-r from-priority-urgent to-warning bg-clip-text text-transparent">Together.</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">Organize your team's tasks, automate digests, and keep everyone aligned.</p>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Task Priority Scheduler</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to manage your team.</p>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-1.5"><Label htmlFor="si-email">Email</Label><Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label htmlFor="si-pw">Password</Label>
                    <button type="button" onClick={handleForgot} className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</button>
                  </div>
                  <Input id="si-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                  Remember me
                </label>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-1.5"><Label htmlFor="su-email">Email</Label><Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="su-pw">Password</Label><Input id="su-pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /><p className="text-xs text-muted-foreground">Min. 8 characters.</p></div>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
