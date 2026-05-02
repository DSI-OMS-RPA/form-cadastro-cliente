import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ClientPayload = {
  name: string;
  gender?: string;
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

const registrationWithClients = {
  include: { clients: true },
} as const;

function toApiShape(reg: Awaited<ReturnType<typeof findOne>>) {
  return {
    id: reg.id,
    createdAt: reg.createdAt.toISOString(),
    updatedAt: reg.updatedAt?.toISOString() ?? null,
    createdBy: {
      username: reg.createdByUser,
      name: reg.createdByName,
      role: reg.createdByRole,
    },
    location: {
      island: reg.island,
      council: reg.council,
      zone: reg.zone,
      neighborhood: reg.neighborhood,
      street: reg.street ?? undefined,
      doorReference: reg.doorReference ?? undefined,
      housingType: reg.housingType,
      housingStatus: reg.housingStatus,
      apartmentCount: reg.apartmentCount ?? undefined,
      gps: {
        latitude: reg.latitude,
        longitude: reg.longitude,
        accuracy: reg.accuracy ?? undefined,
      },
    },
    clients: reg.clients.map((c) => ({
      name: c.name,
      gender: c.gender ?? undefined,
      phone: c.phone ?? undefined,
      nif: c.nif ?? undefined,
      document: c.document ?? undefined,
      serviceNumber: c.serviceNumber ?? undefined,
      floor: c.floor ?? undefined,
      apartmentLocation: c.apartmentLocation ?? undefined,
    })),
  };
}

async function findOne(id: string) {
  const reg = await prisma.registration.findUniqueOrThrow({
    where: { id },
    ...registrationWithClients,
  });
  return reg;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const where = user.role === "admin" ? {} : { createdByUser: user.username };

  const records = await prisma.registration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...registrationWithClients,
  });

  return NextResponse.json({ registrations: records.map(toApiShape) });
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

  const reg = await prisma.registration.create({
    data: {
      createdByUser: user.username,
      createdByName: user.name,
      createdByRole: user.role,
      island: payload.location.island,
      council: payload.location.council,
      zone: payload.location.zone,
      neighborhood: payload.location.neighborhood,
      street: payload.location.street ?? null,
      doorReference: payload.location.doorReference ?? null,
      housingType: payload.location.housingType,
      housingStatus: payload.location.housingStatus,
      apartmentCount: payload.location.apartmentCount ?? null,
      latitude: payload.location.gps.latitude,
      longitude: payload.location.gps.longitude,
      accuracy: payload.location.gps.accuracy ?? null,
      clients: {
        create: payload.clients.map((c) => ({
          name: c.name,
          gender: c.gender ?? null,
          phone: c.phone ?? null,
          nif: c.nif ?? null,
          document: c.document ?? null,
          serviceNumber: c.serviceNumber ?? null,
          floor: c.floor ?? null,
          apartmentLocation: c.apartmentLocation ?? null,
        })),
      },
    },
    ...registrationWithClients,
  });

  return NextResponse.json({ ok: true, id: reg.id });
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
    return NextResponse.json(
      { error: "Identificador do prédio/residência em falta." },
      { status: 400 }
    );
  }

  if (!payload.client?.name?.trim()) {
    return NextResponse.json(
      { error: "O nome completo do cliente é obrigatório." },
      { status: 400 }
    );
  }

  const existing = await prisma.registration.findUnique({
    where: { id: payload.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Prédio/residência não encontrado." },
      { status: 404 }
    );
  }

  if (user.role !== "admin" && existing.createdByUser !== user.username) {
    return NextResponse.json(
      { error: "Sem permissão para alterar este registo." },
      { status: 403 }
    );
  }

  const updated = await prisma.registration.update({
    where: { id: payload.id },
    data: {
      updatedAt: new Date(),
      clients: {
        create: {
          name: payload.client.name,
          gender: payload.client.gender ?? null,
          phone: payload.client.phone ?? null,
          nif: payload.client.nif ?? null,
          document: payload.client.document ?? null,
          serviceNumber: payload.client.serviceNumber ?? null,
          floor: payload.client.floor ?? null,
          apartmentLocation: payload.client.apartmentLocation ?? null,
        },
      },
    },
    ...registrationWithClients,
  });

  return NextResponse.json({ ok: true, registration: toApiShape(updated) });
}

function validateRegistration(payload: RegistrationPayload) {
  if (!payload?.location) {
    return "Dados de localização em falta.";
  }

  const requiredFields = [
    payload.location.island,
    payload.location.council,
    payload.location.zone,
    payload.location.neighborhood,
    payload.location.housingType,
    payload.location.housingStatus,
    payload.location.gps?.latitude,
    payload.location.gps?.longitude,
  ];

  if (requiredFields.some((v) => !String(v ?? "").trim())) {
    return "Preencha todos os campos obrigatórios da localização.";
  }

  if (!Array.isArray(payload.clients)) {
    return "A lista de clientes é inválida.";
  }

  if (payload.clients.some((c) => !c.name?.trim())) {
    return "O nome completo é obrigatório para todos os clientes.";
  }

  return null;
}
