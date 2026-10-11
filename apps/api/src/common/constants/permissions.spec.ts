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
});
