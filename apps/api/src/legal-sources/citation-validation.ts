import {
  AmendmentType,
  CitationValidationStatus,
  Jurisdiction,
  LegalSourceStatus,
} from '@prisma/client';
import { Applicability, ApplicabilityState, resolveApplicability } from './legal-version';

export interface CitationSubject {
  status: LegalSourceStatus;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

export interface CitationRegulation extends CitationSubject {
  jurisdiction?: Jurisdiction | null;
}

export interface CitationContext {
  referenceDate: Date;
  caseJurisdiction?: Jurisdiction | null;
  documentDate?: Date | null;
}

export interface ValidationIssue {
  code: string;
  severity: CitationValidationStatus;
  message: string;
}

export interface CitationValidationResult {
  status: CitationValidationStatus;
  message: string;
  issues: ValidationIssue[];
}

const REGULATION_LABEL = 'peraturan';
const ARTICLE_LABEL = 'pasal';

export interface ValidateCitationInput {
  article: CitationSubject;
  regulation: CitationRegulation;
  articleAmendments?: { type: AmendmentType; effectiveAt: Date | null }[];
  regulationAmendments?: { type: AmendmentType; effectiveAt: Date | null }[];
  context: CitationContext;
}

function block(state: ApplicabilityState): boolean {
  return state === 'REPEALED' || state === 'EXPIRED';
}

export function validateCitation(input: ValidateCitationInput): CitationValidationResult {
  const { article, regulation, context } = input;
  const issues: ValidationIssue[] = [];

  const regulationApplicability = resolveApplicability(regulation, context.referenceDate);
  const articleApplicability = resolveApplicability(article, context.referenceDate);

  if (block(regulationApplicability.state)) {
    issues.push({
      code: 'REGULATION_REPEALED',
      severity: CitationValidationStatus.INVALID,
      message: `${REGULATION_LABEL} ini telah dicabut sehingga tidak dapat dijadikan dasar hukum.`,
    });
  }
  if (block(articleApplicability.state)) {
    issues.push({
      code: 'ARTICLE_REPEALED',
      severity: CitationValidationStatus.INVALID,
      message: `${ARTICLE_LABEL} ini sudah tidak berlaku sehingga tidak dapat dijadikan dasar hukum.`,
    });
  }

  if (regulationApplicability.state === 'NOT_YET_EFFECTIVE') {
    issues.push({
      code: 'REGULATION_NOT_YET_EFFECTIVE',
      severity: CitationValidationStatus.INVALID,
      message: `${REGULATION_LABEL} ini belum berlaku pada tanggal acuan (${regulationApplicability.message})`,
    });
  }
  if (articleApplicability.state === 'NOT_YET_EFFECTIVE') {
    issues.push({
      code: 'ARTICLE_NOT_YET_EFFECTIVE',
      severity: CitationValidationStatus.INVALID,
      message: `${ARTICLE_LABEL} ini belum berlaku pada tanggal acuan (${articleApplicability.message})`,
    });
  }

  if (
    hasAmendmentEffective(input.regulationAmendments, context.referenceDate, [
      AmendmentType.REPEALS,
      AmendmentType.REPLACES,
    ])
  ) {
    issues.push({
      code: 'REGULATION_AMENDED',
      severity: CitationValidationStatus.WARNING,
      message:
        'Peraturan ini pernah diubah/digantikan — pastikan kutipan sesuai dengan redaksi terbaru.',
    });
  }
  if (
    hasAmendmentEffective(input.articleAmendments, context.referenceDate, [
      AmendmentType.AMENDS,
      AmendmentType.REPLACES,
      AmendmentType.SUPPLEMENTS,
    ])
  ) {
    issues.push({
      code: 'ARTICLE_AMENDED',
      severity: CitationValidationStatus.WARNING,
      message: 'Pasal ini pernah diubah — pastikan kutipan sesuai dengan redaksi terbaru.',
    });
  }

  if (regulation.status === LegalSourceStatus.UNKNOWN || article.status === LegalSourceStatus.UNKNOWN) {
    issues.push({
      code: 'STATUS_UNVERIFIED',
      severity: CitationValidationStatus.WARNING,
      message: 'Status keberlakuan sumber belum terkurasi, verifikasi manual sebelum digunakan.',
    });
  }
  if (regulation.status === LegalSourceStatus.DRAFT || article.status === LegalSourceStatus.DRAFT) {
    issues.push({
      code: 'DRAFT_SOURCE',
      severity: CitationValidationStatus.WARNING,
      message: 'Sumber masih berstatus rancangan.',
    });
  }

  if (
    context.caseJurisdiction &&
    regulation.jurisdiction &&
    regulation.jurisdiction !== Jurisdiction.OTHER &&
    regulation.jurisdiction !== context.caseJurisdiction
  ) {
    issues.push({
      code: 'JURISDICTION_MISMATCH',
      severity: CitationValidationStatus.WARNING,
      message: `Lingkungan peradilan peraturan (${regulation.jurisdiction}) berbeda dari lingkungan perkara (${context.caseJurisdiction}).`,
    });
  }

  if (
    context.documentDate &&
    article.effectiveFrom &&
    context.documentDate.getTime() < article.effectiveFrom.getTime()
  ) {
    issues.push({
      code: 'ARTICLE_NOT_YET_EFFECTIVE_AT_DOCUMENT',
      severity: CitationValidationStatus.WARNING,
      message:
        'Dokumen disimpan sebelum pasal ini berlaku — kemungkinan salah kutipan redaksi atau tanggal.',
    });
  }

  const status = worstStatus(issues);
  return {
    status,
    message: summarize(issues, status, articleApplicability),
    issues,
  };
}

function hasAmendmentEffective(
  amendments: { type: AmendmentType; effectiveAt: Date | null }[] | undefined,
  at: Date,
  types: AmendmentType[],
): boolean {
  return (amendments ?? []).some(
    (item) =>
      types.includes(item.type) &&
      item.effectiveAt !== null &&
      item.effectiveAt.getTime() <= at.getTime(),
  );
}

function worstStatus(issues: ValidationIssue[]): CitationValidationStatus {
  if (issues.some((issue) => issue.severity === CitationValidationStatus.INVALID)) {
    return CitationValidationStatus.INVALID;
  }
  if (issues.some((issue) => issue.severity === CitationValidationStatus.WARNING)) {
    return CitationValidationStatus.WARNING;
  }
  if (issues.length > 0) return CitationValidationStatus.PENDING;
  return CitationValidationStatus.VALID;
}

function summarize(
  issues: ValidationIssue[],
  status: CitationValidationStatus,
  applicability: Applicability,
): string {
  if (status === CitationValidationStatus.VALID) {
    return `Pasal dapat dijadikan dasar hukum (${applicability.message})`;
  }
  return issues.map((issue) => issue.message).join(' ');
}