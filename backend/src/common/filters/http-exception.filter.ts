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
        code: this.getErrorCode(exception),
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

    // Log full error details server-side (including stack traces)
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${userMessage}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    response.status(status).json(errorResponse);
  }

  private getErrorCode(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && 'code' in response) {
        return (response as any).code;
      }
    }
    return 'INTERNAL_SERVER_ERROR';
  }
}
