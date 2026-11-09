import { openPatientTwin, openDisclosure } from './workspaceSupport';
import { test, expect } from './fixtures';

test('full body, organ controls, zoom drill-down, reset, and patient context', async ({ page }) => {
  // Two viewer initializations and several camera/organ interactions also run
  // against CPU graphics in CI. Keep individual expectations unchanged.
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#workspace');
  await openPatientTwin(page);
  const stage = page.getByTestId('anatomy-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 15000 });
  await expect(stage).toHaveAttribute('data-view', 'body');
  await page.locator('.anatomy').scrollIntoViewIfNeeded();
  // Keep interaction checks independent of expensive full-panel image capture.
  // Playwright still captures screenshots on failure.
  await page.getByRole('button', { name: 'Explore the pancreas', exact: true }).click();
  await expect(stage).toHaveAttribute('data-view', 'pancreas');
  await expect(stage).toHaveAttribute('data-stage', 'detail');
  await expect(page.locator('.twin-organ-detail h3')).toHaveText('Pancreas');
  await expect(page.locator('.twin-organ-detail')).toContainText('does not measure insulin secretion');
  for (const name of ['Liver', 'Digestive tract', 'Skeletal muscle', 'Adipose tissue']) {
    await page.getByRole('navigation', { name: 'Choose an organ or tissue' }).getByRole('button', { name }).click();
    await expect(page.locator('.twin-organ-detail h3')).toHaveText(name);
  }
  await page.getByRole('button', { name: 'Body overview / reset' }).click();
  await expect(stage).toHaveAttribute('data-view', 'body');
  await expect(stage).toHaveAttribute('data-stage', 'body');
  await page.getByLabel('Body opacity').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Body opacity')).toHaveValue('25');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.waitForTimeout(550);
  }
  await expect(stage).toHaveAttribute('data-view', 'pancreas');
  await page.getByLabel('Synthetic scenario').selectOption('DEMO-002');
  await openPatientTwin(page);
  await expect(page.locator('.twin-patient-snapshot')).toContainText('DEMO-002');
  await expect(page.locator('.twin-patient-snapshot')).toContainText('190');
  await expect(page.locator('.twin-patient-snapshot')).not.toContainText('0.989');
  expect(errors).toEqual([]);
});

test('wheel zoom automatically moves from whole body to pancreas', async ({ page }) => {
  await page.goto('/#workspace');
  await openPatientTwin(page);
  const stage = page.getByTestId('anatomy-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 15000 });
  const canvas = stage.locator('canvas');
  await canvas.focus();
  await canvas.hover();
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -700);
    await page.waitForTimeout(120);
  }
  await expect(stage).toHaveAttribute('data-view', 'pancreas');
  await expect(page.locator('.twin-organ-detail h3')).toHaveText('Pancreas');
});

test('keyboard actions and reduced motion remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#workspace');
  await openPatientTwin(page);
  const stage = page.getByTestId('anatomy-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 15000 });
  const pancreas = page.getByRole('navigation', { name: 'Choose an organ or tissue' }).getByRole('button', { name: 'Pancreas' });
  await pancreas.focus();
  await page.keyboard.press('Enter');
  await expect(stage).toHaveAttribute('data-view', 'pancreas');
  await expect(stage).toHaveAttribute('data-stage', 'detail');
  const canvas = stage.locator('canvas');
  await canvas.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('r');
  await expect(stage).toHaveAttribute('data-view', 'body');
  await page.keyboard.press('+');
  await page.keyboard.press('+');
  await expect(stage).toHaveAttribute('data-view', 'pancreas');
});

test('400px touch layout and organ selection', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/#workspace');
  await openPatientTwin(page);
  const stage = page.getByTestId('anatomy-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 15000 });
  await page.getByRole('navigation', { name: 'Choose an organ or tissue' }).getByRole('button', { name: 'Liver' }).click();
  await expect(page.locator('.twin-organ-detail h3')).toHaveText('Liver');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.anatomy').screenshot({ path: '../../docs/screenshots/anatomy_mobile.png' });
});

test('WebGL failure keeps the organ guide and patient context available', async ({ page }) => {
  test.setTimeout(75000);
  await page.addInitScript(() => {
    (window as Window & { denyWebGL: boolean }).denyWebGL = true;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if ((window as Window & { denyWebGL: boolean }).denyWebGL && String(args[0]).startsWith('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/#workspace');
  await openPatientTwin(page);
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-status', 'error');
  await expect(page.getByText('3D view is unavailable', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Choose an organ or tissue' }).getByRole('button', { name: 'Digestive tract' }).click();
  await expect(page.getByRole('button',{name:'Start guided tour'})).toHaveCount(0);
  await expect(page.locator('.twin-organ-detail h3')).toHaveText('Digestive tract');
  await page.getByRole('navigation', { name: 'Choose an organ or tissue' }).getByRole('button', { name: 'Pancreas' }).click();
  await expect(page.locator('.twin-organ-detail h3')).toHaveText('Pancreas');
  await expect(page.getByRole('button', { name: 'Retry 3D view' })).toBeVisible();
  await page.evaluate(() => { (window as Window & { denyWebGL: boolean }).denyWebGL = false; });
  await page.getByRole('button', { name: 'Retry 3D view' }).click();
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-status', 'ready', {timeout:15000});
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-view', 'pancreas');
});
