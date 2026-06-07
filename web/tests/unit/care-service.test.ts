import { vi, describe, it, expect, beforeEach } from 'vitest';

// assertPlantOwner does select(...).from(plants).where(...).limit(1); mock it.
const { selectLimit } = vi.hoisted(() => ({ selectLimit: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: selectLimit }) }) }),
  },
}));

import { createCareLog } from '@/services/care.service';

beforeEach(() => selectLimit.mockReset());

describe('createCareLog (ownership)', () => {
  it("forbids logging care on another user's plant", async () => {
    selectLimit.mockResolvedValue([{ id: 'p1', userId: 'owner', speciesId: null }]);
    await expect(createCareLog('p1', 'attacker', { careType: 'watered' })).rejects.toThrow(/forbidden/i);
  });

  it('returns 404 when the plant does not exist', async () => {
    selectLimit.mockResolvedValue([]);
    await expect(createCareLog('ghost', 'u1', { careType: 'watered' })).rejects.toThrow(/not found/i);
  });
});
