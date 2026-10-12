import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  LegalSourceDataset,
  RegulationInput,
  parseLegalSourceDataset,
} from '../src/legal-sources/ingest-schema';

const prisma = new PrismaClient();

function resolveInputPath(input: string): string {
  if (isAbsolute(input)) return input;
  const fromCurrentDirectory = resolve(input);
  if (existsSync(fromCurrentDirectory)) return fromCurrentDirectory;
  return resolve(process.cwd(), '../..', input);
}

function date(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

function checksum(regulation: RegulationInput): string {
  return createHash('sha256').update(JSON.stringify(regulation)).digest('hex');
}

async function ingest(dataset: LegalSourceDataset): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const regulationIds = new Map<string, string>();
      const articleIds = new Map<string, string>();

      for (const input of dataset.regulations) {
        const data = {
          type: input.type,
          number: input.number ?? null,
          year: input.year ?? null,
          title: input.title,
          jurisdiction: input.jurisdiction ?? null,
          status: input.status,
          issuedAt: date(input.issuedAt),
          effectiveFrom: date(input.effectiveFrom),
          effectiveUntil: date(input.effectiveUntil),
          sourceUrl: input.sourceUrl ?? null,
          sourceName: input.sourceName ?? null,
          checksum: checksum(input),
        };
        const regulation = await tx.regulation.upsert({
          where: { slug: input.slug },
          update: data,
          create: { slug: input.slug, ...data },
        });
        regulationIds.set(input.slug, regulation.id);

        for (const articleInput of input.articles) {
          const articleData = {
            articleNumber: articleInput.articleNumber,
            paragraphNumber: articleInput.paragraphNumber ?? null,
            heading: articleInput.heading ?? null,
            content: articleInput.content,
            status: articleInput.status,
            effectiveFrom: date(articleInput.effectiveFrom),
            effectiveUntil: date(articleInput.effectiveUntil),
          };
          const article = await tx.article.upsert({
            where: {
              regulationId_unitKey: { regulationId: regulation.id, unitKey: articleInput.unitKey },
            },
            update: articleData,
            create: {
              regulationId: regulation.id,
              unitKey: articleInput.unitKey,
              ...articleData,
            },
          });
          articleIds.set(`${input.slug}:${articleInput.unitKey}`, article.id);
        }
      }

      for (const input of dataset.amendments) {
        const amendingRegulationId = regulationIds.get(input.amendingRegulationSlug)!;
        const amendedRegulationId = regulationIds.get(input.amendedRegulationSlug)!;
        const articleId = input.articleUnitKey
          ? articleIds.get(`${input.amendedRegulationSlug}:${input.articleUnitKey}`)
          : null;
        const existing = await tx.amendment.findFirst({
          where: { amendingRegulationId, amendedRegulationId, articleId, type: input.type },
        });
        const data = {
          effectiveAt: date(input.effectiveAt),
          note: input.note ?? null,
        };
        if (existing) {
          await tx.amendment.update({ where: { id: existing.id }, data });
        } else {
          await tx.amendment.create({
            data: {
              amendingRegulationId,
              amendedRegulationId,
              articleId,
              type: input.type,
              ...data,
            },
          });
        }
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  if (fileIndex < 0 || !args[fileIndex + 1]) {
    throw new Error('Penggunaan: npm run legal:ingest -- --file <dataset.json> [--dry-run]');
  }
  const filePath = resolveInputPath(args[fileIndex + 1]);
  const dataset = parseLegalSourceDataset(JSON.parse(await readFile(filePath, 'utf8')) as unknown);
  const articleCount = dataset.regulations.reduce((total, item) => total + item.articles.length, 0);

  if (args.includes('--dry-run')) {
    console.log(
      `Valid: ${dataset.regulations.length} peraturan, ${articleCount} pasal, ${dataset.amendments.length} perubahan`,
    );
    return;
  }

  await ingest(dataset);
  console.log(
    `Berhasil: ${dataset.regulations.length} peraturan, ${articleCount} pasal, ${dataset.amendments.length} perubahan`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
