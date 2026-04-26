// Sends a task priority digest email via Resend.
// Triggers: manual "send now" / "test" from UI, or scheduled by automation-dispatcher.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { renderDigestHtml, renderDigestText, type DigestTask } from "../_shared/digest-template.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_NAME = "Task Priority Scheduler";
const APP_URL = Deno.env.get("APP_URL") ?? "https://lovable.app";
const FROM_ADDRESS = Deno.env.get("RESEND_FROM") ?? "Task Scheduler <onboarding@resend.dev>";

interface SendRequest {
  user_id?: string; // optional — if omitted, derived from JWT
  trigger?: "manual" | "test" | "scheduler";
  test_recipient?: string; // optional override for test sends
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as SendRequest;
    const trigger = body.trigger ?? "manual";

    // Service role for scheduler invocations; otherwise verify JWT
    const isServiceCall = req.headers.get("x-internal-secret") === SUPABASE_SERVICE_ROLE_KEY;
    let userId = body.user_id ?? null;

    if (!isServiceCall) {
      const jwtUserId = await getUserId(req);
      if (!jwtUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = jwtUserId; // user-triggered sends always use their own data
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load settings + profile
    const [{ data: settings }, { data: profile }] = await Promise.all([
      admin.from("email_automation_settings").select("*").eq("user_id", userId).single(),
      admin.from("profiles").select("display_name").eq("user_id", userId).single(),
    ]);

    if (!settings) {
      return new Response(JSON.stringify({ error: "No email settings configured" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load pending tasks ordered by priority then newest
    const { data: tasks, error: tasksError } = await admin
      .from("tasks")
      .select("title, description, priority, due_date, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (tasksError) throw tasksError;

    const orderMap = { urgent: 1, high: 2, medium: 3, low: 4 } as const;
    const sortedTasks = (tasks ?? []).sort(
      (a, b) =>
        orderMap[a.priority as keyof typeof orderMap] - orderMap[b.priority as keyof typeof orderMap],
    ) as DigestTask[];

    const subject = settings.email_subject || `${APP_NAME} digest`;
    const recipient = body.test_recipient || settings.recipient_email;

    const html = renderDigestHtml({
      subject,
      appName: APP_NAME,
      recipientName: profile?.display_name ?? null,
      tasks: sortedTasks,
      appUrl: APP_URL,
    });
    const text = renderDigestText(sortedTasks, APP_NAME);

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient],
        subject: trigger === "test" ? `[TEST] ${subject}` : subject,
        html,
        text,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    const success = resendRes.ok;

    // Update settings + log
    const today = new Date().toISOString().slice(0, 10);
    if (trigger !== "test") {
      await admin
        .from("email_automation_settings")
        .update({
          last_sent_at: new Date().toISOString(),
          last_sent_date: today,
          last_status: success ? "success" : "error",
          last_error: success ? null : JSON.stringify(resendData).slice(0, 500),
        })
        .eq("user_id", userId);
    }

    await admin.from("automation_logs").insert({
      user_id: userId,
      type: "email",
      status: success ? "success" : "error",
      response: resendData,
      error_message: success ? null : JSON.stringify(resendData).slice(0, 500),
      task_count: sortedTasks.length,
      triggered_by: trigger,
    });

    return new Response(
      JSON.stringify({
        success,
        task_count: sortedTasks.length,
        recipient,
        resend: resendData,
      }),
      {
        status: success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-task-email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});