import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') || 'dummy';
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || 'dummy';
    // Use environment variable if set, otherwise default to /api/auth/google/callback
    const callbackURL = config.get<string>('GOOGLE_CALLBACK_URL') || 
                       (process.env.NODE_ENV === 'production' 
                         ? `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/auth/google/callback`
                         : 'http://localhost:3000/api/auth/google/callback');

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true, // ✅ REQUIRED (important)
    });
  }

  async validate(
    req: any,               // ✅ REQUIRED when passReqToCallback = true
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      return done(new UnauthorizedException('Google account has no email'), false);
    }

    const user = {
      email,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
      googleId: profile.id,
    };

    done(null, user);
  }
}
