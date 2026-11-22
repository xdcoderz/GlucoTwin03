import { expect, type Page } from '@playwright/test';
export async function openPatientTwin(page:Page) {
  const disclosure=page.locator('[data-destination=workspace] #patient-twin');
  await expect(disclosure).toBeAttached({timeout:15000});
  if(!await disclosure.evaluate(el=>(el as HTMLDetailsElement).open))await disclosure.locator(':scope > summary').click();
}
export async function openDisclosure(page:Page,selector:string) {
  const el=page.locator(selector);await expect(el).toBeAttached();
  if(!await el.evaluate(node=>(node as HTMLDetailsElement).open))await el.locator(':scope > summary').click();
}
