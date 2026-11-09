import {test,expect} from './fixtures';
import {openPatientTwin} from './workspaceSupport';

test('stalled graphics import reaches fallback while the patient workflow remains usable',async({page})=>{
  test.setTimeout(60000);
  await page.emulateMedia({reducedMotion:'reduce'});
  // Hold the module before GPU initialization, independently of local GPU speed.
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/src/anatomy/scene.ts',async route=>{await gate;await route.abort();});
  try {
    await page.goto('/#workspace',{waitUntil:'domcontentloaded'});
    await openPatientTwin(page);
    await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-status','loading');
    await expect(page.getByTestId('anatomy-stage')).toHaveAttribute('data-status','error',{timeout:25000});
    await expect(page.getByRole('button',{name:'Retry 3D view'})).toBeVisible();
    const guide=page.getByRole('navigation',{name:'Choose an organ or tissue'});
    await guide.getByRole('button',{name:'Liver',exact:true}).click();
    await expect(page.locator('.twin-organ-detail h3')).toHaveText('Liver');
    await expect(page.getByLabel('Meal description',{exact:true})).toBeEditable();
  } finally {release();}
});
