// Sends the user's pending tasks as a structured payload to their Pabbly webhook URL.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_FUNCTION_SECRET_ENV = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

interface SendRequest {
  user_id?: string;
  trigger?: "manual" | "test" | "scheduler";
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

// Allowlist of trusted automation/webhook providers.
// Add more domains here as needed (subdomains are allowed via endsWith).
const ALLOWED_WEBHOOK_HOSTS = [
  "pabbly.com",
  "connect.pabbly.com",
  "hook.eu1.make.com",
  "hook.eu2.make.com",
  "hook.us1.make.com",
  "hook.us2.make.com",
  "hook.integromat.com",
  "hooks.zapier.com",
  "zapier.com",
  "n8n.cloud",
  "webhook.site",
];

function isWebhookUrlAllowed(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  // Block obvious internal / metadata targets defensively
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("169.254.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }
  return ALLOWED_WEBHOOK_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as SendRequest;
    const trigger = body.trigger ?? "manual";

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve internal-call secret from app_config (source of truth) with env fallback
    let internalSecret = INTERNAL_FUNCTION_SECRET_ENV;
    const { data: cfg } = await admin
      .from("app_config")
      .select("value")
      .eq("key", "internal_function_secret")
      .maybeSingle();
    if (cfg?.value) internalSecret = cfg.value;

    const providedInternal = req.headers.get("x-internal-secret") ?? "";
    const isServiceCall = !!internalSecret && providedInternal === internalSecret;

    let userId = body.user_id ?? null;
    if (!isServiceCall) {
      const jwtUserId = await getUserId(req);
      if (!jwtUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = jwtUserId;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("webhook_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!settings) {
      return new Response(JSON.stringify({ error: "No webhook settings" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = settings.webhook_url;
    if (!url) {
      return new Response(JSON.stringify({ error: "Webhook URL not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isWebhookUrlAllowed(url)) {
      return new Response(
        JSON.stringify({
          error:
            "Webhook URL is not allowed. Must be HTTPS and from a supported provider (Pabbly, Make, Zapier, n8n, webhook.site).",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: tasks } = await admin
      .from("tasks")
      .select("title, description, priority, due_date, status, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const orderMap = { urgent: 1, high: 2, medium: 3, low: 4 } as const;
    const sortedTasks = (tasks ?? []).sort(
      (a, b) =>
        orderMap[a.priority as keyof typeof orderMap] -
        orderMap[b.priority as keyof typeof orderMap],
    );

    const priority_groups: Record<string, string[]> = { urgent: [], high: [], medium: [], low: [] };
    for (const t of sortedTasks) priority_groups[t.priority].push(t.title);

    const payload = {
      generated_at: new Date().toISOString(),
      trigger,
      task_count: sortedTasks.length,
      task_titles: sortedTasks.map((t) => t.title),
      priority_groups,
      tasks: sortedTasks.map((t) => ({
        title: t.title,
        priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
        description: t.description ?? "",
        due_date: t.due_date,
      })),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const success = res.ok;
    const responseText = await res.text().catch(() => "");

    const today = new Date().toISOString().slice(0, 10);
    if (trigger !== "test") {
      await admin
        .from("webhook_settings")
        .update({
          last_sent_at: new Date().toISOString(),
          last_sent_date: today,
          last_status: success ? "success" : "error",
          last_error: success ? null : responseText.slice(0, 500),
        })
        .eq("user_id", userId);
    }

    await admin.from("automation_logs").insert({
      user_id: userId,
      type: "webhook",
      status: success ? "success" : "error",
      response: { status: res.status, body: responseText.slice(0, 1000) },
      error_message: success ? null : responseText.slice(0, 500),
      task_count: sortedTasks.length,
      triggered_by: trigger,
    });

    return new Response(
      JSON.stringify({ success, task_count: sortedTasks.length, status: res.status }),
      {
        status: success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-task-webhook error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});