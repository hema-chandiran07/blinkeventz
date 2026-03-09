import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private readonly config: ConfigService) {
    const clientID = config.get<string>('FACEBOOK_APP_ID') || 'dummy';
    const clientSecret = config.get<string>('FACEBOOK_APP_SECRET') || 'dummy';
    // Use environment variable if set, otherwise default to /api/auth/facebook/callback
    const callbackURL = config.get<string>('FACEBOOK_CALLBACK_URL') || 
                       (process.env.NODE_ENV === 'production' 
                         ? `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/auth/facebook/callback`
                         : 'http://localhost:3000/api/auth/facebook/callback');

    super({
      clientID,
      clientSecret,
      callbackURL,
      profileFields: ['id', 'email', 'name', 'picture'],
      scope: ['email', 'public_profile'],
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
      return done(new UnauthorizedException('Facebook account has no email'), false);
    }

    const user = {
      email,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
      facebookId: profile.id,
    };

    done(null, user);
  }
}
