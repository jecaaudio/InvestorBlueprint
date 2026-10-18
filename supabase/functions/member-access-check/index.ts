import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * InvestorBlueprint server-side membership check.
 * The gateway requires a valid Supabase session JWT AND an approved profile.
 * This does not yet serve or protect static calculator HTML hosted on GitHub Pages.
 */
const origin = "https://jecaaudio.github.io";
const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "300",
  "Vary": "Origin",
};
function response(status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return response(204, {});
  if (req.method !== "GET") return response(405, { error: "method_not_allowed" });
  const bearer = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/.test(bearer)) return response(401, { error: "authentication_required" });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return response(503, { error: "service_unavailable" });
  const token = bearer.replace(/^Bearer\s+/i, "");
  try {
    const sb = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: bearer } },
    });
    const { data: auth, error: authError } = await sb.auth.getUser(token);
    if (authError || !auth.user || !auth.user.email_confirmed_at) {
      return response(401, { error: "authentication_required" });
    }
    const { data: profile, error } = await sb.from("member_profiles")
      .select("role,access_status")
      .eq("id", auth.user.id)
      .single();
    if (error || !profile) return response(403, { error: "access_not_approved" });
    if (profile.access_status !== "approved") {
      return response(403, { error: "access_not_approved", status: profile.access_status });
    }
    return response(200, {
      authorized: true,
      role: profile.role === "admin" ? "admin" : "member",
      status: "approved",
    });
  } catch {
    return response(503, { error: "verification_unavailable" });
  }
});
