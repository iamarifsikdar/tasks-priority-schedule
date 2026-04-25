import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { WEEKDAYS } from "@/lib/priority";
import { cn } from "@/lib/utils";
import { Mail, Webhook, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

type EmailSettings = {
  enabled: boolean;
  selected_days: number[];
  send_time: string;
  timezone: string;
  email_subject: string;
  recipient_email: string;
  last_sent_at: string | null;
  last_status: string | null;
  last_error: string | null;
};

type WebhookSettings = {
  enabled: boolean;
  webhook_url: string | null;
  use_email_schedule: boolean;
  selected_days: number[];
  send_time: string;
  timezone: string;
  last_sent_at: string | null;
  last_status: string | null;
  last_error: string | null;
};

export default function Automation() {
  const { user } = useAuth();
  const [email, setEmail] = useState<EmailSettings | null>(null);
  const [webhook, setWebhook] = useState<WebhookSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingE, setSavingE] = useState(false);
  const [savingW, setSavingW] = useState(false);
  const [sendingE, setSendingE] = useState<"test" | "now" | null>(null);
  const [sendingW, setSendingW] = useState<"test" | "now" | null>(null);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: e }, { data: w }] = await Promise.all([
        supabase.from("email_automation_settings").select("*").eq("user_id", user.id).single(),
        supabase.from("webhook_settings").select("*").eq("user_id", user.id).single(),
      ]);
      setEmail(e as EmailSettings | null);
      setWebhook(w as WebhookSettings | null);
      setLoading(false);
    })();
  }, [user]);

  async function saveEmail() {
    if (!email || !user) return;
    setSavingE(true);
    const { error } = await supabase
      .from("email_automation_settings")
      .update({
        enabled: email.enabled,
        selected_days: email.selected_days,
        send_time: email.send_time,
        timezone: email.timezone || tz,
        email_subject: email.email_subject.slice(0, 200),
        recipient_email: email.recipient_email.slice(0, 320),
      })
      .eq("user_id", user.id);
    setSavingE(false);
    if (error) toast.error(error.message);
    else toast.success("Email automation saved");
  }

  async function saveWebhook() {
    if (!webhook || !user) return;
    setSavingW(true);
    const { error } = await supabase
      .from("webhook_settings")
      .update({
        enabled: webhook.enabled,
        webhook_url: webhook.webhook_url?.slice(0, 2048) || null,
        use_email_schedule: webhook.use_email_schedule,
        selected_days: webhook.selected_days,
        send_time: webhook.send_time,
        timezone: webhook.timezone || tz,
      })
      .eq("user_id", user.id);
    setSavingW(false);
    if (error) toast.error(error.message);
    else toast.success("Webhook automation saved");
  }

  async function sendEmail(trigger: "test" | "now") {
    setSendingE(trigger);
    const { data, error } = await supabase.functions.invoke("send-task-email", {
      body: { trigger: trigger === "now" ? "manual" : "test" },
    });
    setSendingE(null);
    if (error || !data?.success) {
      toast.error(`Send failed: ${error?.message ?? data?.error ?? "unknown"}`);
    } else {
      toast.success(`Email sent (${data.task_count} tasks)`);
      // refresh
      if (user && trigger === "now") {
        const { data: e } = await supabase.from("email_automation_settings").select("*").eq("user_id", user.id).single();
        setEmail(e as EmailSettings);
      }
    }
  }

  async function sendWebhook(trigger: "test" | "now") {
    setSendingW(trigger);
    const { data, error } = await supabase.functions.invoke("send-task-webhook", {
      body: { trigger: trigger === "now" ? "manual" : "test" },
    });
    setSendingW(null);
    if (error || !data?.success) {
      toast.error(`Webhook failed: ${error?.message ?? data?.error ?? "unknown"}`);
    } else {
      toast.success(`Webhook sent (${data.task_count} tasks)`);
      if (user && trigger === "now") {
        const { data: w } = await supabase.from("webhook_settings").select("*").eq("user_id", user.id).single();
        setWebhook(w as WebhookSettings);
      }
    }
  }

  if (loading || !email || !webhook) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Automation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule recurring email digests and webhook deliveries of your priority tasks.
        </p>
      </div>

      {/* Email Card */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-priority-urgent-bg text-priority-urgent flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Email digest</h2>
              <p className="text-xs text-muted-foreground">Receive a beautifully formatted task summary on your schedule.</p>
            </div>
          </div>
          <Switch checked={email.enabled} onCheckedChange={(v) => setEmail({ ...email, enabled: v })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Recipient email</Label>
            <Input
              type="email"
              value={email.recipient_email}
              onChange={(e) => setEmail({ ...email, recipient_email: e.target.value })}
              maxLength={320}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject line</Label>
            <Input
              value={email.email_subject}
              onChange={(e) => setEmail({ ...email, email_subject: e.target.value })}
              maxLength={200}
            />
          </div>
        </div>

        <DaysPicker
          selected={email.selected_days}
          onChange={(d) => setEmail({ ...email, selected_days: d })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Send time</Label>
            <Input
              type="time"
              value={email.send_time.slice(0, 5)}
              onChange={(e) => setEmail({ ...email, send_time: `${e.target.value}:00` })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input
              value={email.timezone || tz}
              onChange={(e) => setEmail({ ...email, timezone: e.target.value })}
              placeholder={tz}
            />
            <p className="text-[11px] text-muted-foreground">Your detected zone: {tz}</p>
          </div>
        </div>

        <StatusFooter
          last_sent_at={email.last_sent_at}
          last_status={email.last_status}
          last_error={email.last_error}
        />

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Button onClick={saveEmail} disabled={savingE}>
            {savingE && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save settings
          </Button>
          <Button variant="outline" onClick={() => sendEmail("test")} disabled={sendingE !== null}>
            {sendingE === "test" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send test
          </Button>
          <Button variant="outline" onClick={() => sendEmail("now")} disabled={sendingE !== null}>
            {sendingE === "now" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send now
          </Button>
        </div>
      </section>

      {/* Webhook Card */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary text-foreground flex items-center justify-center">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Pabbly webhook</h2>
              <p className="text-xs text-muted-foreground">POST a structured task payload to your automation endpoint.</p>
            </div>
          </div>
          <Switch checked={webhook.enabled} onCheckedChange={(v) => setWebhook({ ...webhook, enabled: v })} />
        </div>

        <div className="space-y-1.5">
          <Label>Webhook URL</Label>
          <Input
            type="url"
            value={webhook.webhook_url ?? ""}
            onChange={(e) => setWebhook({ ...webhook, webhook_url: e.target.value })}
            placeholder="https://connect.pabbly.com/workflow/sendwebhookdata/..."
            maxLength={2048}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label className="text-sm">Use email schedule</Label>
            <p className="text-xs text-muted-foreground">Send webhooks at the same time as your email digest.</p>
          </div>
          <Switch
            checked={webhook.use_email_schedule}
            onCheckedChange={(v) => setWebhook({ ...webhook, use_email_schedule: v })}
          />
        </div>

        {!webhook.use_email_schedule && (
          <>
            <DaysPicker
              selected={webhook.selected_days}
              onChange={(d) => setWebhook({ ...webhook, selected_days: d })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Send time</Label>
                <Input
                  type="time"
                  value={webhook.send_time.slice(0, 5)}
                  onChange={(e) => setWebhook({ ...webhook, send_time: `${e.target.value}:00` })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  value={webhook.timezone || tz}
                  onChange={(e) => setWebhook({ ...webhook, timezone: e.target.value })}
                />
              </div>
            </div>
          </>
        )}

        <StatusFooter
          last_sent_at={webhook.last_sent_at}
          last_status={webhook.last_status}
          last_error={webhook.last_error}
        />

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Button onClick={saveWebhook} disabled={savingW}>
            {savingW && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save settings
          </Button>
          <Button variant="outline" onClick={() => sendWebhook("test")} disabled={sendingW !== null || !webhook.webhook_url}>
            {sendingW === "test" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Test webhook
          </Button>
          <Button variant="outline" onClick={() => sendWebhook("now")} disabled={sendingW !== null || !webhook.webhook_url}>
            {sendingW === "now" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send now
          </Button>
        </div>
      </section>
    </div>
  );
}

function DaysPicker({ selected, onChange }: { selected: number[]; onChange: (d: number[]) => void }) {
  const toggle = (d: number) => {
    onChange(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d].sort());
  };
  return (
    <div className="space-y-1.5">
      <Label>Days of week</Label>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((d) => {
          const on = selected.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => toggle(d.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary",
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusFooter({
  last_sent_at,
  last_status,
  last_error,
}: {
  last_sent_at: string | null;
  last_status: string | null;
  last_error: string | null;
}) {
  if (!last_sent_at) return (
    <p className="text-xs text-muted-foreground">No sends yet.</p>
  );
  return (
    <div className="text-xs space-y-1">
      <p className="text-muted-foreground">
        Last sent: <span className="text-foreground font-medium">{format(new Date(last_sent_at), "PPp")}</span>
        {" · "}
        <span className={last_status === "success" ? "text-success" : "text-destructive"}>{last_status}</span>
      </p>
      {last_error && <p className="text-destructive truncate">Error: {last_error}</p>}
    </div>
  );
}