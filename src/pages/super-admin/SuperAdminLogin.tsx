import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

const SEEDED_EMAIL = "iamarifsikdar2001@gmail.com";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, totpEnrolled, sessionToken, loading, refresh, setSessionToken } = useSuperAdmin();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && isAdmin && sessionToken) navigate("/super-admin", { replace: true });
    else if (user && isAdmin && !totpEnrolled) navigate("/super-admin/enroll", { replace: true });
    else if (user && isAdmin) setStep(2);
  }, [loading, user, isAdmin, totpEnrolled, sessionToken, navigate]);

  async function step1Submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let signedIn = !!user;
    if (!signedIn) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setBusy(false); toast.error(error.message); return; }
      signedIn = true;
    }
    // Bootstrap if needed (one-time, server enforces "no admin yet")
    if (signedIn && email.toLowerCase() === SEEDED_EMAIL) {
      await supabase.rpc("bootstrap_first_platform_admin", { _email: SEEDED_EMAIL }).catch(() => {});
    }
    await refresh();
    const { data: status } = await supabase.rpc("platform_admin_status");
    setBusy(false);
    const s = status as { is_admin: boolean; totp_enrolled?: boolean } | null;
    if (!s?.is_admin) {
      toast.error("This account is not a platform admin.");
      await supabase.auth.signOut().catch(() => {});
      return;
    }
    if (!s.totp_enrolled) {
      navigate("/super-admin/enroll", { replace: true });
      return;
    }
    setStep(2);
  }

  async function step2Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit code"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("super-admin-2fa-verify", {
      body: { mode: "login", code },
    });
    setBusy(false);
    if (error || !data?.session_token) {
      toast.error(error?.message || (data as { error?: string })?.error || "Verification failed");
      return;
    }
    setSessionToken(data.session_token as string);
    toast.success("Welcome, admin");
    navigate("/super-admin", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-priority-urgent/15 text-priority-urgent">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Admin Sign in</h1>
          <p className="text-sm text-muted-foreground">Restricted access. Two-step authentication required.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={step1Submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sa-email">Email</Label>
              <Input id="sa-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-pw">Password</Label>
              <Input id="sa-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={step2Submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sa-code">Authentication code</Label>
              <Input id="sa-code" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                placeholder="123456" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus required />
              <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Verify and continue
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}