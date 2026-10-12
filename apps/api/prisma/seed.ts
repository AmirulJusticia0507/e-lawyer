import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  key,
} from '../src/common/constants/permissions';
import { ROLE_DESCRIPTIONS, RoleName } from '../src/common/constants/roles';
import { countDataset, ingestLegalSourceDataset } from '../src/legal-sources/ingest';
import { parseLegalSourceDataset } from '../src/legal-sources/ingest-schema';

const prisma = new PrismaClient();

async function seedPermissions(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const def of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { action_subject: { action: def.action, subject: def.subject } },
      update: { description: def.description },
      create: { action: def.action, subject: def.subject, description: def.description },
    });
    map.set(key(def.action, def.subject), permission.id);
  }
  return map;
}

async function seedRoles(permissionIds: Map<string, string>): Promise<void> {
  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: ROLE_DESCRIPTIONS[name] },
      create: { name, description: ROLE_DESCRIPTIONS[name], isSystem: true },
    });

    const perms = ROLE_PERMISSIONS[name] ?? [];
    for (const permKey of perms) {
      const permissionId = permissionIds.get(permKey);
      if (!permissionId) {
        console.warn(`Permission "${permKey}" tidak dikenal, dilewati`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
}

async function seedAdmin(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@elawyer.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  const passwordHash = await bcrypt.hash(password, rounds);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName: 'Administrator',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: { create: { role: { connect: { name: RoleName.ADMIN } } } },
    },
  });
  console.log(`Admin siap: ${email}`);
}

async function seedLegalSources(): Promise<void> {
  const datasetPath = resolve(__dirname, 'legal-sources.seed.json');
  if (!existsSync(datasetPath)) {
    console.warn('legal-sources.seed.json tidak ditemukan, seed katalog hukum dilewati');
    return;
  }
  const dataset = parseLegalSourceDataset(
    JSON.parse(await readFile(datasetPath, 'utf8')) as unknown,
  );
  await ingestLegalSourceDataset(prisma, dataset);
  const counts = countDataset(dataset);
  console.log(
    `Katalog hukum siap: ${counts.regulations} peraturan, ${counts.articles} pasal, ${counts.amendments} perubahan`,
  );
}

async function main(): Promise<void> {
  console.log('Seeding e-Lawyer...');
  const permissionIds = await seedPermissions();
  await seedRoles(permissionIds);
  await seedAdmin();
  await seedLegalSources();
  console.log('Seeding selesai.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
