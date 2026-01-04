import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '../logger/logger.service';
import { ConfigService } from '@nestjs/config';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly isProduction: boolean;

  // Routes that shouldn't trigger error logging
  private readonly ignoredRoutes = [
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/apple-touch-icon.png',
  ];

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext('HttpExceptionFilter');
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // In production, use generic error messages for 500 errors to prevent information leakage
    const userMessage = this.isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'An unexpected error occurred. Please try again later.'
      : typeof message === 'string' ? message : (message as any).message;

    const errorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(exception, status),
        message: userMessage,
        // Only include validation details for 400-level errors
        details: status < 500 && typeof message === 'object' ? (message as any).message : undefined,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        requestId: request.headers['x-request-id'],
      },
    };

    // Skip logging for common browser requests (favicon, robots.txt, etc.)
    const shouldLog = !this.ignoredRoutes.includes(request.url);

    // Log full error details server-side (including stack traces)
    // Only log 404s at warn level, and skip ignored routes entirely
    if (shouldLog) {
      if (status === HttpStatus.NOT_FOUND) {
        this.logger.warn(
          `${request.method} ${request.url} - ${status} - ${userMessage}`,
        );
      } else if (status >= 500) {
        // Server errors always include stack trace
        this.logger.error(
          `${request.method} ${request.url} - ${status} - ${userMessage}`,
          exception instanceof Error ? exception.stack : JSON.stringify(exception),
        );
      } else if (status >= 400) {
        // Client errors logged at warn level without stack trace
        this.logger.warn(
          `${request.method} ${request.url} - ${status} - ${userMessage}`,
        );
      }
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && 'code' in response) {
        return (response as any).code;
      }
    }

    // Map HTTP status codes to error codes
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusCodeMap[status] || 'UNKNOWN_ERROR';
  }
}
