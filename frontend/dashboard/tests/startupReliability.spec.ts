import { test, expect } from './fixtures';

test('overview defers workspace modules and polling until the workspace is opened', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  // Keep graphics out of this network/loading regression.
  await page.route('**/src/landing/experience.ts', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.landing-fallback')).toBeVisible();
  expect(requests.some(url => /TwinExperience|MealSimulator|ResearchWorkflow/.test(url))).toBe(false);
  expect(requests.some(url => /\/readiness$|\/worklist$|\/meal-simulations$/.test(url))).toBe(false);
  await page.getByTestId('landing-introduction').getByRole('link', { name: 'Open patient workspace', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Connected patient cockpit' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Score & save/ })).toBeEnabled();
  expect(requests.some(url => /TwinExperience/.test(url))).toBe(true);
  await expect(page.getByTestId('anatomy-stage')).toHaveCount(0);
  await page.goto('/#score-step');
  await page.reload();
  await expect.poll(() => page.locator('#score-step').evaluate(section => {
    const top = section.getBoundingClientRect().top;
    return top >= 0 && top < window.innerHeight;
  }).catch(() => false)).toBe(true);
});

test('stalled overview import reaches a retryable fallback and preserves the patient workflow', async ({ page }) => {
  test.setTimeout(45000);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/landing/experience.ts', async route => { await gate; await route.abort(); });
  try {
    await page.goto('/');
    await expect(page.locator('.landing-loading')).toBeVisible();
    await expect(page.locator('.landing-fallback')).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('button', { name: 'Reload page', exact: true })).toBeVisible();
    await page.locator('.landing-fallback').getByRole('link', { name: 'Open patient workspace' }).click();
    await expect(page.getByLabel('Meal description', { exact: true })).toBeEditable();
    await expect(page.getByRole('button', { name: /Score & save/ })).toBeEnabled();
  } finally { release(); }
});

test('a failed workspace download preserves navigation and can recover after reload', async ({ page }) => {
  await page.route('**/src/meal/MealSimulator.tsx', route => route.abort());
  await page.goto('/#workspace');
  await expect(page.getByText('This section could not load', { exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Evidence', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What the prototype demonstrates' })).toBeVisible();
  await nav.getByRole('link', { name: 'Patient workspace', exact: true }).click();
  await page.unroute('**/src/meal/MealSimulator.tsx');
  await page.getByRole('button', { name: 'Reload page', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Connected patient cockpit' })).toBeVisible();
});

test('software-rendered overview idles and keeps organ navigation available', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  const hero = page.getByTestId('landing-experience');
  await expect(hero).toHaveAttribute('data-scene-status', 'ready', { timeout: 20000 });
  test.skip(await hero.getAttribute('data-graphics-quality') !== 'reduced', 'Requires the software-WebGL test configuration');
  await expect(hero.getByRole('button', { name: 'Auto-rotate model', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(hero.locator('#motion-toggle')).toHaveAttribute('aria-checked', 'false');
  // Let one-time load transitions settle, then measure actual draw calls while idle.
  await page.waitForTimeout(1200);
  const before = Number(await hero.getAttribute('data-render-count'));
  await page.waitForTimeout(1000);
  const after = Number(await hero.getAttribute('data-render-count'));
  expect(after - before).toBeLessThanOrEqual(2);
  await hero.locator('[data-organ=liver]').click();
  await expect(hero.locator('#organ-info-title')).toHaveText('Liver');
  await expect(hero).toHaveAttribute('data-focus-state', 'ready');
  await hero.locator('#back-to-body').click();
  await expect(hero.locator('.spatial-hotspot:visible')).toHaveCount(5);
});
