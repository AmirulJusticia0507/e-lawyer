import {
  AmendmentType,
  CitationValidationStatus,
  Jurisdiction,
  LegalSourceStatus,
} from '@prisma/client';
import { validateCitation } from './citation-validation';

const day = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const activeArticle = {
  status: LegalSourceStatus.ACTIVE,
  effectiveFrom: day('2020-01-01'),
  effectiveUntil: null,
};

const activeRegulation = {
  status: LegalSourceStatus.ACTIVE,
  effectiveFrom: day('2020-01-01'),
  effectiveUntil: null,
  jurisdiction: Jurisdiction.CIVIL,
};

const baseInput = {
  article: activeArticle,
  regulation: activeRegulation,
  context: { referenceDate: day('2024-06-01') },
};

describe('validateCitation', () => {
  it('pasal yang berlaku berstatus VALID tanpa issue', () => {
    const result = validateCitation(baseInput);
    expect(result.status).toBe(CitationValidationStatus.VALID);
    expect(result.issues).toHaveLength(0);
  });

  it('menolak pasal yang telah dicabut', () => {
    const result = validateCitation({
      ...baseInput,
      article: { ...activeArticle, status: LegalSourceStatus.REPEALED },
    });
    expect(result.status).toBe(CitationValidationStatus.INVALID);
    expect(result.issues.map((issue) => issue.code)).toContain('ARTICLE_REPEALED');
  });

  it('menolak pasal yang masa berlakunya sudah habis', () => {
    const result = validateCitation({
      ...baseInput,
      article: { ...activeArticle, effectiveUntil: day('2023-12-31') },
    });
    expect(result.status).toBe(CitationValidationStatus.INVALID);
    expect(result.issues.map((issue) => issue.code)).toContain('ARTICLE_REPEALED');
  });

  it('menolak peraturan yang dicabut meskipun pasalnya aktif', () => {
    const result = validateCitation({
      ...baseInput,
      regulation: { ...activeRegulation, status: LegalSourceStatus.REPEALED },
    });
    expect(result.status).toBe(CitationValidationStatus.INVALID);
    expect(result.issues.map((issue) => issue.code)).toContain('REGULATION_REPEALED');
  });

  it('menolak pasal yang belum berlaku pada tanggal acuan', () => {
    const result = validateCitation({
      ...baseInput,
      article: { ...activeArticle, effectiveFrom: day('2025-01-01') },
    });
    expect(result.status).toBe(CitationValidationStatus.INVALID);
    expect(result.issues.map((issue) => issue.code)).toContain('ARTICLE_NOT_YET_EFFECTIVE');
  });

  it('menandai warning ketika pasal pernah diubah', () => {
    const result = validateCitation({
      ...baseInput,
      articleAmendments: [{ type: AmendmentType.AMENDS, effectiveAt: day('2023-01-01') }],
    });
    expect(result.status).toBe(CitationValidationStatus.WARNING);
    expect(result.issues.map((issue) => issue.code)).toContain('ARTICLE_AMENDED');
  });

  it('mengabaikan amendment yang belum berlaku', () => {
    const result = validateCitation({
      ...baseInput,
      articleAmendments: [{ type: AmendmentType.AMENDS, effectiveAt: day('2026-01-01') }],
      regulationAmendments: [{ type: AmendmentType.REPEALS, effectiveAt: day('2026-01-01') }],
    });
    expect(result.status).toBe(CitationValidationStatus.VALID);
  });

  it('menandai warning ketika peraturan digantikan peraturan lain', () => {
    const result = validateCitation({
      ...baseInput,
      regulationAmendments: [{ type: AmendmentType.REPLACES, effectiveAt: day('2024-01-01') }],
    });
    expect(result.status).toBe(CitationValidationStatus.WARNING);
    expect(result.issues.map((issue) => issue.code)).toContain('REGULATION_AMENDED');
  });

  it('menandai warning untuk sumber yang statusnya belum terkurasi', () => {
    const result = validateCitation({
      ...baseInput,
      article: { ...activeArticle, status: LegalSourceStatus.UNKNOWN },
    });
    expect(result.status).toBe(CitationValidationStatus.WARNING);
    expect(result.issues.map((issue) => issue.code)).toContain('STATUS_UNVERIFIED');
  });

  it('menandai warning untuk sumber berstatus rancangan', () => {
    const result = validateCitation({
      ...baseInput,
      regulation: { ...activeRegulation, status: LegalSourceStatus.DRAFT },
    });
    expect(result.issues.map((issue) => issue.code)).toContain('DRAFT_SOURCE');
  });

  it('menandai warning ketika lingkungan peradilan berbeda', () => {
    const result = validateCitation({
      ...baseInput,
      context: { referenceDate: day('2024-06-01'), caseJurisdiction: Jurisdiction.CRIMINAL },
    });
    expect(result.status).toBe(CitationValidationStatus.WARNING);
    expect(result.issues.map((issue) => issue.code)).toContain('JURISDICTION_MISMATCH');
  });

  it('tidak menandai konflik ketika lingkungan peradilan sama', () => {
    const result = validateCitation({
      ...baseInput,
      context: { referenceDate: day('2024-06-01'), caseJurisdiction: Jurisdiction.CIVIL },
    });
    expect(result.issues).toHaveLength(0);
  });

  it('mengabaikan lingkungan peradilan OTHER', () => {
    const result = validateCitation({
      ...baseInput,
      regulation: { ...activeRegulation, jurisdiction: Jurisdiction.OTHER },
      context: { referenceDate: day('2024-06-01'), caseJurisdiction: Jurisdiction.ADMINISTRATIVE },
    });
    expect(result.status).toBe(CitationValidationStatus.VALID);
  });

  it('menandai warning ketika dokumen tersimpan sebelum pasal berlaku', () => {
    const result = validateCitation({
      ...baseInput,
      context: {
        referenceDate: day('2024-06-01'),
        documentDate: day('2019-01-01'),
      },
    });
    expect(result.status).toBe(CitationValidationStatus.WARNING);
    expect(result.issues.map((issue) => issue.code)).toContain(
      'ARTICLE_NOT_YET_EFFECTIVE_AT_DOCUMENT',
    );
  });

  it('issue invalid lebih berat daripada warning', () => {
    const result = validateCitation({
      ...baseInput,
      article: { ...activeArticle, status: LegalSourceStatus.REPEALED },
      articleAmendments: [{ type: AmendmentType.AMENDS, effectiveAt: day('2023-01-01') }],
    });
    expect(result.status).toBe(CitationValidationStatus.INVALID);
    expect(result.issues.length).toBeGreaterThan(1);
  });

  it('pesan ringkasan menyertakan seluruh issue', () => {
    const result = validateCitation({
      ...baseInput,
      article: { ...activeArticle, status: LegalSourceStatus.REPEALED },
    });
    for (const issue of result.issues) {
      expect(result.message).toContain(issue.message);
    }
  });
});