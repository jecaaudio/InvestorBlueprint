import { generateSalt, generateSessionToken, hashPassword, verifyPassword } from "./crypto.js";
import {
  buildSessionCookie,
  buildClearSessionCookie,
  readSessionToken,
  isSessionExpired,
  sessionExpiry
} from "./session.js";
import {
  getUserByEmail,
  getUserById,
  insertUser,
  startUserTrial,
  insertSession,
  getSession,
  deleteSession,
  listSavedCalculations,
  upsertSavedCalculation,
  deleteSavedCalculation
} from "./db.js";

const MAX_BODY_BYTES = 10 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
// Best-effort only: Cloudflare Workers spin up fresh isolates per request/region,
// so this limiter is not shared or guaranteed to persist across requests.
const rateLimitHits = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const hits = (rateLimitHits.get(key) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  rateLimitHits.set(key, hits);
  return hits.length > RATE_LIMIT_MAX_REQUESTS;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200, origin = "", extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  headers["Access-Control-Allow-Headers"] = "Content-Type";
  headers["Access-Control-Allow-Methods"] = "GET,POST,DELETE,OPTIONS";
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(origin, code, message, status = 400) {
  return json({ error: { code, message } }, status, origin);
}

function getAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "";
  if (!allowed || requestOrigin !== allowed) return "";
  return allowed;
}

function publicUser(user) {
  return {
    email: user.email,
    subscriptionPlan: user.subscription_plan,
    trialStartsAt: user.trial_starts_at,
    trialEndsAt: user.trial_ends_at
  };
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

async function requireSessionUser(request, env) {
  const token = readSessionToken(request);
  if (!token) return null;

  const session = await getSession(env.DB, token);
  if (!session || isSessionExpired(session.expires_at)) {
    if (session) await deleteSession(env.DB, token);
    return null;
  }

  const user = await getUserById(env.DB, session.user_id);
  return user || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = getAllowedOrigin(request, env);
    const secureCookies = url.protocol === "https:";

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "auth-worker" }, 200, allowedOrigin);
    }

    if (!allowedOrigin) {
      return errorResponse("", "FORBIDDEN_ORIGIN", "Origin not allowed", 403);
    }

    const clientKey = request.headers.get("CF-Connecting-IP") || allowedOrigin;
    if (isRateLimited(clientKey)) {
      return errorResponse(allowedOrigin, "RATE_LIMITED", "Too many requests, try again shortly.", 429);
    }

    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      let body;
      try {
        body = await readJsonBody(request);
      } catch (error) {
        const status = error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
        return errorResponse(allowedOrigin, error.message, "Invalid request body", status);
      }

      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");

      if (!EMAIL_RE.test(email)) {
        return errorResponse(allowedOrigin, "INVALID_EMAIL", "Enter a valid email address.", 400);
      }
      if (password.length < 8) {
        return errorResponse(allowedOrigin, "WEAK_PASSWORD", "Password must be at least 8 characters.", 400);
      }

      const existing = await getUserByEmail(env.DB, email);
      if (existing) {
        return errorResponse(allowedOrigin, "EMAIL_TAKEN", "This email is already registered.", 409);
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const userId = crypto.randomUUID();

      const wantsTrial = body?.startTrial === true;
      const now = new Date();
      const trialStartsAt = wantsTrial ? now.toISOString() : null;
      const trialEndsAt = wantsTrial ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

      await insertUser(env.DB, {
        id: userId,
        email,
        passwordHash,
        passwordSalt: salt,
        subscriptionPlan: wantsTrial ? "trial" : "none",
        trialStartsAt,
        trialEndsAt
      });

      const token = generateSessionToken();
      await insertSession(env.DB, { token, userId, expiresAt: sessionExpiry() });

      const user = await getUserById(env.DB, userId);
      return json(
        { user: publicUser(user) },
        201,
        allowedOrigin,
        { "Set-Cookie": buildSessionCookie(token, { secure: secureCookies }) }
      );
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      let body;
      try {
        body = await readJsonBody(request);
      } catch (error) {
        const status = error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
        return errorResponse(allowedOrigin, error.message, "Invalid request body", status);
      }

      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");

      const user = await getUserByEmail(env.DB, email);
      if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
        return errorResponse(allowedOrigin, "INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
      }

      if (body?.startTrial === true && user.subscription_plan === "none") {
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await startUserTrial(env.DB, user.id, { trialStartsAt: now.toISOString(), trialEndsAt });
      }

      const token = generateSessionToken();
      await insertSession(env.DB, { token, userId: user.id, expiresAt: sessionExpiry() });

      const freshUser = await getUserById(env.DB, user.id);
      return json(
        { user: publicUser(freshUser) },
        200,
        allowedOrigin,
        { "Set-Cookie": buildSessionCookie(token, { secure: secureCookies }) }
      );
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const token = readSessionToken(request);
      if (token) await deleteSession(env.DB, token);
      return json({ ok: true }, 200, allowedOrigin, {
        "Set-Cookie": buildClearSessionCookie({ secure: secureCookies })
      });
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      const user = await requireSessionUser(request, env);
      if (!user) return errorResponse(allowedOrigin, "NOT_AUTHENTICATED", "No active session.", 401);
      return json({ user: publicUser(user) }, 200, allowedOrigin);
    }

    if (url.pathname === "/api/saved-calculations") {
      const user = await requireSessionUser(request, env);
      if (!user) return errorResponse(allowedOrigin, "NOT_AUTHENTICATED", "No active session.", 401);

      if (request.method === "GET") {
        const rows = await listSavedCalculations(env.DB, user.id);
        const calculations = rows.map((row) => ({
          id: row.id,
          tool: row.tool,
          name: row.name,
          state: JSON.parse(row.state),
          updatedAt: row.updated_at
        }));
        return json({ calculations }, 200, allowedOrigin);
      }

      if (request.method === "POST") {
        let body;
        try {
          body = await readJsonBody(request);
        } catch (error) {
          const status = error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
          return errorResponse(allowedOrigin, error.message, "Invalid request body", status);
        }

        const tool = String(body?.tool || "").trim();
        const name = String(body?.name || "").trim();
        if (!tool || !name || body?.state === undefined) {
          return errorResponse(allowedOrigin, "INVALID_CALCULATION", "Fields `tool`, `name`, and `state` are required.", 400);
        }

        const id = String(body?.id || crypto.randomUUID());
        await upsertSavedCalculation(env.DB, {
          id,
          userId: user.id,
          tool,
          name,
          state: JSON.stringify(body.state)
        });
        return json({ id }, 200, allowedOrigin);
      }
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/saved-calculations/")) {
      const user = await requireSessionUser(request, env);
      if (!user) return errorResponse(allowedOrigin, "NOT_AUTHENTICATED", "No active session.", 401);

      const id = url.pathname.split("/").pop();
      await deleteSavedCalculation(env.DB, id, user.id);
      return json({ ok: true }, 200, allowedOrigin);
    }

    return errorResponse(allowedOrigin, "NOT_FOUND", "Route not found", 404);
  }
};
