import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { success: boolean; data: T; timestamp: string }> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<{ success: boolean; data: T; timestamp: string }> {
    return next.handle().pipe(map(data => ({ success: true, data, timestamp: new Date().toISOString() })));
  }
}
