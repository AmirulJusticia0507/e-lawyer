import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { LegalSourceDataset, RegulationInput } from './ingest-schema';

function date(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

function checksum(regulation: RegulationInput): string {
  return createHash('sha256').update(JSON.stringify(regulation)).digest('hex');
}

export async function ingestLegalSourceDataset(
  client: PrismaClient,
  dataset: LegalSourceDataset,
): Promise<void> {
  await client.$transaction(
    async (tx: Prisma.TransactionClient) => {
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
              regulationId_unitKey: {
                regulationId: regulation.id,
                unitKey: articleInput.unitKey,
              },
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

export function countDataset(dataset: LegalSourceDataset): {
  regulations: number;
  articles: number;
  amendments: number;
} {
  return {
    regulations: dataset.regulations.length,
    articles: dataset.regulations.reduce((total, item) => total + item.articles.length, 0),
    amendments: dataset.amendments.length,
  };
}
