import { hasPermission } from './permissions';

const user = {
  id: 'user-1',
  email: 'user@example.test',
  fullName: 'Test User',
  roles: ['PARALEGAL'],
  permissions: ['READ:CASE', 'READ:DOCUMENT'],
};

describe('hasPermission', () => {
  it('requires an authenticated user', () => {
    expect(hasPermission(null)).toBe(false);
  });

  it('allows an authenticated route without a permission requirement', () => {
    expect(hasPermission(user)).toBe(true);
  });

  it('checks the exact permission', () => {
    expect(hasPermission(user, 'READ:CASE')).toBe(true);
    expect(hasPermission(user, 'UPDATE:CASE')).toBe(false);
  });
});
