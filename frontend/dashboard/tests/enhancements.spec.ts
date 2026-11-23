import { openPatientTwin } from './workspaceSupport';
import { test, expect, type Page } from './fixtures';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const pdfText = (path: string) => execFileSync('python', ['-c', 'import sys; from pypdf import PdfReader; r=PdfReader(sys.argv[1]); print("\\n".join(p.extract_text() for p in r.pages))', path], { encoding: 'utf8' });
async function saveReport(page: Page, path: string) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download research summary|Retry PDF download/ }).click();
  const result = await download;
  expect(result.suggestedFilename()).toMatch(/^GlucoTwin_DEMO-00[12]_.*\.pdf$/);
  await result.saveAs(path);
  return pdfText(path);
}

test('guided tour stays hidden while manual organ exploration remains available', async ({page})=>{
  await page.goto('/#workspace');await openPatientTwin(page);
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-status','ready',{timeout:15000});
  await expect(page.getByRole('button',{name:'Start guided tour'})).toHaveCount(0);
  await page.getByRole('navigation',{name:'Choose an organ or tissue'}).getByRole('button',{name:'Liver'}).click();
  await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-view','liver');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Overview',exact:true}).click();
  await expect(page.getByRole('button',{name:/guided tour|Guided Journey/i})).toHaveCount(0);
});

test('PDF export of unavailable preview never invents a score', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#workspace');
  const text = await saveReport(page, resolve('../../output/pdf/glucotwin_research_snapshot_example.pdf'));
  expect(text).toContain('PREVIEW ONLY');
  expect(text).toContain('NOT AVAILABLE - no score substituted');
  expect(text).toContain('module_preview_no_model');
  expect(text).toContain('142.0 mg/dL');
  expect(text).toContain('2026-10-30 11:30:00 UTC');
  expect(text).toContain('No factor contributions shown');
  expect(text).toContain('inference timestamp');
  expect(text).not.toContain('0.368');
  await expect(page.getByRole('status').filter({ hasText: 'PDF download started' })).toBeVisible();
  await page.locator('.page-heading').screenshot({ path: '../../docs/screenshots/research_export_desktop.png' });
  expect(errors).toEqual([]);
});

test('available-score PDF captures the clicked patient during a scenario switch', async ({ page, request }) => {
  const fixture = await (await request.get('http://127.0.0.1:18083/api/patients/DEMO-001')).json();
  fixture.patient.displayName = 'TEST FIXTURE - synthetic export QA';
  fixture.prediction = { status: 'available', model_score: 0.3677653238267805, horizon_minutes: 120, threshold: 0.5, predicted_event: false, model_version: 'TEST-FIXTURE-NOT-INFERENCE', reason: null, top_factors: [{ feature: 'bmi', contribution: 0.1234, direction: 'up' }] };
  await page.route('**/api/patients/DEMO-001', route => route.fulfill({ json: fixture }));
  await page.route('**/src/reports/researchSummary.ts', async route => { await new Promise(done => setTimeout(done, 1000)); await route.continue(); });
  await page.goto('/#workspace');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download research summary' }).click();
  await expect(page.getByRole('button', { name: 'Preparing PDF…' })).toBeDisabled();
  await page.getByLabel('Synthetic scenario').selectOption('DEMO-002');
  const result = await download;
  const path = resolve('../../tmp/pdfs/available_test_fixture.pdf');
  await result.saveAs(path);
  const text = pdfText(path);
  expect(text).toContain('DEMO-001');
  expect(text).not.toContain('DEMO-002');
  expect(text).toContain('TEST FIXTURE');
  expect(text).toContain('0.368');
  expect(text).toContain('0.1234');
  expect(text).toContain('negative');
  expect(text).toContain('TEST-FIXTURE-NOT-INFERENCE');
});

test('mobile anatomy and empty/long-context PDF; error has a working retry', async ({ page, request }) => {
  const fixture = await (await request.get('http://127.0.0.1:18083/api/patients/DEMO-001')).json();
  fixture.patient.displayName = 'TEST FIXTURE ' + 'Long synthetic record title '.repeat(10);
  fixture.currentMeal.description = 'Synthetic meal with a long descriptive context. '.repeat(16);
  fixture.cgmHistory = [];
  fixture.prediction.model_score = 0.999;
  fixture.prediction.top_factors = [{ feature: 'STALE-FACTOR-MUST-NOT-APPEAR', contribution: 99, direction: 'up' }];
  await page.route('**/api/patients/DEMO-001', route => route.fulfill({ json: fixture }));
  await page.setViewportSize({ width: 400, height: 860 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#workspace');
  await openPatientTwin(page);
  await page.getByRole('navigation',{name:'Choose an organ or tissue'}).getByRole('button',{name:'Digestive tract'}).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.anatomy').screenshot({ path: '../../docs/screenshots/guided_tour_mobile.png' });
  await page.evaluate(() => { (window as Window & { savedObjectURL?: typeof URL.createObjectURL }).savedObjectURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('Test-only export failure'); }; });
  await page.getByRole('button', { name: 'Download research summary' }).click();
  await expect(page.getByRole('button', { name: 'Retry PDF download' })).toBeVisible();
  await expect(page.locator('#export-status')).toContainText('Your data is unchanged');
  await page.locator('.page-heading').screenshot({ path: '../../docs/screenshots/research_export_retry_mobile.png' });
  await page.evaluate(() => { URL.createObjectURL = (window as Window & { savedObjectURL: typeof URL.createObjectURL }).savedObjectURL; });
  const text = await saveReport(page, resolve('../../tmp/pdfs/empty_long_test_fixture.pdf'));
  expect(text).toContain('No valid timestamped CGM readings');
  expect(text).not.toContain('0.999');
  expect(text).not.toContain('STALE-FACTOR-MUST-NOT-APPEAR');
  expect(text).toContain('No factor contributions shown');
});
