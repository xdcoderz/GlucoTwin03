import { openPatientTwin } from './workspaceSupport';
import { test, expect } from './fixtures';

test('destinations, deep links, history, mobile and future isolation', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  let writes=0; page.on('request',r=>{if(r.method()==='POST') writes++;});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  await expect(page.getByRole('heading',{level:1})).toContainText('A little closer');
  await expect(page.getByTestId('landing-experience')).toHaveAttribute('data-scene-status','ready',{timeout:15000});
  await expect(page.locator('.journey-grid li')).toHaveCount(5);
  await nav.getByRole('link',{name:'Patient workspace'}).click();
  const workspace=page.locator('[data-destination=workspace]');
  await openPatientTwin(page);
  await expect(workspace.getByTestId('anatomy-stage')).toHaveAttribute('data-status','ready',{timeout:15000});
  await expect(workspace.locator('.meal-strip')).toContainText('UTC');
  await expect(workspace.getByRole('button',{name:/Score & save/})).toHaveCount(1);
  await expect(workspace.locator('.chart-panel')).toHaveCount(0);
  await workspace.getByRole('link',{name:'Glucose history',exact:true}).click();
  await expect(workspace.locator('.readiness-gate')).toBeVisible();
  const positions = await workspace.evaluate(root=>['patient-record','meal-context','phase-one-flow','score-step','workflow-section'].map(id=>(root.querySelector(`#${id}`) as HTMLElement).getBoundingClientRect().top));
  expect(positions).toEqual([...positions].sort((a,b)=>a-b));
  await nav.getByRole('link',{name:'Evidence',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('What the prototype demonstrates');
  await expect(page.getByRole('link',{name:'Download the project model card'})).toHaveAttribute('href','/research/MODEL_CARD.md');
  await nav.getByRole('link',{name:'Future lab',exact:true}).click();
  const future=page.locator('[data-destination=future]');
  await expect(future.getByTestId('anatomy-stage')).toHaveAttribute('data-status','ready',{timeout:15000});
  await future.getByLabel('Fictional glucose story').selectOption('dip');
  await expect(future.getByTestId('twin-experience')).toHaveAttribute('data-phase','vision');
  expect(writes).toBe(0);
  await page.goBack(); await expect(nav.getByRole('link',{name:'Evidence',exact:true})).toHaveAttribute('aria-current','page');
  await page.goBack(); await expect(workspace).toBeVisible();
  await page.goForward(); await expect(page.getByRole('heading',{level:1})).toHaveText('What the prototype demonstrates');
  await page.goto('/?patient=DEMO-002#workflow-section');
  await expect(page.getByLabel('Synthetic scenario')).toHaveValue('DEMO-002');
  await expect(page.locator('#workflow-section')).toBeVisible();
  await page.setViewportSize({width:400,height:860});
  for(const [label,name] of [['Overview','overview'],['Patient workspace','workspace'],['Evidence','evidence'],['Future lab','future']]) {
    await nav.getByRole('link',{name:label,exact:true}).click();
    await expect(page.locator(`[data-destination=${name}]`)).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('score failure, review draft retention and connection recovery across navigation',async({page,request})=>{
  await request.post('http://127.0.0.1:18083/api/patients/DEMO-001/refresh');
  await page.goto('/#workspace');
  const workspace=page.locator('[data-destination=workspace]');
  await workspace.getByLabel('Local demo review note').fill('TEST ONLY: keep my navigation draft.');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Evidence',exact:true}).click();
  await page.goBack();
  await expect(workspace.getByLabel('Local demo review note')).toHaveValue('TEST ONLY: keep my navigation draft.');
  await page.route('**/api/patients/DEMO-001',r=>r.fulfill({status:503,json:{}}));
  await expect(page.locator('.connection-warning')).toBeVisible({timeout:10000});
  await expect(workspace.getByRole('button',{name:/Score & save/})).toBeDisabled();
  await expect(workspace.getByRole('button',{name:'Mark reviewed',exact:true})).toBeDisabled();
  await expect(workspace.getByLabel('Local demo review note')).toHaveValue(/navigation draft/);
  await page.unroute('**/api/patients/DEMO-001');
  await page.getByRole('button',{name:'Retry connection',exact:true}).click();
  await expect(page.locator('.connection-warning')).toHaveCount(0);
  await workspace.getByRole('button',{name:/Score & save/}).click();
  await expect(workspace.locator('.score-action-panel')).toContainText('unavailable');
  await expect(workspace.locator('.score-reading')).toHaveText('—');
});

test('overview and evidence work without the API, with keyboard navigation',async({page})=>{
  await page.route('**/api/**',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('A little closer');
  const evidence=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Evidence',exact:true});
  await evidence.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{level:1})).toHaveText('What the prototype demonstrates');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Patient workspace'}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Patient data is unavailable');
  await expect(page.getByRole('button',{name:'Retry connection'})).toHaveCount(2);
});
