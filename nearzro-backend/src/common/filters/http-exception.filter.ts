import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface HttpExceptionResponse {
  statusCode: number;
  message: string;
  redirectTo?: string;
  error?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Handle UnauthorizedException (401)
    if (exception instanceof UnauthorizedException) {
      const exceptionResponse = exception.getResponse() as HttpExceptionResponse;
      
      response.status(status).json({
        statusCode: status,
        message: exceptionResponse.message || 'Authentication required',
        redirectTo: '/login',
        timestamp: new Date().toISOString(),
        path: request.url,
      } as HttpExceptionResponse);
      return;
    }

    // Handle ForbiddenException (403)
    if (exception instanceof ForbiddenException) {
      const exceptionResponse = exception.getResponse() as HttpExceptionResponse;
      
      response.status(status).json({
        statusCode: status,
        message: exceptionResponse.message || 'Access denied',
        error: 'Forbidden',
        timestamp: new Date().toISOString(),
        path: request.url,
      } as HttpExceptionResponse);
      return;
    }

    // Handle other HTTP exceptions - preserve default behavior
    const exceptionResponse = exception.getResponse() as any;
    const message = exceptionResponse.message || exceptionResponse || 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
