import { openPatientTwin, openDisclosure } from './workspaceSupport';
import { test, expect } from '@playwright/test';

test('natural anatomy can be inspected independently of the glucose overlay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#workspace');
  await openPatientTwin(page);
  const stage = page.getByTestId('anatomy-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 15000 });
  await expect(stage).not.toHaveAttribute('data-glucose', 'none');
  const overlay = page.getByRole('checkbox', { name: 'Show glucose overlay' });
  const canvas = stage.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  // Isolate the WebGL view from HTML labels that change with the view mode.
  const capture = () => canvas.screenshot({ style: '.twin-stage > :not(canvas) { visibility: hidden !important; }' });
  const withOverlay = await capture();
  await overlay.uncheck();
  await expect(page.locator('.twin-signal-key')).toContainText('OVERLAY HIDDEN');
  const withoutOverlay = await capture();
  expect(withoutOverlay.equals(withOverlay)).toBe(false);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name:'Evidence', exact:true }).click();
  await page.goBack();
  await expect(overlay).not.toBeChecked();
  await expect(page.locator('.twin-signal-key')).toContainText('OVERLAY HIDDEN');
  await page.getByRole('navigation', { name: 'Choose an organ or tissue' }).getByRole('button', { name: 'Pancreas' }).click();
  await expect(stage).toHaveAttribute('data-stage', 'detail');
  await page.locator('.twin-viewer').screenshot({ path: '../../docs/screenshots/tissue_pancreas.png' });
  await page.getByRole('button', { name: 'Body overview / reset' }).click();
  await page.locator('.twin-viewer').screenshot({ path: '../../docs/screenshots/tissue_full_body.png' });
  await page.getByText('About tissue colors and references', { exact: true }).click();
  await expect(page.locator('.twin-appearance details')).toContainText('not patient measurements or a validated anatomical atlas');
  await expect(page.locator('.twin-appearance a')).toHaveCount(5);
  await page.setViewportSize({ width: 400, height: 860 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.twin-viewer').screenshot({ path: '../../docs/screenshots/tissue_mobile.png' });
  await overlay.check();
  await expect(page.locator('.twin-signal-key')).toContainText('RECORDED GLUCOSE OVERLAY');
});
