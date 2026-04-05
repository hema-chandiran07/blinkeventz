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
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      return done(new UnauthorizedException('Google account has no email'), false);
    }

    // Parse state parameter to extract intendedRole and callbackUrl
    let intendedRole: string | undefined;
    let callbackUrl: string | undefined;

    if (req.query?.state) {
      try {
        let stateString = req.query.state as string;

        // Handle both base64-encoded and URL-encoded state
        if (!stateString.includes('%') && !stateString.includes('{')) {
          stateString = Buffer.from(stateString, 'base64').toString('utf-8');
        } else {
          stateString = decodeURIComponent(stateString);
        }

        const stateData = JSON.parse(stateString);
        intendedRole = stateData.intendedRole;
        callbackUrl = stateData.callbackUrl;
      } catch (e) {
        console.log('⚠️ Could not parse OAuth state parameter:', (e as Error).message);
      }
    }

    const user = {
      email,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
      googleId: profile.id,
      intendedRole,
      callbackUrl,
    };

    done(null, user);
  }
}
