import {test,expect} from '@playwright/test';

test('concise evidence works offline, disclosures and downloads work, roadmap deep link moves to Future lab',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>route.fulfill({status:503,json:{}}));
  await page.goto('/#evidence');
  const evidence=page.locator('[data-destination=evidence]');
  await expect(page.getByRole('heading',{level:1})).toHaveText('What the prototype demonstrates');
  await expect(evidence.locator('.evidence-errors')).toContainText('78');
  await expect(evidence.locator('.evidence-errors')).toContainText('76');
  await expect(evidence.locator('.evidence-takeaway')).toContainText('F1 does not beat');
  await expect(evidence.locator('.architecture-flow,.design-references,#validation-roadmap')).toHaveCount(0);
  await expect(evidence.locator('a[href="#workspace"]')).toHaveCount(1);
  const matrix=page.getByRole('table',{name:'Meal outcomes at threshold 0.50'});
  await expect(matrix).toHaveCount(0);
  await page.getByText('Full confusion matrix',{exact:true}).focus();await page.keyboard.press('Enter');
  await expect(matrix).toBeVisible();
  await expect(matrix.getByRole('cell')).toHaveText(['117','76','78','222']);
  await page.getByText('Full confusion matrix',{exact:true}).click();
  for(const theme of ['dark','light']) {
    if(theme==='light')await page.getByRole('button',{name:'Switch to light mode'}).click();
    for(const width of [1440,400]) {
      await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:`../../docs/screenshots/evidence_simple_${theme}_${width}.png`,fullPage:true});
    }
  }
  await page.getByText('About the 3D visuals',{exact:true}).click();
  await expect(evidence).toContainText('do not measure organ health');
  for(const [name,file] of [['Download the project model card','MODEL_CARD.md'],['Download technical and design notes','PROJECT_NOTES.md']]) {
    const download=page.waitForEvent('download');await page.getByRole('link',{name,exact:true}).click();expect((await download).suggestedFilename()).toBe(file);
    const response=await page.request.get('/research/'+file);expect(response.ok()).toBe(true);expect((await response.text()).length).toBeGreaterThan(500);
  }
  await page.goto('/#validation-roadmap');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  await expect(nav.getByRole('link',{name:'Future lab',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.locator('#validation-roadmap')).toHaveAttribute('open','');
  await expect(page.getByRole('link',{name:'Download the validation roadmap slide'})).toBeVisible();
  expect((await page.request.get('/research/glucotwin_validation_roadmap.pptx')).ok()).toBe(true);
  await page.goBack();await expect(nav.getByRole('link',{name:'Evidence',exact:true})).toHaveAttribute('aria-current','page');
  await page.goForward();await expect(page.locator('#validation-roadmap')).toBeVisible();
  expect(errors).toEqual([]);
});
