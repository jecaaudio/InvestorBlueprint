import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookie,
  buildClearSessionCookie,
  readSessionToken,
  isSessionExpired,
  sessionExpiry
} from "../src/session.js";

test("buildSessionCookie includes the token and security attributes", () => {
  const cookie = buildSessionCookie("abc123");
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=abc123;`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
});

test("buildClearSessionCookie expires immediately", () => {
  const cookie = buildClearSessionCookie();
  assert.match(cookie, /Max-Age=0/);
});

test("readSessionToken extracts the session cookie among others", () => {
  const request = new Request("https://example.com", {
    headers: { Cookie: `foo=bar; ${SESSION_COOKIE_NAME}=the-token; baz=qux` }
  });
  assert.equal(readSessionToken(request), "the-token");
});

test("readSessionToken returns null when the cookie is absent", () => {
  const request = new Request("https://example.com");
  assert.equal(readSessionToken(request), null);
});

test("isSessionExpired compares against the given timestamp", () => {
  const future = sessionExpiry(new Date());
  assert.equal(isSessionExpired(future, new Date()), false);
  assert.equal(isSessionExpired(new Date(Date.now() - 1000).toISOString()), true);
});
