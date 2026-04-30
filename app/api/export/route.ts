import { readFile } from "node:fs/promises";
import { join } from "node:path";

type ClientRecord = {
  name?: string;
  phone?: string;
  nif?: string;
  document?: string;
  serviceNumber?: string;
  floor?: string;
  apartmentLocation?: string;
};

type RegistrationRecord = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: {
    username?: string;
    name?: string;
    role?: string;
  };
  location: {
    island?: string;
    council?: string;
    zone?: string;
    neighborhood?: string;
    street?: string;
    doorReference?: string;
    housingType?: string;
    housingStatus?: string;
    apartmentCount?: string;
    gps?: {
      latitude?: string;
      longitude?: string;
      accuracy?: string;
    };
  };
  clients: ClientRecord[];
};

const registrationsFile = join(process.cwd(), "storage", "registrations.jsonl");

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
  "Telefone / WhatsApp",
  "NIF",
  "CNI/BI",
  "Número de cliente/serviço",
  "Piso",
  "Localização do apartamento",
];

export async function GET() {
  const records = await readRegistrations();
  const rows = records.flatMap((record) => {
    const clients = record.clients.length > 0 ? record.clients : [{}];

    return clients.map((client) => [
      record.id,
      formatDate(record.createdAt),
      formatDate(record.updatedAt),
      record.createdBy?.name,
      record.createdBy?.username,
      record.createdBy?.role,
      record.location.island,
      record.location.council,
      record.location.zone,
      record.location.neighborhood,
      record.location.street,
      record.location.doorReference,
      record.location.housingType,
      record.location.housingStatus,
      record.location.apartmentCount,
      record.location.gps?.latitude,
      record.location.gps?.longitude,
      record.location.gps?.accuracy,
      record.clients.length,
      client.name,
      client.phone,
      client.nif,
      client.document,
      client.serviceNumber,
      client.floor,
      client.apartmentLocation,
    ]);
  });

  const csv = toCsv([headers, ...rows]);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cadastro-clientes-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

async function readRegistrations(): Promise<RegistrationRecord[]> {
  try {
    const content = await readFile(registrationsFile, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RegistrationRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(formatCsvCell).join(";")).join("\r\n");
}

function formatCsvCell(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function formatDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}
