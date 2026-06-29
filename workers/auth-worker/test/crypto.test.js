import test from "node:test";
import assert from "node:assert/strict";
import { generateSalt, generateSessionToken, hashPassword, verifyPassword } from "../src/crypto.js";

test("generateSalt and generateSessionToken produce distinct hex strings of expected length", () => {
  const saltA = generateSalt();
  const saltB = generateSalt();
  assert.equal(saltA.length, 32);
  assert.notEqual(saltA, saltB);

  const tokenA = generateSessionToken();
  assert.equal(tokenA.length, 64);
  assert.notEqual(tokenA, generateSessionToken());
});

test("hashPassword is deterministic for the same password/salt", async () => {
  const salt = generateSalt();
  const hashA = await hashPassword("correct horse battery staple", salt);
  const hashB = await hashPassword("correct horse battery staple", salt);
  assert.equal(hashA, hashB);
});

test("verifyPassword accepts the right password and rejects a wrong one", async () => {
  const salt = generateSalt();
  const hash = await hashPassword("my-secret-password", salt);

  assert.equal(await verifyPassword("my-secret-password", salt, hash), true);
  assert.equal(await verifyPassword("wrong-password", salt, hash), false);
});

test("different salts produce different hashes for the same password", async () => {
  const saltA = generateSalt();
  const saltB = generateSalt();
  const hashA = await hashPassword("same-password", saltA);
  const hashB = await hashPassword("same-password", saltB);
  assert.notEqual(hashA, hashB);
});
