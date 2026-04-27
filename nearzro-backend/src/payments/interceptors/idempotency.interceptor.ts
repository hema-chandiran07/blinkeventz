// src/payments/interceptors/idempotency.interceptor.ts
import { 
  Injectable, 
  NestInterceptor, 
  ExecutionContext, 
  CallHandler,
  BadRequestException,
  Logger,
  Inject,
  UnsupportedMediaTypeException
} from '@nestjs/common';
import { Observable, of, from } from 'rxjs';
import { tap, map, switchMap, catchError } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Idempotency Interceptor
 * 
 * Ensures that duplicate requests with the same idempotency key
 * return the same response without reprocessing.
 * 
 * Uses Redis (or other cache) for fast lookups with TTL.
 * 
 * Usage:
 * Apply to controller endpoints that support idempotency:
 * @UseInterceptors(IdempotencyInterceptor)
 * @Post('endpoint')
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly TTL_SECONDS = 86400; // 24 hours

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get idempotency key from header
    const idempotencyKey = request.headers['idempotency-key'] || 
                           request.headers['x-idempotency-key'];

    // If no idempotency key, skip interceptor
    if (!idempotencyKey) {
      return next.handle();
    }

    // Validate idempotency key format
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128) {
      throw new BadRequestException('Invalid idempotency key');
    }

    // Create cache key with namespace
    const cacheKey = `idem:${idempotencyKey}`;

    this.logger.log({
      event: 'IDEMPOTENCY_CHECK',
      idempotencyKey,
      method: request.method,
      url: request.url,
    });

    // Check cache synchronously
    const cachedResponse = (this.cacheManager as any).store?.get 
      ? null 
      : null;
    
    // For async cache, use from() to convert Promise to Observable
    const cacheGet = from((this.cacheManager as any).get(cacheKey));

    return cacheGet.pipe(
      switchMap((cachedResponse: any) => {
        // If cached response exists, return it
        if (cachedResponse !== undefined && cachedResponse !== null) {
          this.logger.log({
            event: 'IDEMPOTENCY_HIT',
            idempotencyKey,
            message: 'Returning cached response',
          });
          
          // Set HTTP header to indicate idempotent response
          response.set('X-Idempotent-Replayed', 'true');
          
          return of(cachedResponse);
        }

        // No cached response, proceed with request
        return next.handle().pipe(
          tap(async (responseData) => {
            // Cache the response for future requests
            try {
              const ttlMs = this.TTL_SECONDS * 1000;
              await (this.cacheManager as any).set(cacheKey, responseData, ttlMs);
              
              this.logger.log({
                event: 'IDEMPOTENCY_MISS',
                idempotencyKey,
                message: 'Response cached for future requests',
              });
            } catch (error) {
              this.logger.error({
                event: 'IDEMPOTENCY_CACHE_ERROR',
                idempotencyKey,
                error: error.message,
              });
              // Don't fail the request if caching fails
            }
          }),
        );
      })
    );
  }
}

/**
 * Idempotency Key Generator
 * 
 * Helper to generate idempotency keys for client applications
 */
export function generateIdempotencyKey(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  
  return `${prefix ? prefix + '_' : ''}${timestamp}_${random}${random2}`.substring(0, 128);
}

/**
 * Idempotency Key Validator
 * 
 * Validates idempotency key format
 */
export function isValidIdempotencyKey(key: string | undefined): boolean {
  if (!key) return false;
  if (typeof key !== 'string') return false;
  if (key.length === 0 || key.length > 128) return false;
  
  // Allow alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(key);
}
