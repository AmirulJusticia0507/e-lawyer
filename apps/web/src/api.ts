import type {
  AuthResult,
  CaseDetail,
  CaseStatus,
  CaseSummary,
  Client,
  Interaction,
  InteractionType,
  Jurisdiction,
  MetaInfo,
  Paginated,
  Party,
  PartySide,
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