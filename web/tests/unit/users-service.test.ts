import { vi, describe, it, expect, beforeEach } from 'vitest';

// Minimal chainable db mock — select(...).from(...).where(...).limit() resolves
// to `selectResult`; update(...).set(...).where(...).returning() resolves to a row.
const { selectLimit } = vi.hoisted(() => ({ selectLimit: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: selectLimit }) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: 'updated' }] }) }) }),
  },
}));

import { updateUserAdmin } from '@/services/users.service';

beforeEach(() => selectLimit.mockReset());

describe('updateUserAdmin (admin guardrails)', () => {
  it('blocks an admin from removing their own admin role', async () => {
    selectLimit.mockResolvedValue([{ id: 'me' }]);
    await expect(updateUserAdmin('me', 'me', { role: 'user' })).rejects.toThrow(/own admin role/i);
  });

  it('blocks an admin from deactivating their own account', async () => {
    selectLimit.mockResolvedValue([{ id: 'me' }]);
    await expect(updateUserAdmin('me', 'me', { isActive: false })).rejects.toThrow(/deactivate your own/i);
  });

  it('returns 404 for a missing user', async () => {
    selectLimit.mockResolvedValue([]);
    await expect(updateUserAdmin('ghost', 'me', { role: 'admin' })).rejects.toThrow(/not found/i);
  });

  it('allows promoting another user', async () => {
    selectLimit.mockResolvedValue([{ id: 'other' }]);
    await expect(updateUserAdmin('other', 'me', { role: 'admin' })).resolves.toEqual({ id: 'updated' });
  });
});
