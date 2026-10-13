import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = this.requestId(request);
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      status >= 500 ? 'Terjadi kesalahan pada server' : this.message(detail, exception);
    const code = status >= 500 ? 'INTERNAL_SERVER_ERROR' : this.code(detail, status);

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.originalUrl} [${requestId}]`, stack);
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl.split('?')[0],
      requestId,
    });
  }

  private requestId(request: Request): string {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(value)
      ? value
      : randomUUID();
  }

  private message(detail: string | object | null, exception: unknown): string | string[] {
    if (typeof detail === 'string') return detail;
    if (detail && 'message' in detail) {
      const value = (detail as { message: unknown }).message;
      if (
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((item) => typeof item === 'string'))
      )
        return value as string | string[];
    }
    return exception instanceof Error ? exception.message : 'Permintaan tidak dapat diproses';
  }

  private code(detail: string | object | null, status: number): string {
    if (
      detail &&
      typeof detail === 'object' &&
      'code' in detail &&
      typeof (detail as { code: unknown }).code === 'string'
    )
      return (detail as { code: string }).code;
    return HttpStatus[status] ?? 'HTTP_ERROR';
  }
}
