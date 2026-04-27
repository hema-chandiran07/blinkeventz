import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CartCacheData {
  id: number;
  status: string;
  isExpress: boolean;
  expressFee: string;
  items: any[];
  subtotal: string;
  platformFee: string;
  tax: string;
  totalAmount: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CartCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CartCacheService.name);
  private redis: Redis | null = null;
  private readonly defaultTTL = 300; // 5 minutes
  private isRedisAvailable = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Support both REDIS_URL (full connection string) and REDIS_HOST + REDIS_PORT
      const redisUrl = this.configService.get<string>('REDIS_URL');
      const redisHost = this.configService.get<string>('REDIS_HOST');
      const redisPort = this.configService.get<string>('REDIS_PORT');
      
      let connectionString: string | undefined;
      
      if (redisUrl) {
        // Use full REDIS_URL if provided
        connectionString = redisUrl;
        this.logger.log(`Using REDIS_URL: ${redisUrl.replace(/:\/\/:.*@/, '://***@')}`);
      } else if (redisHost) {
        // Construct from REDIS_HOST and REDIS_PORT
        const port = redisPort || '6379';
        connectionString = `redis://${redisHost}:${port}`;
        this.logger.log(`Using REDIS_HOST:REDIS_PORT -> ${connectionString}`);
      }
      
      if (connectionString) {
        this.redis = new Redis(connectionString, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        });
        
        await this.redis.connect();
        this.isRedisAvailable = true;
        this.logger.log('Redis connection established for cart cache');
      } else {
        this.logger.warn('REDIS_URL or REDIS_HOST not configured - cart caching disabled');
      }
    } catch (error) {
      this.logger.warn(`Redis connection failed - cart caching disabled: ${error}`);
      this.isRedisAvailable = false;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Generate cache key for cart
   */
  private getCacheKey(userId: number): string {
    return `cart:${userId}`;
  }

  /**
   * Generate idempotency key
   */
  private getIdempotencyKey(key: string): string {
    return `idem:${key}`;
  }

  /**
   * Get cached cart
   */
  async getCart(userId: number): Promise<CartCacheData | null> {
    if (!this.isRedisAvailable || !this.redis) {
      return null;
    }

    try {
      const key = this.getCacheKey(userId);
      const cached = await this.redis.get(key);
      if (cached) {
        this.logger.debug({ userId, operation: 'cache_hit' }, 'Cart cache hit');
        return JSON.parse(cached) as CartCacheData;
      }
      return null;
    } catch (error) {
      this.logger.error({ userId, error: String(error) }, 'Cart cache get error');
      return null;
    }
  }

  /**
   * Set cart in cache
   */
  async setCart(userId: number, data: CartCacheData, ttl?: number): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      return;
    }

    try {
      const key = this.getCacheKey(userId);
      const expires = ttl || this.defaultTTL;
      await this.redis.setex(key, expires, JSON.stringify(data));
      this.logger.debug({ userId, ttl: expires, operation: 'cache_set' }, 'Cart cached');
    } catch (error) {
      this.logger.error({ userId, error: String(error) }, 'Cart cache set error');
    }
  }

  /**
   * Invalidate cart cache
   */
  async invalidateCart(userId: number): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      return;
    }

    try {
      const key = this.getCacheKey(userId);
      await this.redis.del(key);
      this.logger.debug({ userId, operation: 'cache_invalidate' }, 'Cart cache invalidated');
    } catch (error) {
      this.logger.error({ userId, error: String(error) }, 'Cart cache invalidation error');
    }
  }

   /**
    * Check and store idempotency key
    * Returns true if key already exists (duplicate request)
    */
   async checkAndSetIdempotencyKey(key: string, ttl: number = 3600): Promise<boolean> {
     if (!this.isRedisAvailable || !this.redis) {
       return false;
     }

     try {
       const idemKey = this.getIdempotencyKey(key);
       const exists = await this.redis.set(idemKey, '1', 'EX', ttl, 'NX');
       return exists === null; // Returns true if key already existed
     } catch (error) {
       this.logger.error({ key, error: String(error) }, 'Idempotency check error');
       return false;
     }
   }

   /**
    * Listen for venue price updates and invalidate affected carts
    */
   @OnEvent('venue.price.updated')
   async onVenuePriceUpdated(payload: { venueId: number }): Promise<void> {
     if (!this.isRedisAvailable || !this.redis) {
       return;
     }

     const { venueId } = payload;
     this.logger.debug({ venueId }, 'Invalidating carts for venue price update');

     try {
       // Scan all cart keys
       const keys = await this.redis.keys('cart:*');
       let invalidated = 0;

       for (const key of keys) {
         const data = await this.redis.get(key);
         if (data) {
           try {
             const cart = JSON.parse(data) as CartCacheData;
             // Check if any cart item has this venueId
             const hasVenue = cart.items.some((item: any) => item?.venueId === venueId);
             if (hasVenue) {
               await this.redis.del(key);
               invalidated++;
             }
           } catch (parseErr) {
             // Ignore malformed cart data
           }
         }
       }

       if (invalidated > 0) {
         this.logger.log({ venueId, invalidated }, 'Carts invalidated due to venue price update');
       }
     } catch (error) {
       this.logger.error({ venueId, error: String(error) }, 'Failed to invalidate carts for venue');
     }
   }
 }
