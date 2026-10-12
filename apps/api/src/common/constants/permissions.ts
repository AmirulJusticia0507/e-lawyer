import { RoleName } from './roles';

export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE',
}

export enum Subject {
  USER = 'USER',
  ROLE = 'ROLE',
  CASE = 'CASE',
  CLIENT = 'CLIENT',
  DOCUMENT = 'DOCUMENT',
  JUDGMENT = 'JUDGMENT',
  HEARING = 'HEARING',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  REGULATION = 'REGULATION',
  CITATION = 'CITATION',
  CONSULTATION = 'CONSULTATION',
  AUDIT_LOG = 'AUDIT_LOG',
  INTEGRITY = 'INTEGRITY',
  ANOMALY = 'ANOMALY',
}

export interface PermissionDef {
  action: Action;
  subject: Subject;
  description?: string;
}

export const key = (action: Action, subject: Subject): string => `${action}:${subject}`;

const allOf = (subject: Subject): PermissionDef[] =>
  Object.values(Action)
    .filter((a) => a !== Action.MANAGE)
    .map((action) => ({ action, subject }));

export const PERMISSIONS: PermissionDef[] = [
  { action: Action.MANAGE, subject: Subject.USER, description: 'Kelola seluruh pengguna' },
  { action: Action.MANAGE, subject: Subject.ROLE, description: 'Kelola role & permission' },
  { action: Action.READ, subject: Subject.AUDIT_LOG, description: 'Lihat audit log' },
  ...allOf(Subject.CASE),
  ...allOf(Subject.CLIENT),
  ...allOf(Subject.DOCUMENT),
  ...allOf(Subject.JUDGMENT),
  ...allOf(Subject.HEARING),
  ...allOf(Subject.INVOICE),
  ...allOf(Subject.PAYMENT),
  { action: Action.READ, subject: Subject.REGULATION, description: 'Lihat basis peraturan' },
  ...allOf(Subject.CITATION),
  ...allOf(Subject.CONSULTATION),
  { action: Action.CREATE, subject: Subject.INTEGRITY, description: 'Catat hash & anchoring berkas' },
  { action: Action.READ, subject: Subject.INTEGRITY, description: 'Lihat jejak integritas & verifikasi' },
  { action: Action.UPDATE, subject: Subject.INTEGRITY, description: 'Verifikasi integritas & konfirmasi terima' },
  { action: Action.READ, subject: Subject.ANOMALY, description: 'Lihat flag anomali integritas' },
  { action: Action.UPDATE, subject: Subject.ANOMALY, description: 'Akui/selesaikan flag anomali' },
];

// Matriks role -> daftar permission ("ACTION:SUBJECT")
const citationAll = allOf(Subject.CITATION).map((p) => key(p.action, p.subject));
const citationRead = key(Action.READ, Subject.CITATION);
const citationWrite = [
  key(Action.CREATE, Subject.CITATION),
  key(Action.READ, Subject.CITATION),
  key(Action.UPDATE, Subject.CITATION),
];
const integrityRead = key(Action.READ, Subject.INTEGRITY);
const integrityWrite = [
  key(Action.CREATE, Subject.INTEGRITY),
  key(Action.READ, Subject.INTEGRITY),
];
const integrityFull = [
  key(Action.CREATE, Subject.INTEGRITY),
  key(Action.READ, Subject.INTEGRITY),
  key(Action.UPDATE, Subject.INTEGRITY),
];
const anomalyRead = key(Action.READ, Subject.ANOMALY);
const anomalyFull = [
  key(Action.READ, Subject.ANOMALY),
  key(Action.UPDATE, Subject.ANOMALY),
];

export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  [RoleName.ADMIN]: [
    key(Action.MANAGE, Subject.USER),
    key(Action.MANAGE, Subject.ROLE),
    key(Action.READ, Subject.AUDIT_LOG),
    key(Action.READ, Subject.REGULATION),
    ...citationAll,
    ...integrityFull,
    ...anomalyFull,
  ],
  [RoleName.MANAGING_PARTNER]: [
    ...allOf(Subject.CASE).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.CLIENT).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.DOCUMENT).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.INVOICE).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.PAYMENT).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.HEARING).map((p) => key(p.action, p.subject)),
    key(Action.READ, Subject.JUDGMENT),
    key(Action.READ, Subject.AUDIT_LOG),
    key(Action.READ, Subject.REGULATION),
    ...citationAll,
    ...allOf(Subject.CONSULTATION).map((p) => key(p.action, p.subject)),
    ...integrityFull,
    ...anomalyFull,
  ],
  [RoleName.SENIOR_ASSOCIATE]: [
    ...allOf(Subject.CASE).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.CLIENT).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.DOCUMENT).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.HEARING).map((p) => key(p.action, p.subject)),
    ...allOf(Subject.INVOICE).map((p) => key(p.action, p.subject)),
    key(Action.READ, Subject.PAYMENT),
    key(Action.READ, Subject.JUDGMENT),
    key(Action.READ, Subject.REGULATION),
    ...citationAll,
    ...allOf(Subject.CONSULTATION).map((p) => key(p.action, p.subject)),
    ...integrityFull,
    ...anomalyFull,
  ],
  [RoleName.JUNIOR_ASSOCIATE]: [
    key(Action.CREATE, Subject.CASE),
    key(Action.READ, Subject.CASE),
    key(Action.UPDATE, Subject.CASE),
    key(Action.READ, Subject.CLIENT),
    key(Action.CREATE, Subject.DOCUMENT),
    key(Action.READ, Subject.DOCUMENT),
    key(Action.UPDATE, Subject.DOCUMENT),
    key(Action.READ, Subject.HEARING),
    key(Action.READ, Subject.REGULATION),
    ...citationAll,
    key(Action.CREATE, Subject.CONSULTATION),
    key(Action.READ, Subject.CONSULTATION),
    key(Action.UPDATE, Subject.CONSULTATION),
    ...integrityWrite,
    anomalyRead,
  ],
  [RoleName.PARALEGAL]: [
    key(Action.READ, Subject.CASE),
    key(Action.READ, Subject.CLIENT),
    key(Action.CREATE, Subject.DOCUMENT),
    key(Action.READ, Subject.DOCUMENT),
    key(Action.READ, Subject.HEARING),
    key(Action.READ, Subject.REGULATION),
    ...citationWrite,
    key(Action.READ, Subject.CONSULTATION),
    integrityRead,
    anomalyRead,
  ],
  [RoleName.CLIENT]: [
    key(Action.READ, Subject.CASE),
    key(Action.READ, Subject.DOCUMENT),
    key(Action.CREATE, Subject.DOCUMENT),
    key(Action.READ, Subject.HEARING),
    key(Action.READ, Subject.INVOICE),
    key(Action.CREATE, Subject.CONSULTATION),
    key(Action.READ, Subject.CONSULTATION),
    integrityRead,
  ],
  [RoleName.JUDGE]: [
    key(Action.READ, Subject.CASE),
    key(Action.CREATE, Subject.DOCUMENT),
    key(Action.READ, Subject.DOCUMENT),
    key(Action.UPDATE, Subject.DOCUMENT),
    ...allOf(Subject.JUDGMENT).map((p) => key(p.action, p.subject)),
    key(Action.UPDATE, Subject.HEARING),
    key(Action.READ, Subject.REGULATION),
    citationRead,
    integrityRead,
    anomalyRead,
  ],
  [RoleName.CLERK]: [
    ...allOf(Subject.CASE).map((p) => key(p.action, p.subject)),
    key(Action.READ, Subject.CLIENT),
    key(Action.CREATE, Subject.DOCUMENT),
    key(Action.READ, Subject.DOCUMENT),
    key(Action.UPDATE, Subject.DOCUMENT),
    ...allOf(Subject.HEARING).map((p) => key(p.action, p.subject)),
    key(Action.READ, Subject.JUDGMENT),
    key(Action.READ, Subject.REGULATION),
    ...citationWrite,
    ...integrityWrite,
    anomalyRead,
  ],
  [RoleName.BAILIFF]: [
    key(Action.READ, Subject.CASE),
    key(Action.READ, Subject.HEARING),
    key(Action.UPDATE, Subject.HEARING),
    integrityRead,
  ],
  [RoleName.PROSECUTOR]: [
    key(Action.READ, Subject.CASE),
    key(Action.CREATE, Subject.DOCUMENT),
    key(Action.READ, Subject.DOCUMENT),
    key(Action.READ, Subject.HEARING),
    key(Action.READ, Subject.REGULATION),
    ...citationWrite,
    integrityRead,
    anomalyRead,
  ],
};
