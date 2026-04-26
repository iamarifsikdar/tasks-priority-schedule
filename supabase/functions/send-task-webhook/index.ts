// Sends the user's pending tasks as a structured payload to their Pabbly webhook URL.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SendRequest {
  user_id?: string;
  trigger?: "manual" | "test" | "scheduler";
  override_url?: string; // for test sends
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
      userId = jwtUserId;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const url = body.override_url || settings.webhook_url;
    if (!url) {
      return new Response(JSON.stringify({ error: "Webhook URL not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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