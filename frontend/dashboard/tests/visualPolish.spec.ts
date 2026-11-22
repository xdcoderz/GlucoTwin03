import {test,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const shot=(name:string)=>fileURLToPath(new URL(`../../../docs/screenshots/${name}.png`,import.meta.url));
test('visual finish across destinations and mobile',async({page})=>{
 test.setTimeout(120000);
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1440,400]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['overview','workspace','evidence','future']){
   await page.goto(`/?patient=DEMO-001#${route}`);
   await expect(page.locator(`[data-destination=${route}]`)).toBeVisible();
   if(route==='overview')await expect(page.locator('.landing-experience canvas')).toBeVisible({timeout:25000});
   if(route==='workspace')await expect(page.locator('#patient-record')).toBeVisible();
   if(route==='future')await expect(page.getByText('Preparing the 3D patient')).toBeHidden({timeout:25000});
   await page.screenshot({path:shot(`premium-${route}-${width}`),fullPage:true});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }
});

test('light theme, keyboard focus, anatomy selection and restrained motion',async({page},testInfo)=>{
 test.setTimeout(120000);
 await page.goto('/#overview');
 await expect(page.locator('.landing-experience canvas')).toBeVisible({timeout:25000});
 const button=page.locator('.organ-list [data-organ=pancreas]');
 await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#organ-info-bar')).toBeVisible();
 await expect(page.locator('#organ-info-title')).toContainText('Pancreas');
 await page.locator('#back-to-body').click();
 await expect(page.locator('#organ-info-bar')).toBeHidden();
 const cta=page.locator('.landing-workspace-cta');
 await expect(cta).toHaveCSS('transition-duration','0.16s, 0.16s, 0.16s, 0.16s');
 await cta.hover();
 await page.evaluate(()=>document.getAnimations().filter(a=>a.effect instanceof KeyframeEffect&&a.effect.target instanceof Element&&a.effect.target.matches('.landing-workspace-cta')).forEach(a=>a.playbackRate=.1));
 await page.screenshot({path:shot('premium-hover'),fullPage:false});
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(cta).toHaveCSS('transition-duration','0s');
 await page.goto('/#overview');
 for(let i=0;i<40;i++){
  await page.keyboard.press('Shift+Tab');
  if(await page.locator('.brand').evaluate(el=>el===document.activeElement))break;
 }
 await expect(page.locator('.brand')).toBeFocused();
 await expect(page.locator('.brand')).toHaveCSS('outline-style','solid');
 await page.screenshot({path:shot('premium-keyboard'),fullPage:false});
 const contrasts=[];
 for(const theme of ['dark','light']){
  if(theme==='light')await page.getByRole('button',{name:'Switch to light mode'}).click();
  const contrast=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;
   const rgb=(color:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3);};
   const luminance=(c:number[])=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const color=(s:string)=>getComputedStyle(document.querySelector(s)!);
   const background=color('body').backgroundColor;
   return ['.landing-intro-copy>p','.landing-kicker','.landing-workspace-cta'].map(selector=>{
    const style=color(selector),fg=luminance(rgb(style.color)),bg=luminance(rgb(selector.includes('cta')?style.backgroundColor:background));
    return {selector,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
   });
  });
  contrasts.push({theme,contrast});for(const row of contrast)expect(row.ratio).toBeGreaterThanOrEqual(4.5);
 }
 for(const width of [1440,400]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['overview','workspace','evidence','future']){
   await page.goto(`/#${route}`);
   if(route==='overview')await expect(page.locator('.landing-experience canvas')).toBeVisible();
   if(route==='workspace')await expect(page.locator('#patient-record')).toBeVisible();
   if(route==='future')await expect(page.getByText('Preparing the 3D patient')).toBeHidden({timeout:25000});
   await page.screenshot({path:shot(`premium-light-${route}-${width}`),fullPage:true});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }
 await testInfo.attach('contrast',{body:JSON.stringify(contrasts,null,2),contentType:'application/json'});
});
