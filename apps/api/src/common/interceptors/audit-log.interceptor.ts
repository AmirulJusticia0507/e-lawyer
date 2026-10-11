import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

const METHOD_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const action = METHOD_ACTION[request.method as string];
    if (!action) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => void this.record(request, action, 'SUCCESS', 200),
        error: (err) => void this.record(request, action, 'ERROR', err?.status ?? 500),
      }),
    );
  }

  private async record(
    request: any,
    action: string,
    _result: string,
    status: number,
  ): Promise<void> {
    try {
      const user: AuthenticatedUser | undefined = request.user;
      const path: string = request.originalUrl ?? request.url ?? '';
      const subject = this.deriveSubject(path);

      const metadata: Prisma.InputJsonValue = {
        params: request.params ?? {},
        query: request.query ?? {},
      };

      await this.prisma.auditLog.create({
        data: {
          actorId: user?.id ?? null,
          action,
          subject,
          method: request.method,
          path,
          status,
          metadata,
          ip: request.ip,
          userAgent: request.headers?.['user-agent'],
        },
      });
    } catch (error) {
      this.logger.warn(`Gagal menulis audit log: ${(error as Error).message}`);
    }
  }

  private deriveSubject(path: string): string {
    const clean = path.split('?')[0].replace(/^\/+/, '');
    const segments = clean.split('/');
    const apiIndex = segments.findIndex((s) => s === 'api');
    const subject = apiIndex >= 0 ? segments[apiIndex + 1] : segments[0];
    return (subject ?? 'unknown').toUpperCase();
  }
}
