import { test, expect } from '@playwright/test';

test('the admin area is not reachable when logged out', async ({ page }) => {
  await page.goto('/en/admin');
  // The guard redirects away from /admin (to home or login).
  await expect(page).not.toHaveURL(/\/admin/, { timeout: 15_000 });
});
