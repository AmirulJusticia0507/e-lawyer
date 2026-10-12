export type ClientType = 'PERSON' | 'ORGANIZATION';
export type Jurisdiction =
  | 'CIVIL'
  | 'CRIMINAL'
  | 'ADMINISTRATIVE'
  | 'RELIGIOUS'
  | 'MILITARY'
  | 'ARBITRATION'
  | 'OTHER';
export type CaseStatus = 'NEW' | 'ACTIVE' | 'POSTPONED' | 'DECIDED' | 'CLOSED' | 'ARCHIVED';
export type PartySide =
  | 'PLAINTIFF'
  | 'DEFENDANT'
  | 'APPLICANT'
  | 'RESPONDENT'
  | 'ACCUSED'
  | 'THIRD_PARTY'
  | 'OTHER';
export type InteractionType = 'CALL' | 'EMAIL' | 'MEETING' | 'HEARING' | 'DOCUMENT' | 'OTHER';

export type ConsultationMode = 'CHAT' | 'VIDEO' | 'PHONE' | 'IN_PERSON';
export type ConsultationStatus = 'REQUESTED' | 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type ConsultationMessageType = 'TEXT' | 'FILE' | 'SYSTEM';
export type VideoSessionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED';

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: UserInfo;
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Client {
  id: string;
  type: ClientType;
  fullName: string;
  nik?: string | null;
  npwp?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: Record<string, unknown> | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Party {
  id: string;
  side: PartySide;
  name: string;
  type: ClientType;
  nik?: string | null;
  npwp?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  client?: { id: string; fullName: string } | null;
  case?: { id: string; caseNumber: string; title: string; status: CaseStatus } | null;
}

export interface Interaction {
  id: string;
  type: InteractionType;
  title: string;
  description?: string | null;
  occurredAt: string;
  createdAt: string;
  createdBy?: { id: string; fullName: string } | null;
}

export interface Assignment {
  id: string;
  fromUser?: { id: string; fullName: string } | null;
  toUser: { id: string; fullName: string };
  assignedBy?: { id: string; fullName: string } | null;
  note?: string | null;
  createdAt: string;
}

export interface CaseSummary {
  id: string;
  caseNumber: string;
  title: string;
  jurisdiction: Jurisdiction;
  caseType?: string | null;
  status: CaseStatus;
  courtName?: string | null;
  filedAt?: string | null;
  filedBy?: { id: string; fullName: string } | null;
  assignedTo?: { id: string; fullName: string } | null;
  parties: { id: string; name: string; side: PartySide }[];
  _count: { interactions: number };
  updatedAt: string;
}

export interface CaseDetail extends Omit<CaseSummary, 'parties' | '_count'> {
  description?: string | null;
  createdAt: string;
  parties: Party[];
  interactions: Interaction[];
  assignments: Assignment[];
}

export interface MetaInfo {
  clientTypes: string[];
  jurisdictions: string[];
  caseStatuses: string[];
  partySides: string[];
  interactionTypes: string[];
  consultationModes: string[];
  consultationStatuses: string[];
  messageTypes: string[];
  videoSessionStatuses: string[];
  regulationTypes: string[];
  legalSourceStatuses: string[];
  amendmentTypes: string[];
  citationValidationStatuses: string[];
  citationDocumentTypes: string[];
  jurisprudenceStatuses: string[];
  integrityEntityTypes: string[];
  integrityCheckResults: string[];
  receiptStatuses: string[];
  anomalyTypes: string[];
  anomalySeverities: string[];
  anomalyStatuses: string[];
  deadlineStatuses: string[];
}

export interface ConsultationAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  sha256: string;
  scanStatus: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
  createdAt: string;
}

export interface ConsultationMessage {
  id: string;
  type: ConsultationMessageType;
  body?: string | null;
  ciphertext?: string | null;
  createdAt: string;
  sender?: { id: string; fullName: string } | null;
  attachments: ConsultationAttachment[];
}

export interface VideoSession {
  id: string;
  roomId: string;
  provider: string;
  status: VideoSessionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
}

export interface ConsultationSummary {
  id: string;
  subject: string;
  description?: string | null;
  mode: ConsultationMode;
  status: ConsultationStatus;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  updatedAt: string;
  client: { id: string; fullName: string };
  assignedTo?: { id: string; fullName: string } | null;
  _count: { messages: number };
}

export interface ConsultationDetail {
  id: string;
  client: { id: string; fullName: string; email?: string | null; phone?: string | null };
  case?: { id: string; caseNumber: string; title: string } | null;
  requestedBy?: { id: string; fullName: string; email?: string | null } | null;
  assignedTo?: { id: string; fullName: string; email?: string | null } | null;
  subject: string;
  description?: string | null;
  mode: ConsultationMode;
  status: ConsultationStatus;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ConsultationMessage[];
  videoSessions: VideoSession[];
}
export type RegulationType =
  | 'CONSTITUTION'
  | 'LAW'
  | 'GOVERNMENT_REGULATION'
  | 'PRESIDENTIAL_REGULATION'
  | 'MINISTERIAL_REGULATION'
  | 'SUPREME_COURT_REGULATION'
  | 'SUPREME_COURT_CIRCULAR'
  | 'CIVIL_CODE'
  | 'CRIMINAL_CODE'
  | 'PROCEDURAL_LAW'
  | 'LOCAL_REGULATION'
  | 'OTHER';

export type LegalSourceStatus = 'DRAFT' | 'ACTIVE' | 'AMENDED' | 'REPEALED' | 'UNKNOWN';
export type AmendmentType = 'AMENDS' | 'REPEALS' | 'REPLACES' | 'SUPPLEMENTS';
export type CitationValidationStatus = 'PENDING' | 'VALID' | 'WARNING' | 'INVALID';
export type CitationDocumentType =
  | 'GUGATAN'
  | 'JAWABAN'
  | 'REPLIK'
  | 'DUPLIK'
  | 'KESIMPULAN'
  | 'PUTUSAN'
  | 'MEMO'
  | 'LAINNYA';

export type ApplicabilityState =
  | 'APPLICABLE'
  | 'NOT_YET_EFFECTIVE'
  | 'EXPIRED'
  | 'REPEALED'
  | 'DRAFT'
  | 'UNKNOWN';

export interface Applicability {
  state: ApplicabilityState;
  label: string;
  message: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

export interface RegulationSummary {
  id: string;
  slug: string;
  title: string;
  type: RegulationType;
  number: string | null;
  year: number | null;
  status: LegalSourceStatus;
  jurisdiction?: Jurisdiction | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

export interface RegulationListItem extends RegulationSummary {
  statusAt: LegalSourceStatus;
  applicability: Applicability;
  _count: { articles: number };
}

export interface VersionEvent {
  date: string | null;
  type: 'EFFECTIVE' | 'AMENDED' | 'REPEALED';
  label: string;
  note: string | null;
}

export interface Amendment {
  id: string;
  type: AmendmentType;
  effectiveAt: string | null;
  note: string | null;
  articleId?: string | null;
  amendingRegulation?: { slug: string; title: string; type: RegulationType; year: number | null };
  amendedRegulation?: { slug: string; title: string; type: RegulationType; year: number | null };
}

export interface RegulationDetail extends RegulationSummary {
  sourceUrl: string | null;
  sourceName: string | null;
  issuedAt: string | null;
  statusAt: LegalSourceStatus;
  applicability: Applicability;
  amendmentsMade: Amendment[];
  amendmentsReceived: Amendment[];
  timeline: VersionEvent[];
  _count: { articles: number };
}

export interface ArticleCatalogItem {
  id: string;
  unitKey: string;
  articleNumber: string;
  paragraphNumber: string | null;
  heading: string | null;
  content: string;
  status: LegalSourceStatus;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  applicability: Applicability;
  regulation: RegulationSummary;
}

export interface ArticleDetail extends ArticleCatalogItem {
  amendments: Amendment[];
  statusAt: LegalSourceStatus;
  regulationApplicability: Applicability;
  timeline: VersionEvent[];
  _count: { citations: number };
}

export interface ArticleLookup {
  matches: {
    id: string;
    unitKey: string;
    articleNumber: string;
    paragraphNumber: string | null;
    status: LegalSourceStatus;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
    applicability: Applicability;
  }[];
  selected: ArticleDetail;
}

export interface Citation {
  id: string;
  articleId: string;
  caseId: string | null;
  quote: string | null;
  context: string | null;
  documentType: CitationDocumentType | null;
  documentTitle: string | null;
  validationStatus: CitationValidationStatus;
  validationMessage: string | null;
  validatedAt: string | null;
  createdAt: string;
  article: ArticleCatalogItem;
  applicability: Applicability;
}

export interface CitationList {
  items: Citation[];
  summary: { total: number; valid: number; warning: number; invalid: number; pending: number };
}

export interface LegalBasis {
  case: { id: string; caseNumber: string; title: string; jurisdiction: Jurisdiction };
  referenceDate: string;
  summary: CitationList['summary'];
  flagged: {
    citationId: string;
    label: string;
    status: CitationValidationStatus;
    message: string | null;
  }[];
  regulations: {
    regulationId: string;
    regulationSlug: string;
    regulationTitle: string;
    regulationType: RegulationType;
    regulationNumber: string | null;
    regulationYear: number | null;
    regulationStatus: LegalSourceStatus;
    label: string;
    worstStatus: CitationValidationStatus;
    articles: { label: string; unitKey: string; id: string; content: string }[];
  }[];
}

export type SearchKind = 'ARTICLE' | 'REGULATION' | 'JURISPRUDENCE';

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  snippet: string;
  rank: number;
  url: string;
  status: string;
  regulation: { slug: string; title: string; number: string | null; year: number | null } | null;
  applicability?: Applicability;
}

export interface SearchResult {
  query: string;
  tsQuery: string | null;
  at: string;
  total: number;
  items: SearchHit[];
}

export interface ArticleCrossReference {
  article: { id: string; unitKey: string; articleNumber: string; regulationId: string };
  amendments: (Amendment & { amendingRegulation: { slug: string; title: string; type: RegulationType; year: number | null } })[];
  coRegulations: {
    id: string;
    unitKey: string;
    regulation: { slug: string; title: string; type: RegulationType; year: number | null; number: string | null };
  }[];
  citedIn: { id: string; case: { id: string; caseNumber: string; title: string } }[];
}

export type IntegrityEntityType = 'ATTACHMENT' | 'ADDENDUM' | 'OFFICIAL_COPY';
export type IntegrityCheckResult = 'MATCH' | 'MISMATCH' | 'MISSING_FILE';
export type ReceiptStatus = 'SENT' | 'CONFIRMED' | 'DISPUTED' | 'EXPIRED';
export type AnomalyType =
  | 'UPLOAD_BURST'
  | 'BACKDATE_SUSPECT'
  | 'CLAIM_CHANGED'
  | 'DELAY_PATTERN'
  | 'HASH_MISMATCH'
  | 'DEADLINE_BREACH';
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnomalyStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type DeadlineStatus = 'OPEN' | 'MET' | 'BREACHED' | 'CANCELLED';

export interface IntegrityRecordSummary {
  id: string;
  entityType: IntegrityEntityType;
  entityId: string;
  caseId: string | null;
  consultationId: string | null;
  sha256: string;
  algorithm: string;
  sizeBytes: number | null;
  storageKey: string | null;
  anchorHash: string | null;
  anchoredAt: string | null;
  tsaUrl: string | null;
  createdAt: string;
  recordedBy: { id: string; fullName: string } | null;
}

export interface IntegrityCheck {
  id: string;
  recordId: string;
  expectedSha256: string;
  actualSha256: string | null;
  result: IntegrityCheckResult;
  note: string | null;
  createdAt: string;
  checkedBy: { id: string; fullName: string } | null;
}

export interface DocumentReceiptItem {
  id: string;
  caseId: string;
  recordId: string;
  recipientPartyId: string;
  senderId: string | null;
  status: ReceiptStatus;
  token: string;
  sentAt: string;
  confirmedAt: string | null;
  confirmNote: string | null;
  recipientParty: { id: string; name: string; side: string };
  record: IntegrityRecordSummary;
}

export interface AddendumItem {
  id: string;
  caseId: string;
  recordId: string;
  authorId: string | null;
  title: string;
  content: string;
  createdAt: string;
  author: { id: string; fullName: string } | null;
  record: IntegrityRecordSummary;
}

export interface CaseDeadlineItem {
  id: string;
  caseId: string;
  label: string;
  dueAt: string;
  status: DeadlineStatus;
  extensionCount: number;
  lastExtensionReason: string | null;
  extendedAt: string | null;
  breachedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnomalyFlag {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  caseId: string | null;
  recordId: string | null;
  subject: string;
  subjectId: string | null;
  message: string;
  details: Record<string, unknown> | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedBy?: { id: string; fullName: string } | null;
  case?: { id: string; caseNumber: string; title: string } | null;
}

export interface CaseIntegrity {
  records: (IntegrityRecordSummary & {
    latestCheck: { recordId: string; result: IntegrityCheckResult; createdAt: string } | null;
  })[];
  addenda: AddendumItem[];
  receipts: DocumentReceiptItem[];
  deadlines: CaseDeadlineItem[];
  anomalies: AnomalyFlag[];
}