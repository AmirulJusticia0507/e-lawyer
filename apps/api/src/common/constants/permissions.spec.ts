import {
  Action,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  Subject,
  key,
} from './permissions';
import { RoleName } from './roles';

describe('RBAC permission matrix', () => {
  const definedKeys = new Set(PERMISSIONS.map((p) => key(p.action, p.subject)));

  it('mendefinisikan role untuk setiap RoleName', () => {
    for (const role of Object.values(RoleName)) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it('setiap permission yang dipetakan ke role harus terdaftar di PERMISSIONS', () => {
    for (const role of Object.values(RoleName)) {
      for (const perm of ROLE_PERMISSIONS[role]) {
        expect(definedKeys.has(perm)).toBe(true);
      }
    }
  });

  it('ADMIN dapat mengelola USER dan ROLE', () => {
    expect(ROLE_PERMISSIONS[RoleName.ADMIN]).toContain(key(Action.MANAGE, Subject.USER));
    expect(ROLE_PERMISSIONS[RoleName.ADMIN]).toContain(key(Action.MANAGE, Subject.ROLE));
  });

  it('CLIENT tidak boleh mengelola perkara pengguna lain', () => {
    expect(ROLE_PERMISSIONS[RoleName.CLIENT]).not.toContain(key(Action.MANAGE, Subject.CASE));
  });

  it('role Paralegal tidak boleh menghapus sitasi', () => {
    expect(ROLE_PERMISSIONS[RoleName.PARALEGAL]).toContain(key(Action.CREATE, Subject.CITATION));
    expect(ROLE_PERMISSIONS[RoleName.PARALEGAL]).not.toContain(key(Action.DELETE, Subject.CITATION));
  });

  it('JUDGE hanya boleh membaca sitasi', () => {
    expect(ROLE_PERMISSIONS[RoleName.JUDGE]).toContain(key(Action.READ, Subject.CITATION));
    expect(ROLE_PERMISSIONS[RoleName.JUDGE]).not.toContain(key(Action.CREATE, Subject.CITATION));
  });

  it('JUDGE dapat membuat dokumen dan putusan, CLIENT tidak dapat membuat putusan', () => {
    expect(ROLE_PERMISSIONS[RoleName.JUDGE]).toContain(key(Action.CREATE, Subject.DOCUMENT));
    expect(ROLE_PERMISSIONS[RoleName.JUDGE]).toContain(key(Action.CREATE, Subject.JUDGMENT));
    expect(ROLE_PERMISSIONS[RoleName.CLIENT]).not.toContain(key(Action.CREATE, Subject.JUDGMENT));
  });

  it('ADMIN dapat menjadwalkan dan melihat sidang', () => {
    expect(ROLE_PERMISSIONS[RoleName.ADMIN]).toContain(key(Action.CREATE, Subject.HEARING));
    expect(ROLE_PERMISSIONS[RoleName.ADMIN]).toContain(key(Action.READ, Subject.HEARING));
  });

  it('CLIENT tidak mendapat akses sitasi perkara', () => {
    expect(ROLE_PERMISSIONS[RoleName.CLIENT]).not.toContain(key(Action.READ, Subject.CITATION));
  });

  it('CLIENT hanya bisa membaca jejak integritas, tidak menulis/mengelola', () => {
    expect(ROLE_PERMISSIONS[RoleName.CLIENT]).toContain(key(Action.READ, Subject.INTEGRITY));
    expect(ROLE_PERMISSIONS[RoleName.CLIENT]).not.toContain(key(Action.CREATE, Subject.INTEGRITY));
    expect(ROLE_PERMISSIONS[RoleName.CLIENT]).not.toContain(key(Action.UPDATE, Subject.INTEGRITY));
    expect(ROLE_PERMISSIONS[RoleName.CLIENT]).not.toContain(key(Action.UPDATE, Subject.ANOMALY));
  });

  it('Paralegal tidak boleh menyelesaikan sendiri flag anomali', () => {
    expect(ROLE_PERMISSIONS[RoleName.PARALEGAL]).toContain(key(Action.READ, Subject.ANOMALY));
    expect(ROLE_PERMISSIONS[RoleName.PARALEGAL]).not.toContain(key(Action.UPDATE, Subject.ANOMALY));
  });

  it('advokat senior & partner dapat mengelola anomali (pengawas)', () => {
    for (const role of [RoleName.SENIOR_ASSOCIATE, RoleName.MANAGING_PARTNER]) {
      expect(ROLE_PERMISSIONS[role]).toContain(key(Action.UPDATE, Subject.ANOMALY));
      expect(ROLE_PERMISSIONS[role]).toContain(key(Action.UPDATE, Subject.INTEGRITY));
    }
  });
});
