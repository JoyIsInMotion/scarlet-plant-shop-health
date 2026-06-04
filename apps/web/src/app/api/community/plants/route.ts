import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import * as communityService from '@/services/community.service';
import { verifyAccessToken } from '@/lib/auth/jwt';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit = Math.min(50, parseInt(sp.get('limit') ?? String(PAGE_SIZE), 10));
  const offset = (page - 1) * limit;
  const search = sp.get('search') || undefined;
  const difficulty = sp.get('difficulty') || undefined;

  // Optional auth to determine liked state
  let currentUserId: string | undefined;
  try {
    const token =
      req.headers.get('authorization')?.replace('Bearer ', '') ??
      req.cookies.get('access_token')?.value;
    if (token) {
      const payload = verifyAccessToken(token);
      currentUserId = payload.sub;
    }
  } catch {
    // unauthenticated — liked state will be false
  }

  try {
    const result = await communityService.listCommunityPlants({
      limit,
      offset,
      search,
      difficulty,
      currentUserId,
    });
    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Server error', 500);
  }
}
