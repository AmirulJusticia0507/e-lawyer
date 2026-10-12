import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CitationValidationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCitationDto } from './dto/citation.dto';
import { validateCitation } from './citation-validation';
import { resolveApplicability } from './legal-version';

const CITATION_INCLUDE = {
  article: {
    select: {
      id: true,
      unitKey: true,
      articleNumber: true,
      paragraphNumber: true,
      heading: true,
      content: true,
      status: true,
      effectiveFrom: true,
      effectiveUntil: true,
      regulation: {
        select: { id: true, slug: true, title: true, type: true, number: true, year: true, status: true },
      },
    },
  },
  case: { select: { id: true, caseNumber: true, title: true, jurisdiction: true, filedAt: true } },
} satisfies Prisma.CitationInclude;

type CitationWithRelations = Prisma.CitationGetPayload<{ include: typeof CITATION_INCLUDE }>;

export interface CitationView extends CitationWithRelations {
  applicability: ReturnType<typeof resolveApplicability>;
}

@Injectable()
export class CitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCase(caseId: string) {
    await this.ensureCase(caseId);
    const items = await this.prisma.citation.findMany({
      where: { caseId },
      include: CITATION_INCLUDE,
      orderBy: [{ documentType: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      items: items.map((item) => this.toView(item)),
      summary: this.summarize(items),
    };
  }

  async create(caseId: string, dto: CreateCitationDto) {
    const targetCase = await this.ensureCase(caseId);
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
      include: {
        regulation: { include: { amendmentsReceived: { select: { type: true, effectiveAt: true } } } },
        amendments: { select: { type: true, effectiveAt: true } },
      },
    });
    if (!article) {
      throw new NotFoundException('Pasal tidak ditemukan');
    }

    const referenceDate = dto.at ? new Date(dto.at) : new Date();
    const validation = validateCitation({
      article,
      regulation: article.regulation,
      articleAmendments: article.amendments,
      regulationAmendments: article.regulation.amendmentsReceived,
      context: {
        referenceDate,
        caseJurisdiction: targetCase.jurisdiction,
        documentDate: targetCase.filedAt,
      },
    });

    if (validation.status === CitationValidationStatus.INVALID && !dto.force) {
      throw new BadRequestException({
        message: 'Pasal ditolak karena tidak berlaku sebagai dasar hukum',
        issues: validation.issues,
      });
    }

    const citation = await this.prisma.citation.create({
      data: {
        articleId: article.id,
        caseId,
        quote: dto.quote,
        context: dto.context,
        documentType: dto.documentType,
        documentTitle: dto.documentTitle,
        validationStatus: validation.status,
        validationMessage: validation.message,
        validatedAt: new Date(),
      },
      include: CITATION_INCLUDE,
    });
    return this.toView(citation);
  }

  async remove(caseId: string, citationId: string): Promise<{ success: true }> {
    await this.ensureCase(caseId);
    const existing = await this.prisma.citation.findFirst({ where: { id: citationId, caseId } });
    if (!existing) {
      throw new NotFoundException('Sitasi tidak ditemukan pada perkara ini');
    }
    await this.prisma.citation.delete({ where: { id: citationId } });
    return { success: true };
  }

  /** Daftar "Dasar Hukum" otomatis untuk sebuah perkara. */
  async legalBasis(caseId: string) {
    const targetCase = await this.ensureCase(caseId);
    const items = await this.prisma.citation.findMany({
      where: { caseId },
      include: CITATION_INCLUDE,
      orderBy: [{ documentType: 'asc' }, { createdAt: 'asc' }],
    });

    const groups = new Map<
      string,
      {
        regulationId: string;
        regulationSlug: string;
        regulationTitle: string;
        regulationType: string;
        regulationNumber: string | null;
        regulationYear: number | null;
        regulationStatus: string;
        articles: { label: string; unitKey: string; id: string; content: string }[];
        worstStatus: CitationValidationStatus;
      }
    >();

    for (const item of items) {
      const { regulation } = item.article;
      const key = regulation.id;
      const group = groups.get(key) ?? {
        regulationId: regulation.id,
        regulationSlug: regulation.slug,
        regulationTitle: regulation.title,
        regulationType: regulation.type,
        regulationNumber: regulation.number,
        regulationYear: regulation.year,
        regulationStatus: regulation.status,
        articles: [],
        worstStatus: CitationValidationStatus.VALID,
      };
      group.articles.push({
        label: item.article.paragraphNumber
          ? `Pasal ${item.article.articleNumber} ayat ${item.article.paragraphNumber}`
          : `Pasal ${item.article.articleNumber}`,
        unitKey: item.article.unitKey,
        id: item.article.id,
        content: item.article.content,
      });
      if (severityRank(item.validationStatus) > severityRank(group.worstStatus)) {
        group.worstStatus = item.validationStatus;
      }
      groups.set(key, group);
    }

    const referenceDate = targetCase.filedAt ?? new Date();
    return {
      case: {
        id: targetCase.id,
        caseNumber: targetCase.caseNumber,
        title: targetCase.title,
        jurisdiction: targetCase.jurisdiction,
      },
      referenceDate: referenceDate.toISOString(),
      summary: this.summarize(items),
      flagged: items
        .filter((item) => item.validationStatus !== CitationValidationStatus.VALID)
        .map((item) => ({
          citationId: item.id,
          label: item.article.unitKey,
          status: item.validationStatus,
          message: item.validationMessage,
        })),
      regulations: [...groups.values()].map((group) => ({
        ...group,
        label: formatRegulationLabel(
          group.regulationType,
          group.regulationNumber,
          group.regulationYear,
          group.regulationTitle,
        ),
      })),
    };
  }

  /** Validasi ulang seluruh sitasi sebuah perkara, misalnya setelah kurasi peraturan diperbarui. */
  async revalidateCase(caseId: string) {
    const targetCase = await this.ensureCase(caseId);
    const items = await this.prisma.citation.findMany({ where: { caseId }, include: CITATION_INCLUDE });
    const articleIds = [...new Set(items.map((item) => item.articleId))];

    const articles = await this.prisma.article.findMany({
      where: { id: { in: articleIds } },
      include: {
        regulation: { include: { amendmentsReceived: { select: { type: true, effectiveAt: true } } } },
        amendments: { select: { type: true, effectiveAt: true } },
      },
    });
    const byId = new Map(articles.map((article) => [article.id, article]));
    const referenceDate = targetCase.filedAt ?? new Date();

    const updated = [];
    for (const item of items) {
      const article = byId.get(item.articleId);
      if (!article) continue;
      const validation = validateCitation({
        article,
        regulation: article.regulation,
        articleAmendments: article.amendments,
        regulationAmendments: article.regulation.amendmentsReceived,
        context: {
          referenceDate,
          caseJurisdiction: targetCase.jurisdiction,
          documentDate: targetCase.filedAt,
        },
      });
      updated.push(
        this.prisma.citation.update({
          where: { id: item.id },
          data: {
            validationStatus: validation.status,
            validationMessage: validation.message,
            validatedAt: new Date(),
          },
        }),
      );
    }

    await this.prisma.$transaction(updated);
    const refreshed = await this.findByCase(caseId);
    return {
      revalidated: updated.length,
      flagged: refreshed.summary.warning + refreshed.summary.invalid,
      items: refreshed,
    };
  }

  /** Cross-reference: pasal lain yang amending, peraturan lain yang mengubah, dan ko-sitasi. */
  async crossReference(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, unitKey: true, articleNumber: true, regulationId: true },
    });
    if (!article) {
      throw new NotFoundException('Pasal tidak ditemukan');
    }

    const [amendments, coRegulations, relatedCitations] = await Promise.all([
      this.prisma.amendment.findMany({
        where: { articleId },
        include: { amendingRegulation: { select: { slug: true, title: true, type: true, year: true } } },
        orderBy: { effectiveAt: 'desc' },
      }),
      this.prisma.article.findMany({
        where: {
          regulationId: { not: article.regulationId },
          articleNumber: article.articleNumber,
          regulation: {
            amendmentsMade: { some: { amendedRegulationId: article.regulationId } },
          },
        },
        select: {
          id: true,
          unitKey: true,
          regulation: { select: { slug: true, title: true, type: true, year: true, number: true } },
        },
        take: 20,
      }),
      this.prisma.citation.findMany({
        where: { articleId },
        select: {
          id: true,
          case: { select: { id: true, caseNumber: true, title: true } },
        },
        take: 20,
      }),
    ]);

    return {
      article,
      amendments,
      coRegulations,
      citedIn: relatedCitations,
    };
  }

  private toView(citation: CitationWithRelations): CitationView {
    return {
      ...citation,
      applicability: resolveApplicability(citation.article, new Date()),
    };
  }

  private summarize(items: CitationWithRelations[]) {
    const counts = {
      total: items.length,
      valid: 0,
      warning: 0,
      invalid: 0,
      pending: 0,
    };
    for (const item of items) {
      switch (item.validationStatus) {
        case CitationValidationStatus.VALID:
          counts.valid += 1;
          break;
        case CitationValidationStatus.WARNING:
          counts.warning += 1;
          break;
        case CitationValidationStatus.INVALID:
          counts.invalid += 1;
          break;
        default:
          counts.pending += 1;
      }
    }
    return counts;
  }

  private async ensureCase(id: string) {
    const targetCase = await this.prisma.case.findUnique({
      where: { id },
      select: { id: true, caseNumber: true, title: true, jurisdiction: true, filedAt: true },
    });
    if (!targetCase) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }
    return targetCase;
  }
}

function severityRank(status: CitationValidationStatus): number {
  switch (status) {
    case CitationValidationStatus.INVALID:
      return 3;
    case CitationValidationStatus.WARNING:
      return 2;
    case CitationValidationStatus.PENDING:
      return 1;
    default:
      return 0;
  }
}

function formatRegulationLabel(
  type: string,
  number: string | null,
  year: number | null,
  title: string,
): string {
  const short: Record<string, string> = {
    LAW: 'UU',
    GOVERNMENT_REGULATION: 'PP',
    PRESIDENTIAL_REGULATION: 'Perpres',
    MINISTERIAL_REGULATION: 'Permen',
    SUPREME_COURT_REGULATION: 'PERMA',
    SUPREME_COURT_CIRCULAR: 'SEMA',
    CIVIL_CODE: 'KUHPerdata',
    CRIMINAL_CODE: 'KUHP',
    PROCEDURAL_LAW: 'HIR/RBg',
    CONSTITUTION: 'UUD',
  };
  const prefix = short[type];
  const identity = [prefix, number, year].filter(Boolean).join(' ');
  return identity ? `${identity} — ${title}` : title;
}