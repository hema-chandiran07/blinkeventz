import type { Request } from 'express';

export interface JwtUser {
  userId: number;
  email: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user: JwtUser;
}
