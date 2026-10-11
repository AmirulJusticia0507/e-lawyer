import type {
  AuthResult,
  CaseDetail,
  CaseStatus,
  CaseSummary,
  Client,
  ConsultationAttachment,
  ConsultationDetail,
  ConsultationMessage,
  ConsultationMode,
  ConsultationStatus,
  ConsultationSummary,
  Interaction,
  InteractionType,
  Jurisdiction,
  MetaInfo,
  Paginated,
  Party,
  PartySide,
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