import { NextRequest } from 'next/server';
import { verifyAccessToken, type JWTPayload } from './jwt';
import { err } from '../api/response';

export interface AuthenticatedRequest extends NextRequest {
  auth: JWTPayload;
}

type Handler<T extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  ctx: { params: Promise<T> }
) => Promise<Response>;

interface WithAuthOptions {
  role?: 'admin' | 'user';
}

const authPayloads = new WeakMap<NextRequest, JWTPayload>();

export function withAuth<T extends Record<string, string> = Record<string, string>>(
  handler: Handler<T>,
  options: WithAuthOptions = {}
): Handler<T> {
  return async (req, ctx) => {
    const token =
      req.headers.get('authorization')?.replace('Bearer ', '') ??
      req.cookies.get('access_token')?.value;

    if (!token) {
      return err('Unauthorized', 401);
    }

    let payload: JWTPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return err('Invalid or expired token', 401);
    }

    if (options.role === 'admin' && payload.role !== 'admin') {
      return err('Forbidden', 403);
    }

    authPayloads.set(req, payload);
    return handler(req, ctx);
  };
}

export function getAuthFromRequest(req: NextRequest): JWTPayload | null {
  return authPayloads.get(req) ?? null;
}
