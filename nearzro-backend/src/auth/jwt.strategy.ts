import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy,'jwt') {
  constructor(config:ConfigService) {
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

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

}
