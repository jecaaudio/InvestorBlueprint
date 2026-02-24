import { normalizeOptions, normalizeSubject } from "./core/normalize.js";
import { rankAndFilterComps } from "./core/comps.js";
import { calculateArv } from "./core/arv.js";
import * as dummyProvider from "./providers/dummy.js";
import * as attomProvider from "./providers/attom.js";

const memoryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // short-lived cache for local worker isolates

function json(data, status = 200, origin = "") {
  const headers = { "Content-Type": "application/json" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  headers["Access-Control-Allow-Headers"] = "Content-Type";
  headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(origin, code, message, status = 400, meta = undefined) {
  return json(meta ? { error: { code, message }, meta } : { error: { code, message } }, status, origin);
}

function getAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "";
  if (!allowed || requestOrigin !== allowed) return "";
  return allowed;
}

function cacheGet(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.createdAt > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  memoryCache.set(key, { value, createdAt: Date.now() });
}

function getProvider(env) {
  const provider = (env.PROVIDER || "DUMMY").toUpperCase();
  if (provider === "ATTOM") return { name: "ATTOM", impl: attomProvider };
  return { name: "DUMMY", impl: dummyProvider };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = getAllowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "arv-worker", provider: env.PROVIDER || "DUMMY" }, 200, allowedOrigin);
    }

    if (request.method === "POST" && url.pathname === "/api/arv") {
      if (!allowedOrigin) {
        return errorResponse("", "FORBIDDEN_ORIGIN", "Origin not allowed", 403);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return errorResponse(allowedOrigin, "INVALID_JSON", "Body must be valid JSON", 400);
      }

      const address = (body?.address || "").trim();
      if (!address) {
        return errorResponse(allowedOrigin, "ADDRESS_REQUIRED", "Field `address` is required", 400);
      }

      const options = normalizeOptions(body.options || {});
      const cacheKey = `${env.PROVIDER || "DUMMY"}:${address}:${JSON.stringify(options)}`;
      const cached = cacheGet(cacheKey);
      if (cached) return json(cached, 200, allowedOrigin);

      const warnings = [];
      const { name, impl } = getProvider(env);

      try {
        const subject = normalizeSubject(await impl.getSubject(address, env), address);
        const compsRaw = await impl.getSoldComps(subject, options, env);
        const comps = rankAndFilterComps(subject, compsRaw, options);
        const arv = calculateArv(subject, comps);

        const response = {
          subject,
          comps,
          arv,
          meta: {
            provider: name,
            generatedAt: new Date().toISOString(),
            compsUsed: comps.length,
            warnings
          }
        };

        cacheSet(cacheKey, response);
        return json(response, 200, allowedOrigin);
      } catch (error) {
        if (String(error?.message || "").includes("NOT_CONFIGURED")) {
          warnings.push(
            "ATTOM provider is scaffolded only. Add real endpoints in src/providers/attom.js and set ATTOM_API_KEY."
          );
          return errorResponse(
            allowedOrigin,
            "NOT_CONFIGURED",
            "ATTOM provider not configured yet. Switch PROVIDER=DUMMY for demo mode.",
            501,
            { warnings }
          );
        }

        return errorResponse(allowedOrigin, "INTERNAL_ERROR", error?.message || "Unexpected error", 500);
      }
    }

    return errorResponse(allowedOrigin, "NOT_FOUND", "Route not found", 404);
  }
};
