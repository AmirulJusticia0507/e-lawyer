import { AmendmentType, Jurisdiction, LegalSourceStatus, RegulationType } from '@prisma/client';

export interface LegalSourceArticleInput {
  unitKey: string;
  articleNumber: string;
  paragraphNumber?: string;
  heading?: string;
  content: string;
  status?: LegalSourceStatus;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

export interface RegulationInput {
  slug: string;
  type: RegulationType;
  number?: string;
  year?: number;
  title: string;
  jurisdiction?: Jurisdiction;
  status?: LegalSourceStatus;
  issuedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  sourceUrl?: string;
  sourceName?: string;
  articles: LegalSourceArticleInput[];
}

export interface AmendmentInput {
  amendingRegulationSlug: string;
  amendedRegulationSlug: string;
  articleUnitKey?: string;
  type?: AmendmentType;
  effectiveAt?: string;
  note?: string;
}

export interface LegalSourceDataset {
  version: 1;
  regulations: RegulationInput[];
  amendments: AmendmentInput[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} wajib berupa string non-kosong`);
  }
  return value.trim();
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredString(value, path);
}

function enumValue<T extends string>(
  value: unknown,
  values: Record<string, T>,
  path: string,
  fallback?: T,
): T {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !Object.values(values).includes(value as T)) {
    throw new Error(`${path} tidak valid`);
  }
  return value as T;
}

function optionalDate(value: unknown, path: string): string | undefined {
  const text = optionalString(value, path);
  if (text === undefined) return undefined;
  if (Number.isNaN(Date.parse(text))) throw new Error(`${path} bukan tanggal ISO yang valid`);
  return text;
}

function assertPeriod(from: string | undefined, until: string | undefined, path: string): void {
  if (from && until && Date.parse(until) < Date.parse(from)) {
    throw new Error(`${path}.effectiveUntil tidak boleh sebelum effectiveFrom`);
  }
}

function parseArticle(value: unknown, path: string): LegalSourceArticleInput {
  if (!isRecord(value)) throw new Error(`${path} wajib berupa object`);
  const effectiveFrom = optionalDate(value.effectiveFrom, `${path}.effectiveFrom`);
  const effectiveUntil = optionalDate(value.effectiveUntil, `${path}.effectiveUntil`);
  assertPeriod(effectiveFrom, effectiveUntil, path);

  return {
    unitKey: requiredString(value.unitKey, `${path}.unitKey`),
    articleNumber: requiredString(value.articleNumber, `${path}.articleNumber`),
    paragraphNumber: optionalString(value.paragraphNumber, `${path}.paragraphNumber`),
    heading: optionalString(value.heading, `${path}.heading`),
    content: requiredString(value.content, `${path}.content`),
    status: enumValue(value.status, LegalSourceStatus, `${path}.status`, LegalSourceStatus.ACTIVE),
    effectiveFrom,
    effectiveUntil,
  };
}

function parseRegulation(value: unknown, path: string): RegulationInput {
  if (!isRecord(value)) throw new Error(`${path} wajib berupa object`);
  if (!Array.isArray(value.articles)) throw new Error(`${path}.articles wajib berupa array`);
  const effectiveFrom = optionalDate(value.effectiveFrom, `${path}.effectiveFrom`);
  const effectiveUntil = optionalDate(value.effectiveUntil, `${path}.effectiveUntil`);
  assertPeriod(effectiveFrom, effectiveUntil, path);
  const articles = value.articles.map((item, index) =>
    parseArticle(item, `${path}.articles[${index}]`),
  );
  const unitKeys = new Set<string>();
  for (const article of articles) {
    if (unitKeys.has(article.unitKey))
      throw new Error(`${path} memiliki unitKey duplikat: ${article.unitKey}`);
    unitKeys.add(article.unitKey);
  }

  const year = value.year;
  if (
    year !== undefined &&
    (!Number.isInteger(year) || (year as number) < 1800 || (year as number) > 2200)
  ) {
    throw new Error(`${path}.year tidak valid`);
  }

  return {
    slug: requiredString(value.slug, `${path}.slug`).toLowerCase(),
    type: enumValue(value.type, RegulationType, `${path}.type`),
    number: optionalString(value.number, `${path}.number`),
    year: year as number | undefined,
    title: requiredString(value.title, `${path}.title`),
    jurisdiction:
      value.jurisdiction === undefined
        ? undefined
        : enumValue(value.jurisdiction, Jurisdiction, `${path}.jurisdiction`),
    status: enumValue(value.status, LegalSourceStatus, `${path}.status`, LegalSourceStatus.UNKNOWN),
    issuedAt: optionalDate(value.issuedAt, `${path}.issuedAt`),
    effectiveFrom,
    effectiveUntil,
    sourceUrl: optionalString(value.sourceUrl, `${path}.sourceUrl`),
    sourceName: optionalString(value.sourceName, `${path}.sourceName`),
    articles,
  };
}

function parseAmendment(value: unknown, path: string): AmendmentInput {
  if (!isRecord(value)) throw new Error(`${path} wajib berupa object`);
  return {
    amendingRegulationSlug: requiredString(
      value.amendingRegulationSlug,
      `${path}.amendingRegulationSlug`,
    ).toLowerCase(),
    amendedRegulationSlug: requiredString(
      value.amendedRegulationSlug,
      `${path}.amendedRegulationSlug`,
    ).toLowerCase(),
    articleUnitKey: optionalString(value.articleUnitKey, `${path}.articleUnitKey`),
    type: enumValue(value.type, AmendmentType, `${path}.type`, AmendmentType.AMENDS),
    effectiveAt: optionalDate(value.effectiveAt, `${path}.effectiveAt`),
    note: optionalString(value.note, `${path}.note`),
  };
}

export function parseLegalSourceDataset(value: unknown): LegalSourceDataset {
  if (!isRecord(value)) throw new Error('Dataset wajib berupa object');
  if (value.version !== 1) throw new Error('Dataset version wajib bernilai 1');
  if (!Array.isArray(value.regulations)) throw new Error('regulations wajib berupa array');
  if (value.amendments !== undefined && !Array.isArray(value.amendments)) {
    throw new Error('amendments wajib berupa array');
  }

  const regulations = value.regulations.map((item, index) =>
    parseRegulation(item, `regulations[${index}]`),
  );
  const amendments = (value.amendments ?? []).map((item, index) =>
    parseAmendment(item, `amendments[${index}]`),
  );
  const slugs = new Set<string>();
  for (const regulation of regulations) {
    if (slugs.has(regulation.slug)) throw new Error(`slug peraturan duplikat: ${regulation.slug}`);
    slugs.add(regulation.slug);
  }
  for (const amendment of amendments) {
    if (amendment.amendingRegulationSlug === amendment.amendedRegulationSlug) {
      throw new Error('Peraturan pengubah dan yang diubah harus berbeda');
    }
    if (
      !slugs.has(amendment.amendingRegulationSlug) ||
      !slugs.has(amendment.amendedRegulationSlug)
    ) {
      throw new Error('Referensi amendment harus ada dalam dataset yang sama');
    }
    if (amendment.articleUnitKey) {
      const target = regulations.find((item) => item.slug === amendment.amendedRegulationSlug);
      if (!target?.articles.some((article) => article.unitKey === amendment.articleUnitKey)) {
        throw new Error(`articleUnitKey amendment tidak ditemukan: ${amendment.articleUnitKey}`);
      }
    }
  }

  return { version: 1, regulations, amendments };
}
