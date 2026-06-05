import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@scarlet/shared';

export function parsePaginationParams(searchParams: URLSearchParams) {
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_LIMIT), 10),
    MAX_PAGE_LIMIT
  );
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const cursor = searchParams.get('cursor') ?? undefined;
  return { limit, offset, cursor };
}
