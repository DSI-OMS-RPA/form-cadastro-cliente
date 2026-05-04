// Hashes plain-text passwords in config/users.json using scrypt.
// Safe to run multiple times — already-hashed entries are skipped.
// Run: node scripts/hash-passwords.mjs

import { randomBytes, scrypt } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const usersFile = join(__dirname, "..", "config", "users.json");

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const PREFIX = "scrypt";

const scryptAsync = promisify(scrypt);

async function hashPassword(plain) {
  const salt = randomBytes(32).toString("hex");
  const hash = await scryptAsync(plain, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `${PREFIX}:${salt}:${hash.toString("hex")}`;
}

async function main() {
  const content = await readFile(usersFile, "utf8");
  const users = JSON.parse(content);
  let changed = 0;

  for (const user of users) {
    if (user.password.startsWith(`${PREFIX}:`)) {
      console.log(`  Ignorado (já encriptado): ${user.username}`);
      continue;
    }
    console.log(`  A encriptar password de: ${user.username}`);
    user.password = await hashPassword(user.password);
    changed++;
  }

  if (changed > 0) {
    await writeFile(usersFile, JSON.stringify(users, null, 2) + "\n", "utf8");
    console.log(`\nConcluído: ${changed} password(s) encriptada(s).`);
  } else {
    console.log("\nNada a fazer — todas as passwords já estão encriptadas.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
