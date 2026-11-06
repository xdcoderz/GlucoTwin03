import { chromium } from '../frontend/dashboard/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.env.GLUCO_UI_URL || 'http://127.0.0.1:5183';
const out = 'D:/3Nov/docs/screenshots';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});
const results=[];
try { for(const width of [1440,400]) {
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 await page.goto(base);
 await page.getByTestId('landing-experience').waitFor();
 await page.waitForFunction(()=>document.querySelector('[data-testid="landing-experience"]')?.getAttribute('data-scene-status')==='ready');
 await page.screenshot({path:`${out}/integrated_hero_viewport_${width}.png`});
 for(const selector of ['.landing-experience .editorial-container','.landing-experience .insight']) {
   await page.locator(selector).scrollIntoViewIfNeeded();
   await page.screenshot({path:`${out}/integrated_${selector.endsWith('insight')?'samples':'intro'}_viewport_${width}.png`});
 }
 results.push(await page.locator('.landing-experience').evaluate(root=>Array.from(root.querySelectorAll('.experience,.editorial-container,.organ-dossier-card,.insight,#tab-overview')).map(el=>({name:el.className||el.id,rect:el.getBoundingClientRect().toJSON(),display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity}))));
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Patient workspace',exact:true}).click();
 await page.getByLabel('Synthetic scenario').waitFor();
 await page.screenshot({path:`${out}/integrated_workspace_viewport_${width}.png`});
 const stage=page.locator('[data-destination=workspace]').getByTestId('anatomy-stage');
 await page.waitForFunction(()=>document.querySelector('[data-destination=workspace] [data-testid=anatomy-stage]')?.getAttribute('data-status')==='ready');
 await stage.scrollIntoViewIfNeeded();
 await page.screenshot({path:`${out}/integrated_workspace_body_viewport_${width}.png`});
 await page.close();
} } finally { await browser.close(); }
fs.writeFileSync('D:/3Nov/tmp/integrated-ui-layout.json',JSON.stringify(results,null,2));
console.log('Captured desktop/mobile hero, content, telemetry, workspace and model.');
