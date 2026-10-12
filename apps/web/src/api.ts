import type {
  AddendumItem,
  AnomalyFlag,
  AnomalyStatus,
  AnomalyType,
  ArticleCatalogItem,
  ArticleCrossReference,
  ArticleDetail,
  ArticleLookup,
  AuthResult,
  CaseDetail,
  CaseDeadlineItem,
  CaseIntegrity,
  CaseStatus,
  CaseSummary,
  CitationDocumentType,
  CitationList,
  Client,
  ConsultationAttachment,
  ConsultationDetail,
  ConsultationMessage,
  ConsultationMode,
  ConsultationStatus,
  ConsultationSummary,
  DeadlineStatus,
  DocumentReceiptItem,
  DocumentTemplate,
  DocumentType,
  LegalDocument,
  Interaction,
  InteractionType,
  IntegrityCheck,
  IntegrityCheckResult,
  IntegrityEntityType,
  Jurisdiction,
  LegalBasis,
  LegalSourceStatus,
  MetaInfo,
  Paginated,
  Party,
  PartySide,
  ReceiptStatus,
  RegulationListItem,
  RegulationType,
  RegulationDetail,
  SearchKind,
  SearchResult,
  VideoSession,
} from './types';

const BASE = '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const ACCESS_KEY = 'el.access';
const REFRESH_KEY = 'el.refresh';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(t: { accessToken: string; refreshToken: string }): void {
  localStorage.setItem(ACCESS_KEY, t.accessToken);
  localStorage.setItem(REFRESH_KEY, t.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const token = getRefreshToken();
    if (!token) return null;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = (await res.json()) as AuthResult;
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const doFetch = (token?: string): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch(getAccessToken() ?? undefined);

  if (response.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(payload?.message ?? `HTTP ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  // Auth
  register: (dto: { email: string; password: string; fullName: string; phone?: string }) =>
    request<AuthResult>('/auth/register', { method: 'POST', body: dto, auth: false }),
  login: (dto: { email: string; password: string }) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: dto, auth: false }),
  logout: (refreshToken: string) =>
    request<{ success: true }>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  me: () => request<{ id: string; email: string; fullName: string; roles: string[]; permissions: string[] }>('/auth/me'),

  // Misc
  meta: () => request<MetaInfo>('/meta'),

  // Clients
  listClients: (params: { page?: number; limit?: number; search?: string } = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    return request<Paginated<Client>>(`/clients${q ? `?${q}` : ''}`);
  },
  createClient: (dto: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: dto }),
  updateClient: (id: string, dto: Partial<Client>) =>
    request<Client>(`/clients/${id}`, { method: 'PATCH', body: dto }),
  getClient: (id: string) => request<Client & { parties: Party[]; interactions: Interaction[] }>(`/clients/${id}`),
  deleteClient: (id: string) => request<{ success: true }>(`/clients/${id}`, { method: 'DELETE' }),

  // Cases
  listCases: (params: { page?: number; limit?: number; search?: string; status?: CaseStatus; jurisdiction?: Jurisdiction } = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
    ).toString();
    return request<Paginated<CaseSummary>>(`/cases${q ? `?${q}` : ''}`);
  },
  createCase: (dto: Partial<CaseSummary>) => request<CaseDetail>('/cases', { method: 'POST', body: dto }),
  getCase: (id: string) => request<CaseDetail>(`/cases/${id}`),
  updateCase: (id: string, dto: Partial<CaseSummary>) =>
    request<CaseDetail>(`/cases/${id}`, { method: 'PATCH', body: dto }),
  changeStatus: (id: string, status: CaseStatus) =>
    request<CaseDetail>(`/cases/${id}/status`, { method: 'POST', body: { status } }),
  assignCase: (id: string, toUserId: string, note?: string) =>
    request<CaseDetail>(`/cases/${id}/assign`, { method: 'POST', body: { toUserId, note } }),
  addParty: (id: string, dto: { side: PartySide; name: string; clientId?: string; notes?: string }) =>
    request<Party>(`/cases/${id}/parties`, { method: 'POST', body: dto }),
  addInteraction: (id: string, dto: { type: InteractionType; title: string; description?: string; occurredAt?: string }) =>
    request<Interaction>(`/cases/${id}/interactions`, { method: 'POST', body: dto }),

  // Dokumen, surat kuasa, putusan (F5)
  listDocuments: (params: { caseId?: string; type?: DocumentType; page?: number; limit?: number } = {}) =>
    request<{ items: LegalDocument[]; meta: Paginated<LegalDocument>['meta'] }>(`/documents${buildQuery(params)}`),
  getDocument: (id: string) => request<LegalDocument>(`/documents/${id}`),
  listDocumentTemplates: (type?: DocumentType) =>
    request<DocumentTemplate[]>(`/documents/templates${buildQuery({ type })}`),
  createDocumentTemplate: (dto: {
    name: string;
    documentType: DocumentType;
    jurisdiction: Jurisdiction;
    content?: string;
  }) => request<DocumentTemplate>('/documents/templates', { method: 'POST', body: dto }),
  createDocumentTemplateVersion: (
    id: string,
    dto: { name: string; documentType: DocumentType; jurisdiction: Jurisdiction; content?: string },
  ) => request<DocumentTemplate>(`/documents/templates/${id}/versions`, { method: 'POST', body: dto }),
  archiveDocumentTemplate: (id: string) =>
    request<{ success: true }>(`/documents/templates/${id}`, { method: 'DELETE' }),
  createDocument: (dto: {
    caseId: string;
    templateId?: string;
    type: DocumentType;
    title: string;
    content?: string;
    data?: Record<string, unknown>;
    powerOfAttorney?: Record<string, unknown>;
    judgment?: Record<string, unknown>;
  }) => request<LegalDocument>('/documents', { method: 'POST', body: dto }),
  updateDocument: (id: string, dto: { title?: string; content?: string; changeSummary?: string }) =>
    request<LegalDocument>(`/documents/${id}`, { method: 'PATCH', body: dto }),
  submitDocument: (id: string) =>
    request<LegalDocument>(`/documents/${id}/submit`, { method: 'POST', body: {} }),
  requestDocumentSignature: (id: string, dto: { signerName: string; signerRole: string; signerEmail?: string }) =>
    request<LegalDocument['signatures'] extends (infer T)[] | undefined ? T : never>(
      `/documents/${id}/signatures`,
      { method: 'POST', body: dto },
    ),

  // Consultations
  listConsultations: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: ConsultationStatus;
      mode?: ConsultationMode;
      clientId?: string;
      assignedToUserId?: string;
    } = {},
  ) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
    ).toString();
    return request<Paginated<ConsultationSummary>>(`/consultations${q ? `?${q}` : ''}`);
  },
  createConsultation: (dto: {
    clientId: string;
    caseId?: string;
    subject: string;
    description?: string;
    mode?: ConsultationMode;
    scheduledAt?: string;
    durationMinutes?: number;
  }) => request<ConsultationDetail>('/consultations', { method: 'POST', body: dto }),
  getConsultation: (id: string) => request<ConsultationDetail>(`/consultations/${id}`),
  updateConsultation: (id: string, dto: Partial<ConsultationDetail>) =>
    request<ConsultationDetail>(`/consultations/${id}`, { method: 'PATCH', body: dto }),
  changeConsultationStatus: (id: string, status: ConsultationStatus) =>
    request<ConsultationDetail>(`/consultations/${id}/status`, { method: 'POST', body: { status } }),
  assignConsultation: (id: string, dto: { toUserId: string; scheduledAt?: string; durationMinutes?: number }) =>
    request<ConsultationDetail>(`/consultations/${id}/assign`, { method: 'POST', body: dto }),
  sendMessage: (
    id: string,
    dto: { body?: string; type?: ConsultationMessage['type']; ciphertext?: string; iv?: string; algorithm?: string },
  ) => request<ConsultationMessage>(`/consultations/${id}/messages`, { method: 'POST', body: dto }),
  uploadAttachment: async (id: string, file: File, messageId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (messageId) form.append('messageId', messageId);
    let response = await fetch(`${BASE}/consultations/${id}/attachments/upload`, {
      method: 'POST',
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
      body: form,
    });
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${BASE}/consultations/${id}/attachments/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${newToken}` },
          body: form,
        });
      }
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(payload?.message ?? `HTTP ${response.status}`, response.status);
    }
    return (await response.json()) as ConsultationAttachment;
  },
  downloadAttachment: async (id: string, attachmentId: string) => {
    let response = await fetch(`${BASE}/consultations/${id}/attachments/${attachmentId}/download`, {
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    });
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(`${BASE}/consultations/${id}/attachments/${attachmentId}/download`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      }
    }
    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}`, response.status);
    }
    return response.blob();
  },
  createVideoSession: (id: string, provider?: string) =>
    request<VideoSession>(`/consultations/${id}/video-sessions`, { method: 'POST', body: provider ? { provider } : {} }),
  updateVideoSessionStatus: (id: string, sessionId: string, status: VideoSession['status']) =>
    request<VideoSession>(`/consultations/${id}/video-sessions/${sessionId}`, {
      method: 'PATCH',
      body: { status },
    }),

  // Basis peraturan & sitasi pasal
  listRegulations: (params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: RegulationType;
    status?: LegalSourceStatus;
    jurisdiction?: Jurisdiction;
    year?: number;
    at?: string;
  } = {}) => {
    const q = buildQuery(params);
    return request<Paginated<RegulationListItem>>(`/regulations${q}`);
  },
  getRegulation: (slug: string, at?: string) =>
    request<RegulationDetail>(`/regulations/${slug}${at ? `?at=${encodeURIComponent(at)}` : ''}`),
  listArticlesInRegulation: (
    slug: string,
    params: { page?: number; limit?: number; status?: LegalSourceStatus; at?: string } = {},
  ) => {
    const q = buildQuery(params);
    return request<Paginated<ArticleCatalogItem>>(`/regulations/${slug}/articles${q}`);
  },
  listArticles: (params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: RegulationType;
    status?: LegalSourceStatus;
    jurisdiction?: Jurisdiction;
    regulationSlug?: string;
    articleNumber?: string;
    at?: string;
  } = {}) => {
    const q = buildQuery(params);
    return request<Paginated<ArticleCatalogItem>>(`/articles${q}`);
  },
  getArticle: (id: string, at?: string) =>
    request<ArticleDetail>(`/articles/${id}${at ? `?at=${encodeURIComponent(at)}` : ''}`),
  lookupArticle: (params: {
    regulationSlug: string;
    articleNumber: string;
    paragraphNumber?: string;
    at?: string;
  }) => {
    const q = buildQuery(params);
    return request<ArticleLookup>(`/articles/lookup${q}`);
  },
  crossReference: (articleId: string) =>
    request<ArticleCrossReference>(`/articles/${articleId}/cross-reference`),
  searchLegalSources: (params: { q: string; kind?: SearchKind; limit?: number; at?: string }) => {
    const query = buildQuery(params);
    return request<SearchResult>(`/legal-sources/search${query}`);
  },

  listCitations: (caseId: string) => request<CitationList>(`/cases/${caseId}/citations`),
  createCitation: (
    caseId: string,
    dto: {
      articleId: string;
      quote?: string;
      context?: string;
      documentType?: CitationDocumentType;
      documentTitle?: string;
      at?: string;
      force?: boolean;
    },
  ) => request(`/cases/${caseId}/citations`, { method: 'POST', body: dto }),
  deleteCitation: (caseId: string, citationId: string) =>
    request<{ success: true }>(`/cases/${caseId}/citations/${citationId}`, { method: 'DELETE' }),
  revalidateCitations: (caseId: string) =>
    request<{ revalidated: number; flagged: number; items: CitationList }>(
      `/cases/${caseId}/citations/revalidate`,
      { method: 'POST', body: {} },
    ),
  legalBasis: (caseId: string) => request<LegalBasis>(`/cases/${caseId}/legal-basis`),

  // Integrity (F4)
  caseIntegrity: (caseId: string) => request<CaseIntegrity>(`/integrity/cases/${caseId}`),
  verifyIntegrity: (recordId: string, note?: string) =>
    request<{ check: IntegrityCheck; result: IntegrityCheckResult }>(
      `/integrity/records/${recordId}/verify`,
      { method: 'POST', body: { note } },
    ),
  createAddendum: (caseId: string, dto: { recordId: string; title: string; content: string }) =>
    request<AddendumItem>(`/integrity/cases/${caseId}/addenda`, { method: 'POST', body: dto }),
  createReceipt: (caseId: string, dto: { recordId: string; recipientPartyId: string }) =>
    request<DocumentReceiptItem>(`/integrity/cases/${caseId}/receipts`, {
      method: 'POST',
      body: dto,
    }),
  confirmReceipt: (receiptId: string, note?: string) =>
    request<DocumentReceiptItem>(`/integrity/receipts/confirm`, {
      method: 'POST',
      body: { receiptId, note },
    }),
  disputeReceipt: (receiptId: string, note: string) =>
    request<DocumentReceiptItem>(`/integrity/receipts/dispute`, {
      method: 'POST',
      body: { receiptId, note },
    }),
  createDeadline: (caseId: string, dto: { label: string; dueAt: string }) =>
    request<CaseDeadlineItem>(`/integrity/cases/${caseId}/deadlines`, {
      method: 'POST',
      body: dto,
    }),
  extendDeadline: (id: string, dto: { reason: string; dueAt: string }) =>
    request<CaseDeadlineItem>(`/integrity/deadlines/${id}/extend`, {
      method: 'POST',
      body: dto,
    }),
  completeDeadline: (id: string) =>
    request<CaseDeadlineItem>(`/integrity/deadlines/${id}/complete`, {
      method: 'POST',
      body: {},
    }),
  listAnomalies: (params: { page?: number; limit?: number; status?: AnomalyStatus; caseId?: string } = {}) => {
    const q = buildQuery(params);
    return request<Paginated<AnomalyFlag>>(`/integrity/anomalies${q}`);
  },
  resolveAnomaly: (id: string, dto: { status: AnomalyStatus; note?: string }) =>
    request<AnomalyFlag>(`/integrity/anomalies/${id}`, { method: 'PATCH', body: dto }),
};

export const statusFlow: Record<CaseStatus, CaseStatus[]> = {
  NEW: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['POSTPONED', 'DECIDED', 'CLOSED'],
  POSTPONED: ['ACTIVE', 'DECIDED', 'CLOSED'],
  DECIDED: ['CLOSED', 'ARCHIVED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const sideLabels: Record<PartySide, string> = {
  PLAINTIFF: 'Penggugat',
  DEFENDANT: 'Tergugat',
  APPLICANT: 'Pemohon',
  RESPONDENT: 'Termohon',
  ACCUSED: 'Terdakwa',
  THIRD_PARTY: 'Pihak Ketiga',
  OTHER: 'Lainnya',
};

export const jurisdictionLabels: Record<Jurisdiction, string> = {
  CIVIL: 'Perdata',
  CRIMINAL: 'Pidana',
  ADMINISTRATIVE: 'Tata Usaha Negara',
  RELIGIOUS: 'Agama',
  MILITARY: 'Militer',
  ARBITRATION: 'Arbitrase',
  OTHER: 'Lainnya',
};

export const interactionLabels: Record<InteractionType, string> = {
  CALL: 'Telepon',
  EMAIL: 'Email',
  MEETING: 'Pertemuan',
  HEARING: 'Sidang',
  DOCUMENT: 'Dokumen',
  OTHER: 'Lainnya',
};

export const consultationStatusFlow: Record<ConsultationStatus, ConsultationStatus[]> = {
  REQUESTED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const consultationStatusLabels: Record<ConsultationStatus, string> = {
  REQUESTED: 'Diajukan',
  SCHEDULED: 'Terjadwal',
  ONGOING: 'Berlangsung',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const consultationModeLabels: Record<ConsultationMode, string> = {
  CHAT: 'Chat',
  VIDEO: 'Video Call',
  PHONE: 'Telepon',
  IN_PERSON: 'Tatap Muka',
};

export const regulationTypeLabels: Record<RegulationType, string> = {
  CONSTITUTION: 'UUD',
  LAW: 'UU',
  GOVERNMENT_REGULATION: 'PP',
  PRESIDENTIAL_REGULATION: 'Perpres',
  MINISTERIAL_REGULATION: 'Permen',
  SUPREME_COURT_REGULATION: 'PERMA',
  SUPREME_COURT_CIRCULAR: 'SEMA',
  CIVIL_CODE: 'KUHPerdata',
  CRIMINAL_CODE: 'KUHP',
  PROCEDURAL_LAW: 'HIR/RBg',
  LOCAL_REGULATION: 'Perda',
  OTHER: 'Lainnya',
};

export const legalSourceStatusLabels: Record<LegalSourceStatus, string> = {
  DRAFT: 'Rancangan',
  ACTIVE: 'Berlaku',
  AMENDED: 'Diubah',
  REPEALED: 'Dicabut',
  UNKNOWN: 'Tidak Diketahui',
};

export const citationValidationLabels = {
  PENDING: 'Menunggu',
  VALID: 'Sesuai',
  WARNING: 'Perlu Perhatian',
  INVALID: 'Tidak Valid',
} as const;

export const citationDocumentLabels: Record<CitationDocumentType, string> = {
  GUGATAN: 'Gugatan',
  JAWABAN: 'Jawaban',
  REPLIK: 'Replik',
  DUPLIK: 'Duplik',
  KESIMPULAN: 'Kesimpulan',
  PUTUSAN: 'Putusan',
  MEMO: 'Memo Internal',
  LAINNYA: 'Lainnya',
};

export const integrityCheckLabels: Record<IntegrityCheckResult, string> = {
  MATCH: 'Utuh',
  MISMATCH: 'Terubah',
  MISSING_FILE: 'Berkas Hilang',
};

export const integrityEntityLabels: Record<IntegrityEntityType, string> = {
  ATTACHMENT: 'Lampiran',
  ADDENDUM: 'Addendum',
  OFFICIAL_COPY: 'Salinan Resmi',
};

export const receiptStatusLabels: Record<ReceiptStatus, string> = {
  SENT: 'Terkirim',
  CONFIRMED: 'Dikonfirmasi',
  DISPUTED: 'Disangkal',
  EXPIRED: 'Kedaluwarsa',
};

export const anomalyTypeLabels: Record<AnomalyType, string> = {
  UPLOAD_BURST: 'Upload Mendadak',
  BACKDATE_SUSPECT: 'Tanggal Mundur Mencurigakan',
  CLAIM_CHANGED: 'Perubahan Klaim',
  DELAY_PATTERN: 'Pola Penundaan',
  HASH_MISMATCH: 'Hash Tidak Cocok',
  DEADLINE_BREACH: 'Tenggat Terlampaui',
};

export const anomalySeverityLabels: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
};

export const anomalyStatusLabels: Record<AnomalyStatus, string> = {
  OPEN: 'Terbuka',
  ACKNOWLEDGED: 'Diketahui',
  RESOLVED: 'Selesai',
  DISMISSED: 'Diabaikan',
};

export const deadlineStatusLabels: Record<DeadlineStatus, string> = {
  OPEN: 'Berjalan',
  MET: 'Dipenuhi',
  BREACHED: 'Terlampaui',
  CANCELLED: 'Dibatalkan',
};

export function formatRegulationIdentity(
  type: RegulationType,
  number: string | null,
  year: number | null,
): string {
  const prefix = regulationTypeLabels[type];
  return [prefix, number, year].filter(Boolean).join(' ');
}