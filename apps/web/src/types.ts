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
}