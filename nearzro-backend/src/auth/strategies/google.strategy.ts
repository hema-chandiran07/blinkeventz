import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import 'dotenv/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {
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

    // Parse state parameter to extract intendedRole, callbackUrl, and nonce
    let intendedRole: string | undefined;
    let callbackUrl: string | undefined;
    let nonceFromState: string | undefined;

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
        nonceFromState = stateData.nonce;
      } catch (e) {
        console.log('⚠️ Could not parse OAuth state parameter:', (e as Error).message);
      }
    }

    // CSRF protection: Verify nonce from state matches signed cookie
    const signedNonceCookie = req.cookies?.oauth_nonce;
    if (!signedNonceCookie || !nonceFromState) {
      return done(new UnauthorizedException('OAuth state validation failed: missing nonce'), false);
    }

    try {
      // Verify and decode the signed nonce cookie
      const decoded = this.jwtService.verify<any>(signedNonceCookie, { ignoreExpiration: false });
      const nonceFromCookie = decoded.nonce;

      if (nonceFromCookie !== nonceFromState) {
        return done(new UnauthorizedException('OAuth state mismatch: possible CSRF attack'), false);
      }
    } catch (error) {
      return done(new UnauthorizedException('Invalid or expired OAuth nonce'), false);
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