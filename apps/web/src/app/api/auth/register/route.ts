import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { registerSchema } from '@scarlet/shared';
import * as authService from '@/services/auth.service';
import { ServiceError } from '@/services/service-error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const result = await authService.register(parsed.data.name, parsed.data.email, parsed.data.password);
    return ok(result, 201);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    console.error('Register error:', e);
    return err('Internal server error', 500);
  }
}
