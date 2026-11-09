import { openPatientTwin, openDisclosure } from './workspaceSupport';
import { test, expect, type Page } from './fixtures';

// These functional flows initialize both recorded and future viewers on CPU
// graphics. Individual readiness and value assertions keep their own limits.
test.describe.configure({timeout:90000});

const baseline = '2026-10-30T12:00:00.000Z';
const row = (minutes: number, glucose: number) => ({ eventId: `TEST-TWIN-${minutes}-${glucose}`, observedAt: new Date(Date.parse(baseline) + minutes * 60000).toISOString(), glucoseMgDl: glucose, source: 'TEST-SYNTHETIC' });
const source = [row(-30, 130), row(-15, 136), row(0, 142)];
async function go(page: Page) {
  await page.goto('/#workspace');
  await openPatientTwin(page);
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-status', 'ready', {timeout:15000});
}
async function sample(page: Page, index: number) {
  await page.locator('[data-destination=workspace]:visible #twin-time-recorded,[data-destination=future]:visible #viewer-time-vision').fill(String(index));
}

test('recorded stream updates the body; scrubbing freezes selection without changing meal baseline', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  let rows = [...source];
  await page.route('**/api/patients/DEMO-001/cgm', route => route.fulfill({ json: rows }));
  await go(page);
  const stage = page.getByTestId('anatomy-stage').filter({visible:true});
  await expect(stage).toHaveAttribute('data-glucose', '142');
  rows = [...source, row(15, 185)];
  await expect(stage).toHaveAttribute('data-glucose', '185', { timeout: 8000 });
  await expect(stage).toHaveAttribute('data-signal-color', '#dc5b66');
  await expect(page.locator('.meal-context-meta')).toContainText('142 mg/dL');
  await expect(page.locator('[data-destination=workspace] .timeline-chart')).toHaveAttribute('aria-label',/185/);
  await sample(page, 0);
  await expect(stage).toHaveAttribute('data-glucose', '130');
  rows = [...rows, row(30, 200)];
  await expect(page.locator('.timeline-scrubber').filter({visible:true})).toContainText('/ 5', { timeout: 8000 });
  await expect(stage).toHaveAttribute('data-glucose', '130');
  await page.getByRole('button', { name: 'Follow latest', exact: true }).click();
  await expect(stage).toHaveAttribute('data-glucose', '200');
  await page.getByTestId('twin-experience').filter({visible:true}).screenshot({ path: '../../docs/screenshots/twin_recorded_desktop.png' });
  expect(errors).toEqual([]);
});

test('future scripts drive body and chart without replacing a score or writing to API', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.route('**/api/patients/DEMO-001/cgm', route => route.fulfill({ json: source }));
  await go(page);
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Future lab',exact:true }).click();
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-status','ready',{timeout:15000});
  await expect(page.getByTestId('twin-experience').filter({visible:true})).toHaveAttribute('data-phase', 'vision');
  await expect(page.locator('.experience-source').filter({visible:true})).toContainText('not a model prediction');
  await sample(page, 4);
  const stage = page.getByTestId('anatomy-stage').filter({visible:true});
  await expect(stage).toHaveAttribute('data-glucose', '209');
  await expect(page.locator('.timeline-chart').filter({visible:true})).toHaveAttribute('aria-label', /209.*60 minutes/);
  await page.getByRole('button', { name: 'Explore the pancreas', exact: true }).click();
  await expect(stage).toHaveAttribute('data-view', 'pancreas');
  await page.waitForTimeout(600);
  await page.getByTestId('twin-experience').filter({visible:true}).screenshot({ path: '../../docs/screenshots/twin_vision_pancreas.png' });
  await page.getByLabel('Fictional glucose story').selectOption('dip');
  await sample(page, 4);
  await expect(stage).toHaveAttribute('data-glucose', '65');
  await expect(stage).toHaveAttribute('data-signal-color', '#4489e3');
  await expect(page.locator('.score-reading')).toHaveText('—');
  await expect(page.locator('.meal-context-meta')).toContainText('142 mg/dL');
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Patient workspace',exact:true }).click();
  await expect(stage).toHaveAttribute('data-glucose', '142');
  expect(posts).toEqual([]);
});

test('playback advances one sample, pauses, ends, and patient switching resets mock state', async ({ page }) => {
  await page.route('**/api/patients/DEMO-001/cgm', route => route.fulfill({ json: source }));
  await go(page);
  // Freeze the replay clock so the final sample cannot race a slow software-WebGL click.
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const stage = page.getByTestId('anatomy-stage').filter({visible:true});
  await page.getByRole('button', { name: 'Play replay', exact: true }).click();
  await expect(stage).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(1000);
  await expect(stage).toHaveAttribute('data-glucose', '136');
  await page.getByRole('button', { name: 'Pause replay', exact: true }).click();
  await expect(stage).toHaveAttribute('data-playing', 'false');
  const held = await stage.getAttribute('data-glucose');
  await page.clock.runFor(1300);
  await expect(stage).toHaveAttribute('data-glucose', held!);
  await expect(stage).toHaveAttribute('data-playing', 'false');
  await page.getByRole('button', { name: 'Play replay', exact: true }).click();
  await page.clock.runFor(2100);
  await expect(stage).toHaveAttribute('data-playing', 'false', { timeout: 5000 });
  await expect(stage).toHaveAttribute('data-glucose', '142');
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Future lab',exact:true }).click();
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-status','ready',{timeout:15000});
  await sample(page, 4);
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Patient workspace',exact:true }).click();
  await page.getByLabel('Synthetic scenario').selectOption('DEMO-002');
  await openPatientTwin(page);
  await expect(page.getByTestId('twin-experience').filter({visible:true})).toHaveAttribute('data-phase', 'recorded');
  await expect(stage).toHaveAttribute('data-glucose', '190');
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Future lab',exact:true }).click();
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-status','ready',{timeout:15000});
  await sample(page, 4);
  await expect(stage).toHaveAttribute('data-glucose', '257');
});

test('stream failure clears overlay and retry restores it; conflicting timestamps are withheld', async ({ page }) => {
  let mode = 'good';
  await page.route('**/api/patients/DEMO-001/cgm', route => mode === 'offline' ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: mode === 'conflict' ? [...source, row(0, 199)] : source }));
  await go(page);
  const stage = page.getByTestId('anatomy-stage').filter({visible:true});
  await expect(stage).toHaveAttribute('data-glucose', '142');
  mode = 'offline';
  await expect(stage).toHaveAttribute('data-glucose', 'none', { timeout: 8000 });
  await expect(page.getByRole('button', { name: 'Play replay', exact: true })).toBeDisabled();
  await expect(page.locator('.timeline-warning').filter({visible:true})).toContainText('stream unavailable');
  mode = 'good';
  await page.getByRole('button', { name: 'Retry glucose stream' }).click();
  await expect(stage).toHaveAttribute('data-glucose', '142');
  mode = 'conflict';
  await expect(page.locator('.timeline-warning').filter({visible:true})).toContainText('Conflicting glucose', { timeout: 8000 });
  await expect(stage).toHaveAttribute('data-glucose', 'none');
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Future lab',exact:true }).click();
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-status','ready',{timeout:15000});
  await expect(page.locator('.timeline-empty').filter({visible:true})).toContainText('valid recorded meal baseline');
});

test('mobile and reduced motion support both phases and keyboard sample selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 400, height: 860 });
  await page.route('**/api/patients/DEMO-001/cgm', route => route.fulfill({ json: source }));
  await go(page);
  await expect(page.getByRole('button', { name: 'Play replay', exact: true })).toBeDisabled();
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Future lab',exact:true }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('3D sample', { exact: true }).filter({visible:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-glucose', '159');
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-playing', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('twin-experience').filter({visible:true}).screenshot({ path: '../../docs/screenshots/twin_vision_mobile.png' });
  await page.getByRole('navigation', { name:'Main navigation' }).getByRole('link', { name:'Patient workspace',exact:true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('twin-experience').filter({visible:true}).screenshot({ path: '../../docs/screenshots/twin_recorded_mobile.png' });
});

test('empty and malformed stream never invent readings', async ({ page }) => {
  let rows: unknown = [];
  await page.route('**/api/patients/DEMO-001/cgm', route => route.fulfill({ json: rows }));
  await go(page);
  await expect(page.locator('.timeline-empty').filter({visible:true})).toContainText('No valid samples');
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-glucose', 'none');
  rows = [{ observedAt: 'not-a-date', glucoseMgDl: 142 }];
  await expect(page.locator('.timeline-warning').filter({visible:true})).toContainText('Invalid glucose or timestamps', { timeout: 8000 });
  await expect(page.getByTestId('anatomy-stage').filter({visible:true})).toHaveAttribute('data-glucose', 'none');
});
