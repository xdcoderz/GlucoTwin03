import { test, expect } from './fixtures';

test('dark default, saved theme choice, all destinations and phone layouts', async ({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  for(const theme of ['dark','light']) {
    if(theme==='light') await page.getByRole('button',{name:'Switch to light mode'}).click();
    await nav.getByRole('link',{name:'Overview',exact:true}).click();
    await expect(page.getByTestId('landing-experience')).toHaveAttribute('data-scene-status','ready',{timeout:20000});
    const contrasts=await page.evaluate(()=>{
      const luminance=(rgb:number[])=>rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      return ['.landing-intro-copy > p','.landing-workspace-cta','.sample-note'].map(selector=>{
        const el=document.querySelector(selector)!;const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d')!;
        const ancestors:Element[]=[];let p:Element|null=el;while(p){ancestors.unshift(p);p=p.parentElement;}
        for(const item of ancestors){c.fillStyle=getComputedStyle(item).backgroundColor;c.fillRect(0,0,1,1);}
        const bg=luminance([...c.getImageData(0,0,1,1).data]);
        c.clearRect(0,0,1,1);c.fillStyle=getComputedStyle(el).color;c.fillRect(0,0,1,1);
        const fg=luminance([...c.getImageData(0,0,1,1).data]);
        return {selector,ratio:(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)};
      });
    });
    for(const result of contrasts)expect(result.ratio,theme+' '+result.selector).toBeGreaterThanOrEqual(4.5);
    await test.info().attach(theme+'-contrast',{body:JSON.stringify(contrasts),contentType:'application/json'});
    for(const [label,id] of [['Overview','overview'],['Patient workspace','workspace'],['Evidence','evidence'],['Future lab','future']]) {
      await nav.getByRole('link',{name:label,exact:true}).click();
      if(id==='overview')await expect(page.getByTestId('landing-experience')).toHaveAttribute('data-scene-status','ready',{timeout:20000});
      if(id==='workspace')await expect(page.getByLabel('Synthetic scenario')).toBeVisible();
      if(id==='future')await expect(page.locator('[data-destination=future]').getByTestId('anatomy-stage')).toHaveAttribute('data-status','ready',{timeout:20000});
      for(const width of [1440,400]) {
        await page.setViewportSize({width,height:1000});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      }
      await page.setViewportSize({width:1440,height:1000});
    }
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(errors).toEqual([]);
});

test('rotation pauses for interaction, organ focus and reduced motion',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/');
  const hero=page.getByTestId('landing-experience');
  await expect(hero).toHaveAttribute('data-scene-status','ready',{timeout:20000});
  if(await hero.getAttribute('data-graphics-quality')==='reduced') {
    await expect(hero.getByRole('button',{name:'Auto-rotate model',exact:true})).toHaveAttribute('aria-pressed','false');
    await hero.getByRole('button',{name:'Auto-rotate model',exact:true}).click();
  }
  await page.mouse.move(0,0);
  await expect(hero).toHaveAttribute('data-rotation-state','running');
  await hero.locator('.landing-stage').hover();
  await expect(hero).toHaveAttribute('data-rotation-state','paused');
  await page.mouse.move(0,0);
  await expect(hero).toHaveAttribute('data-rotation-state','running');
  await hero.getByRole('button',{name:'Auto-rotate model',exact:true}).click();
  await expect(hero).toHaveAttribute('data-rotation-state','paused');
  await hero.getByRole('button',{name:'Rotate model right'}).click();
  await hero.getByRole('button',{name:'Rotate model left'}).click();
  await hero.locator('[data-organ=pancreas]').click();
  await expect(hero).toHaveAttribute('data-focus-state','ready');
  await expect(hero.getByRole('button',{name:'Auto-rotate model',exact:true})).toBeDisabled();
  await expect(hero.locator('#organ-info-title')).toHaveText('Pancreas');
  await hero.locator('#back-to-body').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(hero.getByRole('button',{name:'Auto-rotate model',exact:true})).toBeDisabled();
  await expect(hero).toHaveAttribute('data-rotation-state','paused');
  await hero.getByRole('button',{name:'Rotate model right'}).focus();
  await page.keyboard.press('Enter');
  await expect(hero.locator('#scene canvas')).toBeVisible();
});
