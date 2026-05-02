// Migrates existing registrations.jsonl → cadastro.db (SQLite/Prisma)
// Run once: node scripts/migrate-jsonl.mjs

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const jsonlPath = join(root, "storage", "registrations.jsonl");

const prisma = new PrismaClient();

async function main() {
  let content;
  try {
    content = await readFile(jsonlPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("Nenhum ficheiro JSONL encontrado. Nada a migrar.");
      return;
    }
    throw err;
  }

  const lines = content.split(/\r?\n/).filter(Boolean);
  console.log(`A migrar ${lines.length} registo(s)...`);

  let migrated = 0;
  let skipped = 0;

  for (const line of lines) {
    const rec = JSON.parse(line);

    const exists = await prisma.registration.findUnique({ where: { id: rec.id } });
    if (exists) {
      console.log(`  Ignorado (já existe): ${rec.id}`);
      skipped++;
      continue;
    }

    await prisma.registration.create({
      data: {
        id: rec.id,
        createdAt: new Date(rec.createdAt),
        updatedAt: rec.updatedAt ? new Date(rec.updatedAt) : null,
        createdByUser: rec.createdBy?.username ?? "desconhecido",
        createdByName: rec.createdBy?.name ?? "Desconhecido",
        createdByRole: rec.createdBy?.role ?? "operador",
        island: rec.location.island,
        council: rec.location.council,
        zone: rec.location.zone,
        neighborhood: rec.location.neighborhood,
        street: rec.location.street ?? null,
        doorReference: rec.location.doorReference ?? null,
        housingType: rec.location.housingType,
        housingStatus: rec.location.housingStatus,
        apartmentCount: rec.location.apartmentCount ?? null,
        latitude: rec.location.gps.latitude,
        longitude: rec.location.gps.longitude,
        accuracy: rec.location.gps.accuracy ?? null,
        clients: {
          create: (rec.clients ?? []).map((c) => ({
            name: c.name,
            phone: c.phone ?? null,
            nif: c.nif ?? null,
            document: c.document ?? null,
            serviceNumber: c.serviceNumber ?? null,
            floor: c.floor ?? null,
            apartmentLocation: c.apartmentLocation ?? null,
          })),
        },
      },
    });

    console.log(`  Migrado: ${rec.id}`);
    migrated++;
  }

  console.log(`\nConcluído: ${migrated} migrado(s), ${skipped} ignorado(s).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
