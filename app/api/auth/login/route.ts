import { NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  let payload: { username?: string; password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const username = String(payload.username ?? "").trim();
  const password = String(payload.password ?? "");

  const user = await authenticate(username, password);

  if (!user) {
    // Regista tentativa falhada (sem expor palavra-passe)
    await recordAuditEvent({
      event: "login_failed",
      username: username || "(em branco)",
      name: "-",
      role: "-",
      request,
    }).catch(() => {}); // nunca bloqueia a resposta

    return NextResponse.json(
      { error: "Utilizador ou palavra-passe inválidos." },
      { status: 401 }
    );
  }

  await createSession(user);

  await recordAuditEvent({
    event: "login",
    username: user.username,
    name: user.name,
    role: user.role,
    request,
  }).catch(() => {});

  return NextResponse.json({ user });
}
