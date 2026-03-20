import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { createErrorResponse } from '../interfaces/api-response.interface';

export interface HttpExceptionResponse {
  statusCode: number;
  message: string;
  redirectTo?: string;
  error?: string;
}

/**
 * Enhanced HTTP Exception Filter
 * Provides detailed error responses with request ID tracking
 * Handles all HTTP exceptions with proper status codes and logging
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = null;
    let stack: string | undefined;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle UnauthorizedException (401)
      if (exception instanceof UnauthorizedException) {
        const excResponse = exceptionResponse as HttpExceptionResponse;
        response.status(status).json({
          statusCode: status,
          message: excResponse.message || 'Authentication required',
          redirectTo: '/login',
          timestamp: new Date().toISOString(),
          path: request.url,
        } as HttpExceptionResponse);
        return;
      }

      // Handle ForbiddenException (403)
      if (exception instanceof ForbiddenException) {
        const excResponse = exceptionResponse as HttpExceptionResponse;
        response.status(status).json({
          statusCode: status,
          message: excResponse.message || 'Access denied',
          error: 'Forbidden',
          timestamp: new Date().toISOString(),
          path: request.url,
        } as HttpExceptionResponse);
        return;
      }

      // Handle other HTTP exceptions
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        code = resp.error || code;
        details = resp.details || null;
      }

      // Log the error with appropriate level
      if (status >= 500) {
        this.logger.error(
          `[${requestId}] ${request.method} ${request.url} - ${status} - ${message}`,
          exception.stack,
        );
        stack = exception.stack;
      } else if (status >= 400) {
        this.logger.warn(
          `[${requestId}] ${request.method} ${request.url} - ${status} - ${message}`,
        );
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - Unhandled exception: ${message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - Unknown exception`,
      );
    }

    // Build error response
    const errorResponse = createErrorResponse(code, message, details, requestId);
    if (stack && process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = stack;
    }
    errorResponse.error.path = request.url;

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Generate a unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
