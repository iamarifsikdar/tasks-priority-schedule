import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

export default function SuperAdminEnroll() {
  const navigate = useNavigate();
  const { isAdmin, totpEnrolled, loading, refresh, setSessionToken } = useSuperAdmin();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) { navigate("/super-admin/login", { replace: true }); return; }
    if (totpEnrolled) { navigate("/super-admin/login", { replace: true }); return; }
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin, totpEnrolled]);

  async function start() {
    const { data, error } = await supabase.functions.invoke("super-admin-2fa-enroll", { body: {} });
    if (error) { toast.error(error.message); return; }
    setSecret(data.secret);
    setOtpauth(data.otpauth_url);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!secret || !/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit code"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("super-admin-2fa-verify", {
      body: { mode: "enroll", secret, code },
    });
    setBusy(false);
    if (error || !data?.session_token) {
      toast.error(error?.message || (data as { error?: string })?.error || "Verification failed");
      return;
    }
    setSessionToken(data.session_token as string);
    await refresh();
    toast.success("Two-factor enabled");
    navigate("/super-admin", { replace: true });
  }

  const qrUrl = otpauth ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauth)}` : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-priority-urgent/15 text-priority-urgent">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set up Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground">Scan the QR code with Google Authenticator (or any TOTP app), then enter the 6-digit code.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center gap-3">
          {qrUrl ? <img src={qrUrl} alt="TOTP QR code" className="rounded-md bg-white p-2" /> : <div className="h-[220px] w-[220px] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {secret && (
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Manual key</p>
              <code className="text-xs break-all">{secret}</code>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="enroll-code">Verification code</Label>
            <Input id="enroll-code" inputMode="numeric" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus required />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !secret}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirm and enable
          </Button>
        </form>
      </div>
    </div>
  );
}