import { test, expect } from './fixtures';

test('workspace and saved attempts use the website origin', async ({ page, baseURL }) => {
  const apiOrigins = new Set<string>();
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiOrigins.add(url.origin);
  });
  await page.goto('/#workspace', { waitUntil: 'domcontentloaded' });
  const score = page.getByRole('button', { name: /Score & save/ });
  await expect(score).toBeEnabled({ timeout: 20000 });
  await score.click();
  await expect(page.locator('.record-id')).toContainText('Result', { timeout: 15000 });
  await expect(page.locator('.score-reading')).toHaveText('—');
  await expect(page.locator('#score-step')).toContainText('ORIGINAL RECORDED MEAL SCORE');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.record-id')).toContainText('Result', { timeout: 15000 });
  expect([...apiOrigins]).toEqual([new URL(baseURL!).origin]);
});

test('meal errors leave an explicit unavailable result', async ({ page }) => {
  await page.goto('/#workspace', { waitUntil: 'domcontentloaded' });
  const form = page.locator('#meal-context');
  await expect(form.getByRole('button', { name: 'Simulate this meal' })).toBeEnabled({ timeout: 20000 });
  await form.getByLabel('Meal description', { exact: true }).fill('250 g vegetables and rice');
  await form.getByRole('button', { name: 'Simulate this meal' }).click();
  await expect(form.getByTestId('meal-simulation-score')).toHaveText('—');
  await expect(form.locator('.meal-result')).toContainText('No estimate was substituted');
});
