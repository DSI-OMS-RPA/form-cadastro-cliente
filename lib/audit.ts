import { prisma } from "@/lib/db";

export type AuditEvent = "login" | "logout" | "login_failed";

export async function recordAuditEvent({
  event,
  username,
  name,
  role,
  request,
}: {
  event: AuditEvent;
  username: string;
  name: string;
  role: string;
  request: Request;
}) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const userAgent = request.headers.get("user-agent") ?? null;

  await prisma.auditLog.create({
    data: { event, username, name, role, ip, userAgent },
  });
}
