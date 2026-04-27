import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager?: any,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Fail closed: reject tokens with missing identity fields
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check JWT blacklist (revoked tokens) if cache manager available
    if (payload.jti && this.cacheManager) {
      const blacklistKey = `blacklist:${payload.jti}`;
      try {
        const isBlacklisted = await this.cacheManager.get(blacklistKey);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      } catch (err) {
        // If cache access fails, log but don't block authentication
        console.error('Blacklist check failed:', err);
      }
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti, // Pass jti through to request.user
      exp: payload.exp, // Pass exp for blacklist TTL calculation
    };
  }
}
