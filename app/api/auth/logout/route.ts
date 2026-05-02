import { NextResponse } from "next/server";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  await destroySession();

  if (user) {
    await recordAuditEvent({
      event: "logout",
      username: user.username,
      name: user.name,
      role: user.role,
      request,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
