import jwt from 'jsonwebtoken';

export interface JWTPayload {
  sub: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export function signAccessToken(userId: string, role: 'user' | 'admin'): string {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '15m' }
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string };
}
