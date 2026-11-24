const ITERATIONS = 100000;

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS }, material, 256);
  return toHex(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toHex(salt), hash: await derive(password, salt) };
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  return (await derive(password, fromHex(salt))) === hash;
}

export function newToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
