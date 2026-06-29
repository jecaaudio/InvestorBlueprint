export const SESSION_COOKIE_NAME = "ib_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function sessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_TTL_MS).toISOString();
}

export function buildSessionCookie(token, { secure = true } = {}) {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function buildClearSessionCookie({ secure = true } = {}) {
  const attrs = [`${SESSION_COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function readSessionToken(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return match ? match.slice(SESSION_COOKIE_NAME.length + 1) : null;
}

export function isSessionExpired(expiresAtIso, now = new Date()) {
  return new Date(expiresAtIso).getTime() <= now.getTime();
}
