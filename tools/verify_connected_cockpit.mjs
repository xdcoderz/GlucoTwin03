/** Actual fitted-model UI verification. Writes one synthetic custom meal; never resets records. */
import { chromium } from '../frontend/dashboard/node_modules/playwright/index.mjs';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

const argument = name => process.argv[process.argv.indexOf(name) + 1];
assert(process.argv.includes('--origin') && process.argv.includes('--evidence') && process.argv.includes('--allow-synthetic-writes'),
  'Required: --origin http://127.0.0.1:PORT --evidence PATH --allow-synthetic-writes. Use an isolated synthetic test database.');
const origin = new URL(argument('--origin'));
assert(['127.0.0.1', 'localhost'].includes(origin.hostname) && origin.protocol === 'http:' && !origin.username && !origin.password, 'Loopback HTTP only');
const evidence = path.resolve(argument('--evidence'));
await fs.mkdir(path.dirname(evidence), { recursive: true });
const report = { mode: 'actual fitted model, native local Spring backend; no response mocks', at: new Date().toISOString(), passed: false, checks: [], pageErrors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.pageErrors.push(error.message));
  const get = async suffix => {
    const response = await page.request.get(origin.origin + '/api' + suffix);
    assert(response.ok(), suffix);
    return response.json();
  };
  const before = {};
  for (const id of ['DEMO-001', 'DEMO-002']) {
    const data = await get('/patients/' + id);
    assert.equal(data.patient.patientId, id);
    assert(data.cgmHistory.every(row => row.source === 'synthetic-cgm-replay'));
    before[id] = await get(`/patients/${id}/journal`);
    assert(before[id].length > 0 && before[id][0].prediction.status === 'available', 'Run baseline/recovery first');
  }
  await page.goto(origin.origin + '/?patient=DEMO-001#workspace');
  const rejected = await page.request.post(origin.origin + '/api/patients/DEMO-001/meal-simulations', {
    headers: { Origin: 'https://unrelated.example' },
    data: { description: 'Synthetic origin rejection check', categories: ['bread'], portionGrams: 250, minutesSincePreviousMeal: 180 },
  });
  assert.equal(rejected.status(), 403, 'Unrelated origins must still be rejected');
  report.checks.push('The backend rejects an unrelated Origin through the same proxy.');
  const cockpit = page.getByRole('region', { name: 'Connected patient cockpit' });
  await page.waitForFunction(() => document.querySelector('[data-testid=cockpit-frozen-result]')?.textContent.includes('0.368'));
  await cockpit.screenshot({ path: path.join(path.dirname(evidence), 'connected-cockpit.png') });
  await page.getByRole('slider', { name: /Selected sample/ }).fill('0');
  assert((await cockpit.getByTestId('twin-glucose').innerText()).includes('112'));
  assert((await cockpit.getByTestId('cockpit-frozen-result').innerText()).includes('0.368'));
  await cockpit.getByRole('button', { name: 'At the meal', exact: true }).click();
  assert((await cockpit.getByTestId('twin-glucose').innerText()).includes('142'));
  report.checks.push('Actual saved score remains fixed while observation and shared timeline change.');

  const meal = page.locator('#meal-context');
  await meal.getByLabel('Meal description', { exact: true }).fill('2 rotis with dal and a cup of curd');
  await meal.getByLabel('Total portion (g)', { exact: true }).fill('250');
  await meal.getByLabel('Minutes since previous meal', { exact: true }).fill('180');
  const reply = page.waitForResponse(r => r.url().endsWith('/DEMO-001/meal-simulations') && r.request().method() === 'POST');
  await meal.getByRole('button', { name: 'Simulate this meal' }).click();
  const response = await reply;
  if (!response.ok()) {
    report.rejectedPayload = response.request().postDataJSON();
    report.rejectedResponse = await response.text();
    throw new Error(`Custom meal HTTP ${response.status()}: ${report.rejectedResponse}`);
  }
  const row = await response.json();
  assert.equal(row.prediction.status, 'available');
  assert.equal(row.prediction.model_version, 'shanghai-logistic-v1');
  assert.equal(Object.keys(row.features).length, 43);
  assert.equal(row.features.baseline_glucose_mg_dl, 142);
  assert.equal(row.features.reported_food_weight_g, 250);
  assert.deepEqual(row.meal.selectedFoodCategories, ['bread', 'dairy']);
  await page.waitForFunction(score => document.querySelector('[data-testid=meal-simulation-score]')?.textContent === score, row.prediction.model_score.toFixed(3));
  // GPU acceptance is separate: preserve the numerical workflow without requiring a successful 3D draw.
  await meal.getByRole('button', { name: 'Hide meal simulation twin' }).click();
  report.customMeal = { simulationId: row.simulationId, inputHash: row.inputHash, model: row.prediction.model_version, score: row.prediction.model_score, featureCount: Object.keys(row.features).length };
  for (const id of Object.keys(before)) assert.deepEqual(await get(`/patients/${id}/journal`), before[id]);
  report.checks.push('Actual custom-meal response uses 43 inputs, exact weight/categories and the fitted model without modifying either recorded journal.');
  const persisted = (await get('/patients/DEMO-001/meal-simulations')).find(saved => saved.simulationId === row.simulationId);
  assert.deepEqual(persisted, row);
  await page.reload();
  await meal.locator('.meal-simulation-history > summary').click();
  await meal.locator('.meal-simulation-history li button').filter({ hasText: '2 rotis with dal' }).first().click();
  assert.equal(await meal.getByLabel('Total portion (g)', { exact: true }).inputValue(), '250');
  assert.equal(await meal.getByTestId('meal-simulation-score').innerText(), row.prediction.model_score.toFixed(3));
  report.checks.push('Custom-meal record and exact output reopen after reload.');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download saved result', exact: true }).click();
  report.pdf = path.join(path.dirname(evidence), 'saved-model-result.pdf');
  await (await download).saveAs(report.pdf);
  report.savedResultId = before['DEMO-001'][0].predictionId;
  report.savedInputHash = before['DEMO-001'][0].inputHash;
  report.savedScore = before['DEMO-001'][0].prediction.model_score;
  await page.getByLabel('Synthetic scenario').selectOption('DEMO-002');
  await page.waitForFunction(() => document.querySelector('[data-testid=cockpit-frozen-result]')?.textContent.includes('0.989'));
  assert.equal(await cockpit.getAttribute('data-patient'), 'DEMO-002');
  assert((await cockpit.getByTestId('cockpit-frozen-result').innerText()).includes(before['DEMO-002'][0].predictionId));
  report.checks.push('Second patient displays its own actual saved score and result ID.');
  for (const width of [320, 400, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  report.checks.push('No horizontal overflow at 320, 400 and 1440 pixels.');
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  await fs.writeFile(evidence, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
