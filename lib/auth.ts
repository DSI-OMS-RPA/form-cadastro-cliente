import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";

export type UserRole = "admin" | "operador";

export type AuthUser = {
  username: string;
  name: string;
  role: UserRole;
};

const SESSION_COOKIE = "ift_session";
const SESSION_MAX_AGE = 60 * 30;

// scrypt parameters
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = "scrypt";

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, options, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  );
}

type ConfigUser = AuthUser & {
  password: string;
  active?: boolean;
};

const usersFile = join(process.cwd(), "config", "users.json");

// ─── Password hashing ────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const hash = (await scryptAsync(plain, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })) as Buffer;
  return `${SCRYPT_PREFIX}:${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  // Hashed format: "scrypt:<salt_hex>:<hash_hex>"
  if (stored.startsWith(`${SCRYPT_PREFIX}:`)) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const hash = (await scryptAsync(plain, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })) as Buffer;
    const storedBuf = Buffer.from(hashHex, "hex");
    return hash.length === storedBuf.length && timingSafeEqual(hash, storedBuf);
  }

  // Fallback: plain-text comparison (only for unhashed legacy passwords)
  const plainBuf = Buffer.from(plain);
  const storedBuf = Buffer.from(stored);
  return (
    plainBuf.length === storedBuf.length && timingSafeEqual(plainBuf, storedBuf)
  );
}

// ─── Session ─────────────────────────────────────────────────────────────────

function getSessionSecret() {
  return process.env.AUTH_SECRET || "ift-cadastro-clientes-local-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodeSession(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

async function readUsers(): Promise<ConfigUser[]> {
  const content = await readFile(usersFile, "utf8");
  const users = JSON.parse(content) as ConfigUser[];
  return users.filter((user) => user.active !== false);
}

async function decodeSession(value?: string): Promise<AuthUser | null> {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const user = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as AuthUser;
    const users = await readUsers();
    if (
      !users.some(
        (item) => item.username === user.username && item.role === user.role
      )
    ) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function authenticate(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const users = await readUsers();
  const user = users.find((item) => item.username === username);
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  return { username: user.username, name: user.name, role: user.role };
}

export async function createSession(user: AuthUser) {
  const cookieStore = await cookies();
  // COOKIE_SECURE=true apenas quando HTTPS estiver configurado.
  // Em HTTP (ex: rede interna sem HTTPS) manter false para o cookie funcionar.
  const secureCookie = process.env.COOKIE_SECURE === "true";

  cookieStore.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
}
