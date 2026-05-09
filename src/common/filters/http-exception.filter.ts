import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

// ─────────────────────────────────────────────────────────────
//  HTTP EXCEPTION FILTER
//
//  Catches ALL exceptions (both HttpException and unknown errors)
//  Returns a consistent JSON shape every time:
//  {
//    statusCode: 400,
//    message: "Validation failed",
//    timestamp: "2024-01-01T00:00:00.000Z",
//    path: "/api/auth/register"
//  }
//
//  SECURITY:
//  - Never exposes stack traces in production
//  - Never exposes internal DB error messages
//  - Never reveals file paths or internal details
// ─────────────────────────────────────────────────────────────
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly reflector: Reflector) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const request  = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const isProd   = process.env.NODE_ENV === 'production';

    // ── Determine status code ──
    let statusCode: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      // NestJS validation errors return an object with a message array
      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        message = (exceptionResponse as { message: string | string[] }).message;
      } else {
        message = exception.message;
      }
    } else {
      // Unknown error — something unexpected crashed
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      // In production: generic message (never reveal internals)
      // In development: show actual error for debugging
      message = isProd
        ? 'Internal server error'
        : (exception instanceof Error ? exception.message : 'Unknown error');
    }

    // ── Log the error ──
    if (statusCode >= 500) {
      // 5xx errors are server bugs — always log with full details
      console.error({
        type:       'SERVER_ERROR',
        statusCode,
        path:       request.url,
        method:     request.method,
        userId:     (request as any).user?.id ?? 'unauthenticated',
        error:      exception instanceof Error ? exception.message : exception,
        stack:      exception instanceof Error ? exception.stack : undefined,
        timestamp:  new Date().toISOString(),
      });
    } else if (statusCode === 401 || statusCode === 403) {
      // Auth failures — log for security monitoring
      console.warn({
        type:       'AUTH_FAILURE',
        statusCode,
        path:       request.url,
        method:     request.method,
        ip:         request.ip,
        timestamp:  new Date().toISOString(),
      });
    }

    // ── Build response ──
    const errorResponse: Record<string, unknown> = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path:      request.url,
    };

    // In development: attach stack trace for easier debugging
    // In production: NEVER include stack — it reveals internal file paths
    if (!isProd && exception instanceof Error && exception.stack) {
      errorResponse.stack = exception.stack;
    }

    response.status(statusCode).json(errorResponse);
  }
}