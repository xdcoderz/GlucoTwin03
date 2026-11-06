import {chromium} from '../frontend/dashboard/node_modules/playwright/index.mjs';
import {strict as assert} from 'node:assert';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000/#workspace');
 await page.locator('#meal-simulator-title').waitFor();
 for(const width of [1440,400]) {
  await page.setViewportSize({width,height:1000});
  for(const [name,id] of [['Overview','overview'],['Patient workspace','workspace'],['Evidence','evidence'],['Future lab','future']]) {
   await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name,exact:true}).click();
   await page.waitForTimeout(300);
   assert(await page.locator(`[data-destination=${id}]`).isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} at ${width} overflows`);
   await page.screenshot({path:`D:/3Nov/docs/screenshots/polish_${id}_${width}.png`});
  }
 }
 await page.getByRole('button',{name:'Switch to light mode'}).click();
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Patient workspace',exact:true}).click();
 await page.screenshot({path:'D:/3Nov/docs/screenshots/polish_workspace_light.png'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Evidence',exact:true}).click();
 await page.evaluate(()=>document.getAnimations().filter(a=>a.animationName==='destination-appear').forEach(a=>a.playbackRate=.1));
 await page.waitForTimeout(400);
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Patient workspace',exact:true}).click();
 await page.waitForTimeout(350);
 assert.equal(await page.locator('[data-destination=workspace]').evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('[data-destination=workspace]').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS: four pages, desktop/mobile, light/dark, interrupted page fade and reduced motion; no page errors.');
} finally {await browser.close();}
