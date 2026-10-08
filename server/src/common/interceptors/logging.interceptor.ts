import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

// ─────────────────────────────────────────────────────────────
//  SENSITIVE ROUTES
//  These routes have their request body excluded from logs
//  to prevent passwords and API keys from appearing in logs
// ─────────────────────────────────────────────────────────────
const SENSITIVE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/models',        // contains API keys
];

// ─────────────────────────────────────────────────────────────
//  LOGGING INTERCEPTOR
//
//  Logs every incoming request and outgoing response:
//  → POST /api/auth/login 200 [45ms] (user: unauthenticated)
//  → GET  /api/conversations 200 [12ms] (user: uuid-here)
//  → POST /api/chat/stream 200 [3420ms] (user: uuid-here)
//
//  SECURITY:
//  - Never logs request body of sensitive endpoints
//  - Never logs Authorization header
//  - Never logs encrypted API keys
// ─────────────────────────────────────────────────────────────
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request  = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, ip } = request;
    const userId    = (request as any).user?.id ?? 'unauthenticated';
    const startTime = Date.now();
    const isSensitive = SENSITIVE_PATHS.some(path => url.startsWith(path));

    // ── Log the incoming request ──
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `→ ${method.padEnd(6)} ${url.padEnd(40)} ` +
        `(user: ${userId}) ` +
        `(ip: ${ip})`,
      );

      // Log request body in development EXCEPT for sensitive routes
      if (request.body && Object.keys(request.body).length > 0 && !isSensitive) {
        console.log('  Body:', JSON.stringify(request.body, null, 2));
      }
    }

    // ── After route handler completes, log the response ──
    return next.handle().pipe(
      tap({
        next: () => {
          const duration   = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Color code by status: green (2xx), yellow (4xx), red (5xx)
          const statusColor =
            statusCode < 300 ? '\x1b[32m' :
            statusCode < 500 ? '\x1b[33m' :
            '\x1b[31m';
          const reset = '\x1b[0m';

          console.log(
            `← ${method.padEnd(6)} ${url.padEnd(40)} ` +
            `${statusColor}${statusCode}${reset} ` +
            `[${duration}ms] ` +
            `(user: ${userId})`,
          );

          // Warn about slow requests over 1 second
          if (duration > 1000 && !url.includes('/chat/stream')) {
            console.warn(
              `⚠️  Slow request: ${method} ${url} took ${duration}ms`,
            );
          }
        },

        error: (error: Error) => {
          const duration = Date.now() - startTime;
          console.error(
            `✗ ${method.padEnd(6)} ${url.padEnd(40)} ` +
            `\x1b[31mERROR\x1b[0m [${duration}ms] ` +
            `(user: ${userId}) — ${error.message}`,
          );
        },
      }),
    );
  }
}