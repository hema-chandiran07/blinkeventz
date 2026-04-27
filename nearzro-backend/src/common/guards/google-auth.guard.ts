import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private jwtService: JwtService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return {
      state: req.query.state,
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Generate nonce for CSRF protection
    const nonce = crypto.randomUUID();

    // Preserve any existing state data (intendedRole, callbackUrl)
    const originalState = req.query.state as string | undefined;
    let stateData: any = {};

    if (originalState) {
      try {
        let stateString = originalState;
        if (!stateString.includes('%') && !stateString.includes('{')) {
          stateString = Buffer.from(stateString, 'base64').toString('utf-8');
        } else {
          stateString = decodeURIComponent(stateString);
        }
        stateData = JSON.parse(stateString);
      } catch (e) {
        // Ignore parse errors, stateData remains empty
      }
    }

    // Add nonce to state
    stateData.nonce = nonce;
    const newStateString = JSON.stringify(stateData);
    const encodedState = Buffer.from(newStateString).toString('base64');
    req.query.state = encodedState;

    // Store nonce in httpOnly cookie (signed using JWT for integrity)
    const signedNonce = this.jwtService.sign({ nonce }, { expiresIn: '5m' });
    const isDev = process.env.NODE_ENV !== 'production';
    res.cookie('oauth_nonce', signedNonce, {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'lax' as const,
      maxAge: 5 * 60 * 1000,
    });

    return super.canActivate(context) as any;
  }
}
