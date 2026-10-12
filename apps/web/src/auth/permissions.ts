import type { UserInfo } from '../types';

export function hasPermission(user: UserInfo | null, permission?: string): boolean {
  if (!user) return false;
  return permission === undefined || user.permissions.includes(permission);
}
