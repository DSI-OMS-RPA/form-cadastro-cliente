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

  let user;
  try {
    user = await authenticate(username, password);
  } catch (err) {
    console.error("[login] Erro ao autenticar:", err);
    return NextResponse.json(
      { error: "Erro interno ao verificar credenciais." },
      { status: 500 }
    );
  }

  if (!user) {
    await recordAuditEvent({
      event: "login_failed",
      username: username || "(em branco)",
      name: "-",
      role: "-",
      request,
    }).catch(() => {});

    return NextResponse.json(
      { error: "Utilizador ou palavra-passe inválidos." },
      { status: 401 }
    );
  }

  try {
    await createSession(user);
  } catch (err) {
    console.error("[login] Erro ao criar sessão:", err);
    return NextResponse.json(
      { error: "Erro interno ao criar sessão." },
      { status: 500 }
    );
  }

  await recordAuditEvent({
    event: "login",
    username: user.username,
    name: user.name,
    role: user.role,
    request,
  }).catch(() => {});

  return NextResponse.json({ user });
}
