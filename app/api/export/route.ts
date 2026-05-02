import { prisma } from "@/lib/db";

const headers = [
  "ID do registo",
  "Data de criação",
  "Última atualização",
  "Inserido por",
  "Utilizador",
  "Perfil",
  "Ilha",
  "Concelho",
  "Zona/Cidade",
  "Bairro",
  "Rua",
  "Número da porta ou referência",
  "Tipo de moradia",
  "Estado da moradia",
  "Número de apartamento",
  "Latitude",
  "Longitude",
  "Precisão GPS",
  "Total de clientes cadastrados",
  "Nome completo do cliente",
  "Género",
  "Telefone / WhatsApp",
  "NIF",
  "CNI/BI",
  "Número de cliente/serviço",
  "Piso",
  "Localização do apartamento",
];

export async function GET() {
  const records = await prisma.registration.findMany({
    orderBy: { createdAt: "asc" },
    include: { clients: true },
  });

  const rows = records.flatMap((reg) => {
    const clients = reg.clients.length > 0 ? reg.clients : [null];

    return clients.map((client) => [
      reg.id,
      formatDate(reg.createdAt),
      formatDate(reg.updatedAt),
      reg.createdByName,
      reg.createdByUser,
      reg.createdByRole,
      reg.island,
      reg.council,
      reg.zone,
      reg.neighborhood,
      reg.street,
      reg.doorReference,
      reg.housingType,
      reg.housingStatus,
      reg.apartmentCount,
      reg.latitude,
      reg.longitude,
      reg.accuracy,
      reg.clients.length,
      client?.name,
      client?.gender,
      client?.phone,
      client?.nif,
      client?.document,
      client?.serviceNumber,
      client?.floor,
      client?.apartmentLocation,
    ]);
  });

  const csv = toCsv([headers, ...rows]);

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cadastro-clientes-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(formatCsvCell).join(";")).join("\r\n");
}

function formatCsvCell(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}
