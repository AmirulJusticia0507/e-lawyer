import { SetMetadata } from '@nestjs/common';
import { Action, Subject, key } from '../constants/permissions';

export const PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);

export const RequirePermission = (action: Action, subject: Subject) =>
  RequirePermissions(key(action, subject));
