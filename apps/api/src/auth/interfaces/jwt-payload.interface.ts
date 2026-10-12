import { RoleName } from '../../common/constants/roles';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  type: 'access';
}

export interface RefreshPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  sessionExpiresAt: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
}
