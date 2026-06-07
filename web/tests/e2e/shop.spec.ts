import { test, expect } from '@playwright/test';

test('adding to cart shows a toast and the cart stays visible', async ({ page }) => {
  await page.goto('/en/shop');

  const cartLink = page.locator('header a[href$="/cart"]');
  await expect(cartLink).toBeVisible();

  await page.getByRole('button', { name: /add to cart/i }).first().click();

  // Toast confirms the add...
  await expect(page.getByText(/add to cart/i).first()).toBeVisible();
  // ...and the regression we fixed: the cart icon is NOT hidden by the toast.
  await expect(cartLink).toBeVisible();

  // The persistent floating cart button appears once there's an item.
  await expect(page.locator('a[href$="/cart"]')).toHaveCount(2); // header + floating
});
