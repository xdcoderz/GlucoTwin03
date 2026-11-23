import { openPatientTwin, openDisclosure } from './workspaceSupport';
import { test, expect } from './fixtures';

test('readiness steps expose missing samples, recover, and offer a saved unavailable attempt', async ({ page, request }) => {
  const fixture = await (await request.get('http://127.0.0.1:18083/api/patients/DEMO-001/readiness')).json();
  let mode = 'missing';
  await page.route('**/api/patients/DEMO-001/readiness', route => {
    if (mode === 'offline') return route.fulfill({ status: 503, json: {} });
    const body = structuredClone(fixture);
    if (mode === 'missing') {
      body.historyReady = false; body.receivedExpectedSamples = 8; body.nextAction = 'history';
      body.qualityIssues = ['missing_history_offset_45'];
      body.historySlots.find((s: { minutesBefore: number }) => s.minutesBefore === 45).status = 'missing';
    }
    return route.fulfill({ json: body });
  });
  await page.goto('/#phase-one-flow');
  await expect(page.locator('.history-quality-heading')).toContainText('8 of 9');
  await expect(page.getByRole('button', { name: /Score & save/ })).toBeDisabled();
  await page.locator('.phase-one-flow').screenshot({ path: '../../docs/screenshots/phase1_missing_history.png' });
  mode = 'ready';
  await expect(page.getByRole('button', { name: /Score & save/ })).toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: /Score & save/ }).click();
  await expect(page.locator('.record-id')).toContainText('Result');
  await expect(page.locator('.score-reading')).toHaveText('—');
  mode = 'offline';
  await expect(page.getByRole('button', { name: 'Retry readiness' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: /Score & save/ })).toBeDisabled();
  mode = 'ready';
  await page.getByRole('button', { name: 'Retry readiness' }).click();
  await expect(page.getByRole('button', { name: /Score & save/ })).toBeEnabled();
});

test('a background API outage preserves review draft, disables changes and recovers', async ({ page, request }) => {
  await request.post('http://127.0.0.1:18083/api/patients/DEMO-002/refresh');
  await page.goto('/?patient=DEMO-002#workspace');
  await openPatientTwin(page);
  await page.getByLabel('Local demo review note').fill('TEST ONLY: preserve this unsaved draft during a brief outage.');
  await page.route('**/api/patients/DEMO-002', route => route.fulfill({ status: 503, json: {} }));
  await expect(page.locator('.connection-warning')).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel('Local demo review note')).toHaveValue(/preserve this unsaved draft/);
  await expect(page.getByRole('button', { name: 'Mark reviewed', exact: true })).toBeDisabled();
  await expect(page.getByTestId('anatomy-stage')).toBeAttached();
  await page.unroute('**/api/patients/DEMO-002');
  // Automatic polling may recover before a user can click the retry button.
  await expect(page.locator('.connection-warning')).toHaveCount(0);
  await expect(page.getByLabel('Local demo review note')).toHaveValue(/preserve this unsaved draft/);
  await expect(page.getByRole('button', { name: 'Mark reviewed', exact: true })).toBeEnabled();
});

test('phase 1 navigation, mobile layout, reduced motion and independent overlay controls', async ({ page }) => {
  await page.goto('/#workspace');
  await openPatientTwin(page);
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Animate glucose overlay', exact: true }).click();
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-playing', 'true');
  const glucose = await page.getByTestId('anatomy-stage').getAttribute('data-glucose');
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-glucose', glucose!);
  await page.getByRole('button', { name: 'Pause overlay motion', exact: true }).click();
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-playing', 'false');
  await page.locator('.phase-one-flow').screenshot({ path: '../../docs/screenshots/phase1_flow_desktop.png' });
  await page.setViewportSize({ width: 400, height: 860 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Animate glucose overlay', exact: true })).toBeDisabled();
  await page.getByRole('navigation', { name: 'Dashboard sections' }).getByRole('link', { name: 'Glucose history' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#phase-one-flow$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.phase-one-flow').screenshot({ path: '../../docs/screenshots/phase1_flow_mobile.png' });
});
