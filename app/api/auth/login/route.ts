import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  let payload: { username?: string; password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const user = await authenticate(String(payload.username ?? "").trim(), String(payload.password ?? ""));
  if (!user) {
    return NextResponse.json({ error: "Utilizador ou palavra-passe inválidos." }, { status: 401 });
  }

  await createSession(user);
  return NextResponse.json({ user });
}
