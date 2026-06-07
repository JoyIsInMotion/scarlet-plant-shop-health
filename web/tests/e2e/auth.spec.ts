import { test, expect } from '@playwright/test';

// Relies on the seeded demo account (npm run db:seed).
test('a user can log in with the demo account', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByPlaceholder('you@example.com').fill('demo@scarlet.com');
  await page.getByPlaceholder('••••••••').fill('demo123');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Lands on the authenticated plants page.
  await expect(page).toHaveURL(/\/plants/, { timeout: 15_000 });
});

test('login rejects bad credentials and stays on the login page', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByPlaceholder('you@example.com').fill('demo@scarlet.com');
  await page.getByPlaceholder('••••••••').fill('wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/login/);
});
