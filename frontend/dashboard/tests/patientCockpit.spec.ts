import { test, expect } from './fixtures';

test('cockpit shares one observation timeline and separates fixed context', async ({ page }) => {
  await page.goto('/#workspace');
  const cockpit = page.getByRole('region', { name: 'Connected patient cockpit' });
  await expect(page.getByRole('region', { name: 'Data source and service status' })).toContainText('PREVIEW');
  await expect(cockpit.getByTestId('twin-glucose')).toContainText('142');
  await expect(page.locator('[data-destination=workspace] .timeline-chart')).toHaveCount(1);
  await expect(page.getByTestId('anatomy-stage')).toHaveCount(0);
  await expect(cockpit.getByRole('button', { name: 'Latest follow-up sample' })).toBeDisabled();
  const frozen = await cockpit.getByTestId('cockpit-frozen-result').textContent();
  await page.getByRole('slider', { name: /Selected sample/ }).fill('0');
  await expect(cockpit.getByTestId('twin-glucose')).toContainText('112');
  await expect(cockpit.locator('.cockpit-diagram')).toHaveAttribute('data-glucose', '112');
  await expect(cockpit.locator('.cockpit-stage')).toHaveText('Before the meal');
  await expect(page.getByRole('img', { name: /Recorded glucose timeline/ })).toHaveAttribute('aria-label', /Selected 112/);
  await expect(cockpit.getByTestId('cockpit-frozen-result')).toHaveText(frozen!);
  await expect(cockpit.getByRole('complementary', { name: 'Fixed patient background' })).toContainText('7.6');
  await cockpit.getByRole('button', { name: 'At the meal', exact: true }).click();
  await expect(cockpit.getByTestId('twin-glucose')).toContainText('142');
  await expect(cockpit.locator('.cockpit-diagram')).toHaveAttribute('data-glucose', '142');
  await cockpit.getByRole('button', { name: 'Explain Liver', exact: true }).click();
  await expect(cockpit.locator('.cockpit-organ-note')).toContainText('Liver function and glucose production are not measured');
  await page.setViewportSize({ width: 400, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('follow-up moves the observation without replacing the saved meal result', async ({ page }) => {
  await page.goto('/#workspace');
  await page.getByRole('button', { name: /Score & save/ }).click();
  const cockpit = page.getByRole('region', { name: 'Connected patient cockpit' });
  await expect(cockpit.getByTestId('cockpit-frozen-result')).toContainText('SAVED MEAL RESULT');
  await expect(cockpit.getByTestId('cockpit-outcome')).toContainText('Follow-up incomplete');
  const frozen = await cockpit.getByTestId('cockpit-frozen-result').textContent();
  await page.locator('.demo-controls > summary').click();
  await page.getByRole('button', { name: 'Complete follow-up replay' }).click();
  await expect(cockpit.getByTestId('cockpit-outcome')).toContainText('Complete follow-up');
  await expect(cockpit.getByRole('button', { name: 'Latest follow-up sample' })).toBeEnabled();
  await cockpit.getByRole('button', { name: 'Latest follow-up sample' }).click();
  await expect(cockpit.locator('.cockpit-stage')).toHaveText('Observed follow-up');
  await expect(cockpit.getByTestId('cockpit-frozen-result')).toHaveText(frozen!);
  await cockpit.getByRole('button', { name: 'At the meal', exact: true }).click();
  await expect(cockpit.getByTestId('twin-glucose')).toContainText('142');
  await page.getByLabel('Synthetic scenario').selectOption('DEMO-002');
  await expect(cockpit).toHaveAttribute('data-patient', 'DEMO-002');
  await expect(cockpit.getByTestId('cockpit-frozen-result')).toContainText('NO SAVED ATTEMPT');
  await expect(cockpit.getByTestId('cockpit-outcome')).toContainText('No saved attempt');
});

test('a lost glucose stream clears the selected observation, not the saved context', async ({ page }) => {
  await page.goto('/#workspace');
  const cockpit = page.getByRole('region', { name: 'Connected patient cockpit' });
  await expect(cockpit.getByTestId('twin-glucose')).toContainText('142');
  await page.route('**/api/patients/DEMO-001/cgm', route => route.abort());
  await expect(cockpit.getByTestId('twin-glucose')).toContainText('—', { timeout: 12000 });
  await expect(cockpit.locator('.cockpit-stage')).toHaveText('Observation unavailable');
  await expect(cockpit.getByRole('button', { name: 'At the meal', exact: true })).toBeDisabled();
  await expect(cockpit.getByRole('button', { name: 'Previous sample', exact: true })).toBeDisabled();
  await expect(cockpit.getByRole('img', { name: /Recorded glucose timeline/ })).toHaveAttribute('aria-label', /Selected reading unavailable/);
  await expect(cockpit.getByTestId('cockpit-frozen-result')).toContainText('Score unavailable');
  await expect(cockpit.getByRole('complementary', { name: 'Fixed patient background' })).toContainText('7.6');
});

test('UI fixture preserves a numeric saved score and reports an event in incomplete follow-up', async ({ page, request }) => {
  await request.post('http://127.0.0.1:18083/api/patients/DEMO-001/refresh');
  const response = await request.get('http://127.0.0.1:18083/api/patients/DEMO-001');
  const data = await response.json();
  // Display fixture only. Reuse the snapshot so teardown cannot interrupt a routed fetch.
  const prediction = { ...data.prediction, status: 'available', model_score: 0.731, predicted_event: true, threshold: 0.5 };
  data.prediction = prediction;
  data.journal.prediction = prediction;
  data.journal.outcome = { ...data.journal.outcome, complete: false, eventObserved: true, receivedSamples: 1 };
  await page.route('**/api/patients/DEMO-001', route => route.fulfill({ json: data }));
  await page.goto('/#workspace');
  const cockpit = page.getByRole('region', { name: 'Connected patient cockpit' });
  await expect(cockpit.getByTestId('cockpit-frozen-result')).toContainText('0.731');
  await expect(cockpit.getByTestId('cockpit-outcome')).toContainText('An event has already been observed');
  await expect(cockpit.getByTestId('cockpit-outcome')).not.toContainText('outcome is not yet determined');
  await page.getByRole('slider', { name: /Selected sample/ }).fill('0');
  await expect(cockpit.getByTestId('twin-glucose')).toContainText('112');
  await expect(cockpit.getByTestId('cockpit-frozen-result')).toContainText('0.731');
});
