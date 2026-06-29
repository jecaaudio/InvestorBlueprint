const PBKDF2_ITERATIONS = 150000;
const HASH_BYTES = 32;

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function generateSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

export function generateSessionToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

async function deriveBits(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromHex(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    HASH_BYTES * 8
  );

  return toHex(derived);
}

export async function hashPassword(password, salt) {
  return deriveBits(password, salt);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyPassword(password, salt, expectedHash) {
  const actualHash = await deriveBits(password, salt);
  return timingSafeEqual(actualHash, expectedHash);
}
