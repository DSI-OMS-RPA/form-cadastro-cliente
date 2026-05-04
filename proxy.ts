import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ift_session";

// Verifica se o cookie tem a estrutura esperada: dois segmentos base64url separados por "."
// A validação criptográfica completa (HMAC) é feita nas rotas API (Node.js runtime).
// O proxy apenas evita o flash visual para utilizadores sem sessão.
function hasValidStructure(cookieValue: string): boolean {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const base64url = /^[A-Za-z0-9_-]+$/;
  return base64url.test(parts[0]) && base64url.test(parts[1]);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — sem autenticação
  const isPublic =
    pathname.startsWith("/autenticacao") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|svg|ico|webp)$/.test(pathname);

  if (isPublic) return NextResponse.next();

  // Páginas protegidas — verificar presença e estrutura do cookie
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue || !hasValidStructure(cookieValue)) {
    return NextResponse.redirect(new URL("/autenticacao", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
