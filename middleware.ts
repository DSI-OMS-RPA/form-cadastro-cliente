import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ift_session";

/**
 * Verifica a assinatura HMAC-SHA256 do cookie de sessão usando a
 * Web Crypto API (compatível com o Edge runtime do Next.js).
 * O algoritmo é idêntico ao usado em lib/auth.ts com node:crypto.
 */
async function isValidSession(cookieValue: string): Promise<boolean> {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload || !signature) return false;

  try {
    const secret = process.env.AUTH_SECRET ?? "ift-cadastro-clientes-local-secret";

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // base64url → base64 → Uint8Array
    const base64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const sigBytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const payloadBytes = new TextEncoder().encode(payload);

    return await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — não precisam de sessão
  const isPublic =
    pathname.startsWith("/autenticacao") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|svg|ico|webp)$/.test(pathname);

  if (isPublic) return NextResponse.next();

  // Rotas de API protegidas — deixa as próprias rotas verificar a sessão
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Páginas protegidas — valida o cookie antes de renderizar
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue || !(await isValidSession(cookieValue))) {
    const loginUrl = new URL("/autenticacao", request.url);
    const response = NextResponse.redirect(loginUrl);
    // Remove cookie inválido se existir
    if (cookieValue) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a todas as rotas exceto assets estáticos do Next.js
  matcher: ["/((?!_next/static|_next/image).*)"],
};
