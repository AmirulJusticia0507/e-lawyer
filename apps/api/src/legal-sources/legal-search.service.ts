import { BadRequestException, Injectable } from '@nestjs/common';
import { JurisprudenceStatus, LegalSourceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchLegalSourcesDto, SemanticSearchDto } from './dto/legal-source.dto';
import { buildTsQuery, distanceToScore, toVectorLiteral, validateEmbedding } from './search-query';
import { resolveApplicability } from './legal-version';

export type SearchKind = 'ARTICLE' | 'REGULATION' | 'JURISPRUDENCE';

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  snippet: string;
  rank: number;
  url: string;
  regulation: { slug: string; title: string; number: string | null; year: number | null } | null;
  status: string;
  applicability?: ReturnType<typeof resolveApplicability>;
}

interface RawArticleHit {
  id: string;
  articleNumber: string;
  paragraphNumber: string | null;
  heading: string | null;
  content: string;
  status: LegalSourceStatus;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  regulationSlug: string;
  regulationTitle: string;
  regulationNumber: string | null;
  regulationYear: number | null;
}

interface RawRegulationHit {
  id: string;
  slug: string;
  title: string;
  number: string | null;
  year: number | null;
  status: LegalSourceStatus;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

interface RawJurisprudenceHit {
  id: string;
  decisionNumber: string;
  courtName: string;
  status: JurisprudenceStatus;
}

@Injectable()
export class LegalSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pencarian full-text terindeks GIN pada kolom tsvector. */
  async search(dto: SearchLegalSourcesDto) {
    const tsQuery = buildTsQuery(dto.q);
    const referenceDate = dto.at ? new Date(dto.at) : new Date();
    if (!tsQuery) {
      return { query: dto.q, tsQuery: null, at: referenceDate.toISOString(), total: 0, items: [] };
    }

    const limit = dto.limit ?? 20;
    const kinds: SearchKind[] = dto.kind
      ? [dto.kind]
      : ['ARTICLE', 'REGULATION', 'JURISPRUDENCE'];

    const [articles, regulations, jurisprudence] = await Promise.all([
      kinds.includes('ARTICLE')
        ? this.searchArticles(tsQuery, limit, referenceDate)
        : Promise.resolve([]),
      kinds.includes('REGULATION')
        ? this.searchRegulations(tsQuery, limit, referenceDate)
        : Promise.resolve([]),
      kinds.includes('JURISPRUDENCE') ? this.searchJurisprudence(tsQuery, limit) : Promise.resolve([]),
    ]);

    const items = [...articles, ...regulations, ...jurisprudence].sort((a, b) => b.rank - a.rank);

    return {
      query: dto.q,
      tsQuery,
      at: referenceDate.toISOString(),
      total: items.length,
      items,
    };
  }

  /** Pencarian semantik pgvector; embedding disediakan pipeline AI (F8). */
  async semanticSearch(dto: SemanticSearchDto) {
    const check = validateEmbedding(dto.embedding);
    if (!check.valid) {
      throw new BadRequestException(check.reason);
    }
    const vector = toVectorLiteral(dto.embedding);
    const limit = dto.limit ?? 20;
    const referenceDate = new Date();

    const articles = await this.prisma.$queryRaw<
      (RawArticleHit & { distance: number })[]
    >(Prisma.sql`
      SELECT a.id,
             a."articleNumber",
             a."paragraphNumber",
             a.heading,
             a.content,
             a.status,
             a."effectiveFrom",
             a."effectiveUntil",
             r.slug AS "regulationSlug",
             r.title AS "regulationTitle",
             r.number AS "regulationNumber",
             r.year AS "regulationYear",
             (a.embedding <=> ${vector}::vector)::float8 AS distance
      FROM "Article" a
      JOIN "Regulation" r ON r.id = a."regulationId"
      WHERE a.embedding IS NOT NULL
      ORDER BY a.embedding <=> ${vector}::vector
      LIMIT ${limit}
    `);
    const jurisprudence = await this.prisma.$queryRaw<
      (RawJurisprudenceHit & { distance: number })[]
    >(Prisma.sql`
      SELECT j.id, j."decisionNumber", j."courtName", j.status,
             (j.embedding <=> ${vector}::vector)::float8 AS distance
      FROM "Jurisprudence" j
      WHERE j.embedding IS NOT NULL
      ORDER BY j.embedding <=> ${vector}::vector
      LIMIT ${limit}
    `);

    const items = [
      ...articles.map((row) => ({
        ...this.toArticleHit(row, referenceDate),
        rank: distanceToScore(row.distance),
        snippet: row.content.slice(0, 300),
      })),
      ...jurisprudence.map((row) => ({
        ...this.toJurisprudenceHit(row),
        rank: distanceToScore(row.distance),
        snippet: '',
      })),
    ].sort((a, b) => b.rank - a.rank);

    return { dimensions: dto.embedding.length, total: items.length, items };
  }

  private async searchArticles(tsQuery: string, limit: number, at: Date): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<(RawArticleHit & { rank: number; snippet: string })[]>(
      Prisma.sql`
        SELECT a.id,
               a."articleNumber",
               a."paragraphNumber",
               a.heading,
               a.content,
               a.status,
               a."effectiveFrom",
               a."effectiveUntil",
               r.slug AS "regulationSlug",
               r.title AS "regulationTitle",
               r.number AS "regulationNumber",
               r.year AS "regulationYear",
               ts_rank(a."searchVector", websearch_to_tsquery('simple', ${tsQuery}))::float8 AS rank,
               ts_headline('simple', a.content, websearch_to_tsquery('simple', ${tsQuery}),
                 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MinWords=8, MaxWords=25') AS snippet
        FROM "Article" a
        JOIN "Regulation" r ON r.id = a."regulationId"
        WHERE a."searchVector" @@ websearch_to_tsquery('simple', ${tsQuery})
        ORDER BY rank DESC, a."articleNumber" ASC
        LIMIT ${limit}
      `,
    );
    return rows.map((row) => ({ ...this.toArticleHit(row, at), rank: row.rank, snippet: row.snippet }));
  }

  private async searchRegulations(tsQuery: string, limit: number, at: Date): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<
      (RawRegulationHit & { rank: number; snippet: string })[]
    >(Prisma.sql`
      SELECT r.id, r.slug, r.title, r.number, r.year, r.status,
             r."effectiveFrom", r."effectiveUntil",
             ts_rank(r."searchVector", websearch_to_tsquery('simple', ${tsQuery}))::float8 AS rank,
             ts_headline('simple', r.title, websearch_to_tsquery('simple', ${tsQuery}),
               'StartSel=<mark>, StopSel=</mark>') AS snippet
      FROM "Regulation" r
      WHERE r."searchVector" @@ websearch_to_tsquery('simple', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `);
    return rows.map((row) => ({
      kind: 'REGULATION' as const,
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      rank: row.rank,
      url: `/peraturan/${row.slug}`,
      status: row.status,
      applicability: resolveApplicability(row, at),
      regulation: { slug: row.slug, title: row.title, number: row.number, year: row.year },
    }));
  }

  private async searchJurisprudence(tsQuery: string, limit: number): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<
      (RawJurisprudenceHit & { rank: number; snippet: string })[]
    >(Prisma.sql`
      SELECT j.id, j."decisionNumber", j."courtName", j.status,
             ts_rank(j."searchVector", websearch_to_tsquery('simple', ${tsQuery}))::float8 AS rank,
             ts_headline('simple',
               coalesce(j.summary, '') || ' ' || coalesce(j."legalHolding", ''),
               websearch_to_tsquery('simple', ${tsQuery}),
               'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MinWords=8, MaxWords=25') AS snippet
      FROM "Jurisprudence" j
      WHERE j."searchVector" @@ websearch_to_tsquery('simple', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `);
    return rows.map((row) => ({ ...this.toJurisprudenceHit(row), rank: row.rank, snippet: row.snippet }));
  }

  private toArticleHit(row: RawArticleHit, at: Date): SearchHit {
    const label = row.heading
      ? `Pasal ${row.articleNumber} — ${row.heading}`
      : `Pasal ${row.articleNumber}${row.paragraphNumber ? ` ayat ${row.paragraphNumber}` : ''}`;
    return {
      kind: 'ARTICLE',
      id: row.id,
      title: `${label} · ${row.regulationTitle}`,
      snippet: row.content,
      rank: 0,
      url: `/peraturan/${row.regulationSlug}?pasal=${encodeURIComponent(row.id)}`,
      status: row.status,
      applicability: resolveApplicability(row, at),
      regulation: {
        slug: row.regulationSlug,
        title: row.regulationTitle,
        number: row.regulationNumber,
        year: row.regulationYear,
      },
    };
  }

  private toJurisprudenceHit(row: RawJurisprudenceHit): Omit<SearchHit, 'rank' | 'snippet'> {
    return {
      kind: 'JURISPRUDENCE',
      id: row.id,
      title: `${row.courtName} No. ${row.decisionNumber}`,
      url: `/yurisprudensi/${row.id}`,
      status: row.status,
      regulation: null,
    };
  }
}