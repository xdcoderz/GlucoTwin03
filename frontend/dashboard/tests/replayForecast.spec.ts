import { expect, test } from '@playwright/test';

test('worklist switches patient and backend absence never produces a local forecast', async ({ page }) => {
  await page.goto('/?patient=DEMO-001#workspace');
  const worklist = page.getByRole('region', { name: 'Patient worklist', exact: true });
  await expect(worklist.getByRole('button', { name: 'DEMO-001' })).toBeVisible();
  await worklist.getByRole('searchbox').fill('DEMO-002');
  await expect(worklist.getByRole('button', { name: 'DEMO-001' })).toHaveCount(0);
  await worklist.getByRole('button', { name: 'DEMO-002' }).click();
  await expect(page.getByRole('combobox', { name: 'Synthetic scenario' })).toHaveValue('DEMO-002');
  await page.getByText('Glucose forecast at selected reading', { exact: true }).click();
  await page.getByRole('button',{name:'Run & save twin forecast'}).click();
  await expect(page.locator('.replay-forecast').getByRole('alert')).toContainText('No substitute forecast');
  await expect(page.getByTestId('replay-forecast')).toHaveCount(0);
});
