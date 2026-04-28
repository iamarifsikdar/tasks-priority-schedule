// Verifies a TOTP code. Two modes:
//   - mode: "enroll", body: { secret, code }  → confirms the new secret and stores it encrypted via RPC
//   - mode: "login",  body: { code }           → reads stored secret via RPC, verifies, mints a session
// On success, returns { session_token, expires_at }. Client stores session_token in localStorage.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { totpVerify } from "../_shared/totp.ts";

function randomToken(len = 48): string {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const mode: "enroll" | "login" = body?.mode === "enroll" ? "enroll" : "login";
    const code: string = String(body?.code ?? "").trim();
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let secret: string | null = null;
    if (mode === "enroll") {
      secret = String(body?.secret ?? "").trim();
      if (!secret) {
        return new Response(JSON.stringify({ error: "Secret required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      const { data: s, error: ge } = await supabase.rpc("platform_admin_get_totp");
      if (ge) {
        return new Response(JSON.stringify({ error: ge.message }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      secret = s as string | null;
      if (!secret) {
        return new Response(JSON.stringify({ error: "Two-factor not enrolled" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const ok = await totpVerify(secret, code, 1);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid code" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "enroll") {
      const { error: setErr } = await supabase.rpc("platform_admin_set_totp", { _secret_b32: secret });
      if (setErr) {
        return new Response(JSON.stringify({ error: setErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const token = randomToken(48);
    const { data: session, error: sesErr } = await supabase.rpc("platform_admin_create_session", {
      _token: token, _hours: 8,
    });
    if (sesErr) {
      return new Response(JSON.stringify({ error: sesErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      session_token: token,
      expires_at: (session as { expires_at: string }).expires_at,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});