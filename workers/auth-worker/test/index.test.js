import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { createFakeD1 } from "./fakeD1.js";

const ORIGIN = "https://example.com";

function makeEnv() {
  return { DB: createFakeD1(), ALLOWED_ORIGIN: ORIGIN };
}

function req(path, { method = "GET", body, cookie } = {}) {
  const headers = { Origin: ORIGIN };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  return new Request(`https://auth.example.workers.dev${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

function sessionCookieFrom(response) {
  const setCookie = response.headers.get("Set-Cookie") || "";
  return setCookie.split(";")[0];
}

test("requests without an allowed Origin are forbidden", async () => {
  const env = makeEnv();
  const response = await worker.fetch(
    new Request("https://auth.example.workers.dev/api/auth/me", { headers: { Origin: "https://evil.example" } }),
    env
  );
  assert.equal(response.status, 403);
});

test("register rejects invalid email and weak passwords", async () => {
  const env = makeEnv();

  const badEmail = await worker.fetch(req("/api/auth/register", { method: "POST", body: { email: "not-an-email", password: "longenough" } }), env);
  assert.equal(badEmail.status, 400);

  const weakPassword = await worker.fetch(req("/api/auth/register", { method: "POST", body: { email: "a@b.com", password: "short" } }), env);
  assert.equal(weakPassword.status, 400);
});

test("register -> me -> logout -> me happy path", async () => {
  const env = makeEnv();

  const registerRes = await worker.fetch(
    req("/api/auth/register", { method: "POST", body: { email: "Jane@Example.com", password: "supersecret1" } }),
    env
  );
  assert.equal(registerRes.status, 201);
  const registerBody = await registerRes.json();
  assert.equal(registerBody.user.email, "jane@example.com");
  const cookie = sessionCookieFrom(registerRes);
  assert.match(cookie, /^ib_session=/);

  const meRes = await worker.fetch(req("/api/auth/me", { cookie }), env);
  assert.equal(meRes.status, 200);
  assert.equal((await meRes.json()).user.email, "jane@example.com");

  const logoutRes = await worker.fetch(req("/api/auth/logout", { method: "POST", cookie }), env);
  assert.equal(logoutRes.status, 200);

  const meAfterLogout = await worker.fetch(req("/api/auth/me", { cookie }), env);
  assert.equal(meAfterLogout.status, 401);
});

test("registering the same email twice is rejected", async () => {
  const env = makeEnv();
  await worker.fetch(req("/api/auth/register", { method: "POST", body: { email: "dup@example.com", password: "supersecret1" } }), env);
  const second = await worker.fetch(req("/api/auth/register", { method: "POST", body: { email: "dup@example.com", password: "anotherpass1" } }), env);
  assert.equal(second.status, 409);
});

test("login fails with wrong password and succeeds with the right one", async () => {
  const env = makeEnv();
  await worker.fetch(req("/api/auth/register", { method: "POST", body: { email: "login@example.com", password: "correct-password" } }), env);

  const wrongLogin = await worker.fetch(req("/api/auth/login", { method: "POST", body: { email: "login@example.com", password: "wrong-password" } }), env);
  assert.equal(wrongLogin.status, 401);

  const rightLogin = await worker.fetch(req("/api/auth/login", { method: "POST", body: { email: "login@example.com", password: "correct-password" } }), env);
  assert.equal(rightLogin.status, 200);
  assert.match(sessionCookieFrom(rightLogin), /^ib_session=/);
});

test("saved calculations require auth and round-trip through D1", async () => {
  const env = makeEnv();
  const registerRes = await worker.fetch(req("/api/auth/register", { method: "POST", body: { email: "saver@example.com", password: "supersecret1" } }), env);
  const cookie = sessionCookieFrom(registerRes);

  const unauthed = await worker.fetch(req("/api/saved-calculations"), env);
  assert.equal(unauthed.status, 401);

  const createRes = await worker.fetch(
    req("/api/saved-calculations", { method: "POST", cookie, body: { tool: "flip", name: "My Deal", state: { arv: 250000 } } }),
    env
  );
  assert.equal(createRes.status, 200);
  const { id } = await createRes.json();

  const listRes = await worker.fetch(req("/api/saved-calculations", { cookie }), env);
  const { calculations } = await listRes.json();
  assert.equal(calculations.length, 1);
  assert.equal(calculations[0].name, "My Deal");
  assert.deepEqual(calculations[0].state, { arv: 250000 });

  const deleteRes = await worker.fetch(req(`/api/saved-calculations/${id}`, { method: "DELETE", cookie }), env);
  assert.equal(deleteRes.status, 200);

  const listAfterDelete = await worker.fetch(req("/api/saved-calculations", { cookie }), env);
  assert.equal((await listAfterDelete.json()).calculations.length, 0);
});
