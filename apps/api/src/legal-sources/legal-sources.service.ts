import { Injectable, NotFoundException } from '@nestjs/common';
import { LegalSourceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPagination, toPaginated } from '../common/utils/pagination';
import {
  LookupArticleDto,
  QueryArticleDto,
  QueryArticleInRegulationDto,
  QueryRegulationDto,
} from './dto/legal-source.dto';
import {
  Applicability,
  resolveApplicability,
  resolveStatusAt,
  buildVersionTimeline,
  VersionEvent,
} from './legal-version';

const REGULATION_SUMMARY: Prisma.RegulationSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  number: true,
  year: true,
  status: true,
  jurisdiction: true,
  effectiveFrom: true,
  effectiveUntil: true,
};

type RegulationSummary = Prisma.RegulationGetPayload<{ select: typeof REGULATION_SUMMARY }>;

const periodFilter = (at: Date) => ({
  effectiveFrom: { lte: at },
  AND: [{ OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: at } }] }],
});

export interface ArticleCatalogItem {
  id: string;
  unitKey: string;
  articleNumber: string;
  paragraphNumber: string | null;
  heading: string | null;
  content: string;
  status: LegalSourceStatus;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  applicability: Applicability;
  regulation: RegulationSummary;
}

@Injectable()
export class LegalSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findRegulations(query: QueryRegulationDto) {
    const pagination = getPagination(query.page, query.limit);
    const at = query.at ? new Date(query.at) : undefined;
    const where: Prisma.RegulationWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.jurisdiction ? { jurisdiction: query.jurisdiction } : {}),
      ...(query.year ? { year: query.year } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { number: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { sourceName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(at ? periodFilter(at) : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.regulation.findMany({
        where,
        include: {
          _count: { select: { articles: true } },
          amendmentsReceived: {
            select: { type: true, effectiveAt: true },
            orderBy: { effectiveAt: 'asc' },
          },
        },
        orderBy: [{ year: 'desc' }, { number: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.regulation.count({ where }),
    ]);

    const referenceDate = at ?? new Date();
    return toPaginated(
      items.map((regulation) => ({
        ...regulation,
        statusAt: resolveStatusAt(regulation, regulation.amendmentsReceived, referenceDate),
        applicability: resolveApplicability(regulation, referenceDate),
      })),
      total,
      pagination,
    );
  }

  async findRegulationBySlug(slug: string, at?: string) {
    const regulation = await this.prisma.regulation.findUnique({
      where: { slug },
      include: {
        amendmentsMade: {
          select: {
            id: true,
            type: true,
            effectiveAt: true,
            note: true,
            amendedRegulation: { select: REGULATION_SUMMARY },
          },
        },
        amendmentsReceived: {
          select: {
            id: true,
            type: true,
            effectiveAt: true,
            note: true,
            articleId: true,
            amendingRegulation: { select: REGULATION_SUMMARY },
          },
          orderBy: { effectiveAt: 'asc' },
        },
        _count: { select: { articles: true } },
      },
    });
    if (!regulation) {
      throw new NotFoundException('Peraturan tidak ditemukan');
    }

    const referenceDate = at ? new Date(at) : new Date();
    const facts = regulation.amendmentsReceived.map((item) => ({
      type: item.type,
      effectiveAt: item.effectiveAt,
    }));
    const timeline = this.withNotes(
      buildVersionTimeline(regulation, facts),
      regulation.amendmentsReceived,
    );

    return {
      ...regulation,
      statusAt: resolveStatusAt(regulation, facts, referenceDate),
      applicability: resolveApplicability(regulation, referenceDate),
      timeline,
    };
  }

  async findArticles(query: QueryArticleDto) {
    const pagination = getPagination(query.page, query.limit);
    const at = query.at ? new Date(query.at) : undefined;
    const regulationFilter: Prisma.RegulationWhereInput = {
      ...(query.regulationSlug ? { slug: query.regulationSlug } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.jurisdiction ? { jurisdiction: query.jurisdiction } : {}),
    };
    const where: Prisma.ArticleWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.articleNumber ? { articleNumber: query.articleNumber } : {}),
      ...(Object.keys(regulationFilter).length > 0 ? { regulation: regulationFilter } : {}),
      ...(query.search
        ? {
            OR: [
              { content: { contains: query.search, mode: 'insensitive' } },
              { heading: { contains: query.search, mode: 'insensitive' } },
              { articleNumber: { contains: query.search, mode: 'insensitive' } },
              { regulation: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(at ? periodFilter(at) : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: { regulation: { select: REGULATION_SUMMARY } },
        orderBy: [{ regulation: { year: 'desc' } }, { articleNumber: 'asc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.article.count({ where }),
    ]);

    const referenceDate = at ?? new Date();
    const items: ArticleCatalogItem[] = rows.map((article) => ({
      id: article.id,
      unitKey: article.unitKey,
      articleNumber: article.articleNumber,
      paragraphNumber: article.paragraphNumber,
      heading: article.heading,
      content: article.content,
      status: article.status,
      effectiveFrom: article.effectiveFrom,
      effectiveUntil: article.effectiveUntil,
      applicability: resolveApplicability(article, referenceDate),
      regulation: article.regulation,
    }));

    return toPaginated(items, total, pagination);
  }

  async findArticlesInRegulation(slug: string, query: QueryArticleInRegulationDto) {
    await this.ensureRegulation(slug);
    return this.findArticles({
      page: query.page,
      limit: query.limit,
      regulationSlug: slug,
      status: query.status,
      at: query.at,
    });
  }

  async findArticleById(id: string, at?: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        regulation: { select: REGULATION_SUMMARY },
        amendments: {
          select: {
            id: true,
            type: true,
            effectiveAt: true,
            note: true,
            amendingRegulation: { select: REGULATION_SUMMARY },
          },
          orderBy: { effectiveAt: 'asc' },
        },
        _count: { select: { citations: true } },
      },
    });
    if (!article) {
      throw new NotFoundException('Pasal tidak ditemukan');
    }

    const referenceDate = at ? new Date(at) : new Date();
    const facts = article.amendments.map((item) => ({
      type: item.type,
      effectiveAt: item.effectiveAt,
    }));
    const statusAt = resolveStatusAt(article, facts, referenceDate);
    const timeline = this.withNotes(
      buildVersionTimeline({ ...article, status: statusAt }, facts),
      article.amendments,
    );

    return {
      ...article,
      statusAt,
      applicability: resolveApplicability(article, referenceDate),
      regulationApplicability: resolveApplicability(article.regulation, referenceDate),
      timeline,
    };
  }

  async lookupArticle(dto: LookupArticleDto) {
    const at = dto.at ? new Date(dto.at) : new Date();
    const regulation = await this.prisma.regulation.findUnique({
      where: { slug: dto.regulationSlug },
      select: { id: true },
    });
    if (!regulation) {
      throw new NotFoundException('Peraturan tidak ditemukan');
    }

    const candidates = await this.prisma.article.findMany({
      where: {
        regulationId: regulation.id,
        articleNumber: dto.articleNumber,
        ...(dto.paragraphNumber ? { paragraphNumber: dto.paragraphNumber } : {}),
      },
      orderBy: [{ effectiveFrom: 'desc' }, { unitKey: 'asc' }],
      take: 20,
    });
    if (candidates.length === 0) {
      throw new NotFoundException(
        `Pasal ${dto.articleNumber}${dto.paragraphNumber ? ` ayat ${dto.paragraphNumber}` : ''} tidak ditemukan pada peraturan ini`,
      );
    }

    const applicable = candidates.find(
      (article) => resolveApplicability(article, at).state === 'APPLICABLE',
    );
    const selected = applicable ?? candidates[0];

    return {
      matches: candidates.map((article) => ({
        id: article.id,
        unitKey: article.unitKey,
        articleNumber: article.articleNumber,
        paragraphNumber: article.paragraphNumber,
        status: article.status,
        effectiveFrom: article.effectiveFrom,
        effectiveUntil: article.effectiveUntil,
        applicability: resolveApplicability(article, at),
      })),
      selected: await this.findArticleById(selected.id, dto.at),
    };
  }

  private withNotes(
    timeline: VersionEvent[],
    amendments: { effectiveAt: Date | null; note: string | null }[],
  ): VersionEvent[] {
    return timeline.map((event) => ({
      ...event,
      note:
        amendments.find(
          (item) => item.effectiveAt?.toISOString().slice(0, 10) === event.date,
        )?.note ?? null,
    }));
  }

  private async ensureRegulation(slug: string): Promise<void> {
    const existing = await this.prisma.regulation.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Peraturan tidak ditemukan');
    }
  }
}