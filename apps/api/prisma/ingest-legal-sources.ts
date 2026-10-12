import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { parseLegalSourceDataset } from '../src/legal-sources/ingest-schema';
import { countDataset, ingestLegalSourceDataset } from '../src/legal-sources/ingest';

const prisma = new PrismaClient();

function resolveInputPath(input: string): string {
  if (isAbsolute(input)) return input;
  const fromCurrentDirectory = resolve(input);
  if (existsSync(fromCurrentDirectory)) return fromCurrentDirectory;
  return resolve(process.cwd(), '../..', input);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  if (fileIndex < 0 || !args[fileIndex + 1]) {
    throw new Error('Penggunaan: npm run legal:ingest -- --file <dataset.json> [--dry-run]');
  }
  const filePath = resolveInputPath(args[fileIndex + 1]);
  const dataset = parseLegalSourceDataset(JSON.parse(await readFile(filePath, 'utf8')) as unknown);
  const counts = countDataset(dataset);

  if (args.includes('--dry-run')) {
    console.log(
      `Valid: ${counts.regulations} peraturan, ${counts.articles} pasal, ${counts.amendments} perubahan`,
    );
    return;
  }

  await ingestLegalSourceDataset(prisma, dataset);
  console.log(
    `Berhasil: ${counts.regulations} peraturan, ${counts.articles} pasal, ${counts.amendments} perubahan`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
