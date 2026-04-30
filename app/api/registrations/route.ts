import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

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

const storageDir = join(process.cwd(), "storage");
const registrationsFile = join(storageDir, "registrations.jsonl");

export async function POST(request: Request) {
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
    ...payload,
  };

  await mkdir(storageDir, { recursive: true });
  await appendFile(registrationsFile, `${JSON.stringify(record)}\n`, "utf8");

  return NextResponse.json({ ok: true, id: record.id });
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

  if (!Array.isArray(payload.clients) || payload.clients.length < 1) {
    return "Adicione pelo menos um cliente.";
  }

  if (payload.clients.some((client) => !client.name?.trim())) {
    return "O nome completo é obrigatório para todos os clientes.";
  }

  return null;
}
