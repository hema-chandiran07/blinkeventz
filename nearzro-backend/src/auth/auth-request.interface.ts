import type { Request } from 'express';

export interface JwtUser {
  userId: number;
  email: string;
  role?: string;
  jti: string;
  exp: number;
}

export interface AuthRequest extends Request {
  user: JwtUser;
}
