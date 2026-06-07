import { test, expect } from '@playwright/test';

test('home loads in English with the Scarlet logo', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('header')).toContainText('Scarlet');
  // Why Scarlet? feature cards link out
  await expect(page.getByRole('link', { name: /plant species|species guide/i }).first()).toBeVisible();
});

test('logo localizes to Скарлет in Bulgarian', async ({ page }) => {
  await page.goto('/bg');
  await expect(page.locator('header')).toContainText('Скарлет');
});
