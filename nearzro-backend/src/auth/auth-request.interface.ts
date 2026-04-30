import type { Request } from 'express';

export interface JwtUser {
  userId: number;
  email: string;
  role?: string;
  roles?: string[]; // multiple roles support
  hasVendorProfile?: boolean;
  hasVenueProfile?: boolean;
  jti: string;
  exp: number;
}

export interface AuthRequest extends Request {
  user: JwtUser;
}
