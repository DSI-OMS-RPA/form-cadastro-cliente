import { createHmac, timingSafeEqual } from "node:crypto";
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

type ConfigUser = AuthUser & {
  password: string;
  active?: boolean;
};

const usersFile = join(process.cwd(), "config", "users.json");

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
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

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
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthUser;
    const users = await readUsers();
    if (!users.some((item) => item.username === user.username && item.role === user.role)) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function authenticate(username: string, password: string): Promise<AuthUser | null> {
  const users = await readUsers();
  const user = users.find((item) => item.username === username && item.password === password);
  if (!user) {
    return null;
  }

  return {
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

export async function createSession(user: AuthUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
