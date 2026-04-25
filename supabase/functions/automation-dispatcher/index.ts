// Cron-triggered every 5 min. Finds users whose digest is due now (in their timezone)
// and invokes send-task-email / send-task-webhook for each. Prevents duplicate sends per day.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ScheduleRow {
  user_id: string;
  enabled: boolean;
  selected_days: number[]; // 0=Sun..6=Sat
  send_time: string; // "HH:MM:SS"
  timezone: string;
  last_sent_date: string | null;
}

/** Compute the user's local weekday + minutes-since-midnight, given an Intl timezone. */
function userLocalTime(tz: string): { weekday: number; minutes: number; ymd: string } {
  const now = new Date();
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    // invalid tz — fall back to UTC
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = wkMap[get("weekday")] ?? 0;
  const hour = parseInt(get("hour"), 10) || 0;
  const minute = parseInt(get("minute"), 10) || 0;
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return { weekday, minutes: hour * 60 + minute, ymd };
}

/** Should we send for this schedule right now? */
function isDue(row: ScheduleRow, windowMinutes = 5): boolean {
  if (!row.enabled) return false;
  if (!row.selected_days?.length) return false;
  const local = userLocalTime(row.timezone || "UTC");
  if (!row.selected_days.includes(local.weekday)) return false;

  // Parse send_time "HH:MM:SS"
  const [h, m] = (row.send_time || "09:00:00").split(":").map(Number);
  const sendMinutes = (h || 0) * 60 + (m || 0);

  // Within the window since target time (handles cron-every-5-min)
  const delta = local.minutes - sendMinutes;
  if (delta < 0 || delta >= windowMinutes) return false;

  // Dedupe by local date
  if (row.last_sent_date === local.ymd) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const [{ data: emailRows }, { data: webhookRows }] = await Promise.all([
      admin
        .from("email_automation_settings")
        .select("user_id, enabled, selected_days, send_time, timezone, last_sent_date")
        .eq("enabled", true),
      admin
        .from("webhook_settings")
        .select(
          "user_id, enabled, use_email_schedule, selected_days, send_time, timezone, last_sent_date, webhook_url",
        )
        .eq("enabled", true),
    ]);

    const emailDue = (emailRows ?? []).filter((r) => isDue(r as ScheduleRow));
    const webhookDue = (webhookRows ?? []).filter((r) => {
      if (!r.webhook_url) return false;
      // If webhook follows email schedule, find matching email row
      if (r.use_email_schedule) {
        const matchingEmail = (emailRows ?? []).find((e) => e.user_id === r.user_id);
        if (!matchingEmail) return false;
        return isDue({ ...(matchingEmail as ScheduleRow), last_sent_date: r.last_sent_date });
      }
      return isDue(r as ScheduleRow);
    });

    const internalHeaders = {
      "Content-Type": "application/json",
      "x-internal-secret": SUPABASE_SERVICE_ROLE_KEY,
    };

    const emailResults = await Promise.allSettled(
      emailDue.map((r) =>
        fetch(`${SUPABASE_URL}/functions/v1/send-task-email`, {
          method: "POST",
          headers: internalHeaders,
          body: JSON.stringify({ user_id: r.user_id, trigger: "scheduler" }),
        }),
      ),
    );

    const webhookResults = await Promise.allSettled(
      webhookDue.map((r) =>
        fetch(`${SUPABASE_URL}/functions/v1/send-task-webhook`, {
          method: "POST",
          headers: internalHeaders,
          body: JSON.stringify({ user_id: r.user_id, trigger: "scheduler" }),
        }),
      ),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        emails_dispatched: emailResults.length,
        webhooks_dispatched: webhookResults.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("automation-dispatcher error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});