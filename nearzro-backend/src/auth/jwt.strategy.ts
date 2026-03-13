import { Injectable } from '@nestjs/common';
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

async validate(payload: { sub: number; email: string; role: string }) {
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

}
