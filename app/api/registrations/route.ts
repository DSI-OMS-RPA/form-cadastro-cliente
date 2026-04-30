import { mkdir, appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

type ClientPayload = {
  name: string;
  phone?: string;
  nif?: string;
  document?: string;
  serviceNumber?: string;
  floor?: string;
  apartmentLocation?: string;
};

type RegistrationPayload = {
  location: {
    island: string;
    council: string;
    zone: string;
    neighborhood: string;
    street?: string;
    doorReference?: string;
    housingType: string;
    housingStatus: string;
    apartmentCount?: string;
    gps: {
      latitude: string;
      longitude: string;
      accuracy?: string;
    };
  };
  clients: ClientPayload[];
};

type RegistrationRecord = RegistrationPayload & {
  id: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: {
    username: string;
    name: string;
    role: string;
  };
};

const storageDir = join(process.cwd(), "storage");
const registrationsFile = join(storageDir, "registrations.jsonl");

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const records = await readRegistrations();
  const visibleRecords =
    user.role === "admin"
      ? records
      : records.filter((record) => record.createdBy?.username === user.username);

  return NextResponse.json({
    registrations: visibleRecords.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let payload: RegistrationPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const validationError = validateRegistration(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: {
      username: user.username,
      name: user.name,
      role: user.role,
    },
    ...payload,
  };

  await mkdir(storageDir, { recursive: true });
  await appendFile(registrationsFile, `${JSON.stringify(record)}\n`, "utf8");

  return NextResponse.json({ ok: true, id: record.id });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let payload: { id?: string; client?: ClientPayload };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  if (!payload.id?.trim()) {
    return NextResponse.json({ error: "Identificador do prédio/residência em falta." }, { status: 400 });
  }

  if (!payload.client?.name?.trim()) {
    return NextResponse.json({ error: "O nome completo do cliente é obrigatório." }, { status: 400 });
  }

  const records = await readRegistrations();
  const recordIndex = records.findIndex((record) => record.id === payload.id);

  if (recordIndex === -1) {
    return NextResponse.json({ error: "Prédio/residência não encontrado." }, { status: 404 });
  }

  const targetRecord = records[recordIndex];
  if (user.role !== "admin" && targetRecord.createdBy?.username !== user.username) {
    return NextResponse.json({ error: "Sem permissão para alterar este registo." }, { status: 403 });
  }

  records[recordIndex] = {
    ...targetRecord,
    updatedAt: new Date().toISOString(),
    clients: [...targetRecord.clients, payload.client],
  };

  await mkdir(storageDir, { recursive: true });
  await writeFile(registrationsFile, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");

  return NextResponse.json({ ok: true, registration: records[recordIndex] });
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

function validateRegistration(payload: RegistrationPayload) {
  if (!payload?.location) {
    return "Dados de localização em falta.";
  }

  const requiredLocationFields = [
    payload.location.island,
    payload.location.council,
    payload.location.zone,
    payload.location.neighborhood,
    payload.location.housingType,
    payload.location.housingStatus,
    payload.location.gps?.latitude,
    payload.location.gps?.longitude,
  ];

  if (requiredLocationFields.some((value) => !String(value ?? "").trim())) {
    return "Preencha todos os campos obrigatórios da localização.";
  }

  if (!Array.isArray(payload.clients)) {
    return "A lista de clientes é inválida.";
  }

  if (payload.clients.some((client) => !client.name?.trim())) {
    return "O nome completo é obrigatório para todos os clientes.";
  }

  return null;
}
