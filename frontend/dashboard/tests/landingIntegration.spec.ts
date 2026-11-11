import { openPatientTwin } from './workspaceSupport';
import { test, expect } from './fixtures';

test('organ list, node zoom, contextual information and isolated samples', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; const writes: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST') writes.push(request.url()); });
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto('/');
  const hero = page.getByTestId('landing-experience');
  await expect(hero).toHaveAttribute('data-scene-status','ready',{timeout:20000});
  const intro=page.getByTestId('landing-introduction');
  await expect(intro.getByRole('heading',{level:1})).toContainText('A little closer');
  await expect(page.locator('.safety-banner')).toHaveCount(0);
  const boxes=await page.evaluate(()=>Object.fromEntries(['.site-topbar','.landing-introduction','.anatomy-workbench','.landing-model-column','.editorial-container','.insight'].map(selector=>[selector,document.querySelector(selector)!.getBoundingClientRect().toJSON()])));
  expect(boxes['.landing-introduction'].top).toBeGreaterThanOrEqual(boxes['.site-topbar'].bottom-1);
  expect(boxes['.anatomy-workbench'].top).toBeGreaterThanOrEqual(boxes['.landing-introduction'].bottom-1);
  expect(boxes['.landing-model-column'].width/(boxes['.landing-model-column'].width+boxes['.editorial-container'].width)).toBeCloseTo(.7,2);
  expect(boxes['.insight'].top).toBeGreaterThanOrEqual(boxes['.anatomy-workbench'].bottom);
  await expect(hero.locator('.editorial-container button')).toHaveText(['Pancreas','Liver','Digestive Tract','Skeletal Muscle','Adipose Tissue']);
  await expect(hero.locator('.dossier-tabs,.dossier-header,.dossier-actions')).toHaveCount(0);
  await expect(hero.locator('#organ-info-bar')).not.toBeVisible();
  await expect(hero.locator('#back-to-body')).not.toBeVisible();
  await expect(hero.locator('.scene-tools #opacity')).toBeVisible();
  await expect(hero.locator('.scene-tools #zoom-in')).toBeVisible();
  await expect(hero.locator('.spatial-hotspot:visible')).toHaveCount(5);
  await expect(hero.locator('.hotspot-pill:visible')).toHaveCount(0);
  const marker=hero.locator('[data-organ-hotspot=pancreas]');
  await marker.hover();
  await expect(marker.getByRole('tooltip')).toBeVisible();
  await page.mouse.move(0,0);
  await expect(marker.getByRole('tooltip')).not.toBeVisible();
  for (const [id,name] of [['pancreas','Pancreas'],['liver','Liver'],['gut','Digestive Tract'],['muscle','Skeletal Muscle'],['fat','Adipose Tissue']]) {
    await hero.locator(`[data-organ-hotspot=${id}]`).click();
    await expect(hero).toHaveAttribute('data-focused-organ',id);
    await expect(hero).toHaveAttribute('data-focus-state','ready');
    await expect(hero.locator('.spatial-hotspot:visible')).toHaveCount(0);
    await expect(hero.locator('#organ-info-bar')).toBeVisible();
    await expect(hero.locator('#organ-info-title')).toHaveText(name);
    await expect(hero.locator(`[data-organ=${id}]`)).toHaveAttribute('aria-pressed','true');
    for(const selector of ['#organ-info-glucose','#organ-info-diabetes','#organ-info-project']) expect((await hero.locator(selector).innerText()).length).toBeGreaterThan(30);
    await expect(hero.locator('#organ-info-source')).toHaveAttribute('href',/^https:\/\/www\.niddk\.nih\.gov\//);
    await hero.locator('#back-to-body').click();
    await expect(hero).toHaveAttribute('data-focused-organ','body');
    await expect(hero.locator('#organ-info-bar')).not.toBeVisible();
    await expect(hero.locator('.spatial-hotspot:visible')).toHaveCount(5);
  }
  await marker.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  await expect(marker.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(hero).toHaveAttribute('data-focus-state','ready');
  await expect(hero.locator('#organ-info-title')).toHaveText('Pancreas');
  await page.keyboard.press('Escape');
  await expect(hero).toHaveAttribute('data-focused-organ','body');
  await hero.locator('[data-organ=liver]').click();
  await expect(hero.locator('#organ-info-title')).toHaveText('Liver');
  await hero.locator('#reset-camera').click();
  await expect(hero.locator('#organ-info-bar')).not.toBeVisible();
  await expect(intro.getByRole('heading',{level:1})).toContainText('A little closer');
  await hero.getByRole('slider',{name:'Select sample reading'}).fill('5');
  await expect(hero.locator('#glucose-value')).toHaveText('—');
  await hero.getByRole('button',{name:'Scripted curve',exact:true}).click();
  await expect(hero.locator('#glucose-value')).toHaveText('164');
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test('organ information waits for zoom and rapid selection keeps the latest organ', async ({page})=>{
  test.setTimeout(75000);
  await page.goto('/');
  const hero=page.getByTestId('landing-experience');
  await expect(hero).toHaveAttribute('data-scene-status','ready',{timeout:20000});
  await hero.locator('[data-organ-hotspot=pancreas]').click();
  if(await hero.getAttribute('data-graphics-quality')==='reduced') {
    await expect(hero).toHaveAttribute('data-focus-state','ready');
  } else {
    await expect(hero).toHaveAttribute('data-focus-state','moving');
    await expect(hero.locator('#organ-info-bar')).not.toBeVisible();
  }
  await hero.locator('[data-organ=liver]').click();
  await hero.locator('[data-organ=gut]').click();
  await expect(hero).toHaveAttribute('data-focused-organ','gut');
  await expect(hero).toHaveAttribute('data-focus-state','ready');
  await expect(hero.locator('#organ-info-title')).toHaveText('Digestive Tract');
  await expect(hero.locator('#organ-info-bar')).toBeVisible();
  await hero.locator('#back-to-body').click();
  await expect(hero).toHaveAttribute('data-focus-state','body');
  await expect(hero.locator('#organ-info-bar')).not.toBeVisible();
});

test('landing remount, mobile navigation and failure preserve application access', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  for (let i=0;i<3;i++) {
    await expect(page.getByTestId('landing-experience')).toHaveAttribute('data-scene-status','ready',{timeout:20000});
    await nav.getByRole('link',{name:'Evidence',exact:true}).click();
    await expect(page.getByTestId('landing-experience')).toHaveCount(0);
    await nav.getByRole('link',{name:'Overview',exact:true}).click();
  }
  for (const width of [1024,768,400,360]) {
    await page.setViewportSize({width,height:900});
    await expect(page.getByTestId('landing-experience')).toHaveAttribute('data-scene-status','ready',{timeout:20000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const model=await heroModelBox();
    const information=await page.locator('.editorial-container').boundingBox();
    if(width<=900) expect(information!.y).toBeGreaterThanOrEqual(model!.y+model!.height-1);
    else expect(model!.width/(model!.width+information!.width)).toBeCloseTo(.7,2);
    await page.locator('[data-organ=gut]').click();
    await expect(page.locator('#organ-info-bar')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#back-to-body').click();
  }
  await page.getByTestId('landing-introduction').getByRole('link',{name:/Open patient workspace/}).click();
  await expect(page.getByLabel('Synthetic scenario')).toBeVisible();
  await openPatientTwin(page);
  await expect(page.locator('[data-destination=workspace]').getByTestId('anatomy-stage')).toHaveAttribute('data-status','ready',{timeout:20000});
  expect(errors).toEqual([]);
  async function heroModelBox(){return page.locator('.landing-model-column').boundingBox();}
});

test('failed landing mesh leaves workspace and evidence available', async ({ page }) => {
  test.setTimeout(75000);
  const errors:string[]=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.route('**/models/glucotwin_anatomy.glb', route=>route.abort());
  await page.goto('/');
  const hero=page.getByTestId('landing-experience');
  await expect(hero).toHaveAttribute('data-scene-status','error',{timeout:20000});
  await expect(hero.getByRole('button',{name:'Restore Scene'})).toBeVisible();
  await page.unroute('**/models/glucotwin_anatomy.glb');
  await hero.getByRole('button',{name:'Restore Scene'}).click();
  await expect(hero).toHaveAttribute('data-scene-status','ready',{timeout:20000});
  await page.getByTestId('landing-introduction').getByRole('link',{name:/Model evidence/}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('What the prototype demonstrates');
  expect(errors).toEqual([]);
});
