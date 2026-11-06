import { openPatientTwin, openDisclosure } from './workspaceSupport';
import { test, expect } from '@playwright/test';
import { inspectPattern, projectTo70, formatProjectionClock } from '../src/anatomy/visualResearch';
import { mockTimeline, glucoseSignal, type TwinPoint } from '../src/anatomy/twinSignals';
const point=(minutes:number,glucose:number):TwinPoint=>({minutes,glucose,observedAt:new Date(Date.UTC(2026,9,30,12,minutes)).toISOString()});

test('projection arithmetic uses sample minutes and only the selected past',()=>{
 const points=[point(0,142),point(15,127),point(30,112),point(45,500)];
 expect(projectTo70(points,2)).toMatchObject({status:'projected',minutes:42,rate:-1,glucose:112});
 expect(projectTo70([...points.slice(0,3),point(45,40)],2).minutes).toBe(42);
 expect(projectTo70([point(0,130),point(10,110)],1).minutes).toBe(20);
 expect(formatProjectionClock(42*60)).toBe('42:00');
 expect(formatProjectionClock(-1)).toBe('00:00');
});

test('projection is withheld for invalid, flat, rising, gapped and beyond-horizon inputs',()=>{
 expect(projectTo70([point(0,112)],0).status).toBe('insufficient');
 for(const values of [[112,112],[112,120]])expect(projectTo70(values.map((v,i)=>point(i*15,v)),1).status).toBe('not_falling');
 expect(projectTo70([point(0,75),point(15,65)],1).status).toBe('already_below');
 expect(projectTo70([point(0,112),point(30,100)],1).status).toBe('flagged');
 expect(projectTo70([point(0,200),point(15,199)],1).status).toBe('beyond');
 expect(projectTo70([point(0,112),point(0,100)],1).status).toBe('flagged');
 expect(projectTo70([point(0,112),point(15,NaN)],1).status).toBe('flagged');
});

test('unusual-reading flags never assert a sensor fault and use no future samples',()=>{
 const curve=mockTimeline(142,'2026-10-30T12:00:00Z','artifact');
 expect(inspectPattern(curve,2).kind).toBe('none');
 expect(inspectPattern(curve,3).kind).toBe('rapid');
 expect(inspectPattern(curve,4).kind).toBe('reversal');
 expect(projectTo70(curve,4).status).toBe('flagged');
 expect(inspectPattern(curve,4).detail).toContain('cannot distinguish');
 expect(glucoseSignal(65,false).color).toBe('#ef646e');
 expect(glucoseSignal(190,false).color).toBe('#ef646e');
});

test('falling demo clock pauses, resets and stays separate from saved results',async({page})=>{
 const posts:string[]=[];const errors:string[]=[];
 page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#future');
 const future=page.locator('[data-destination=future]');
 await future.getByLabel('Fictional glucose story').selectOption('countdown');
 const panel=future.getByTestId('projection-panel');
 await expect(panel).toHaveAttribute('data-state','projected');
 await expect(panel.getByTestId('projection-clock')).toHaveText('42:00');
 await expect(future.getByTestId('twin-glucose')).toContainText('112');
 await page.clock.install();
 await panel.getByRole('button',{name:'Run projection clock',exact:true}).click();
 await page.clock.runFor(2000);
 await expect(panel.getByTestId('projection-clock')).not.toHaveText('42:00');
 await panel.getByRole('button',{name:'Pause projection clock'}).click();
 const paused=await panel.getByTestId('projection-clock').innerText();
 await page.clock.runFor(4000);
 await expect(panel.getByTestId('projection-clock')).toHaveText(paused);
 await expect(future.getByTestId('twin-glucose')).toContainText('112');
 await panel.getByRole('button',{name:'Reset projection clock'}).click();
 await expect(panel.getByTestId('projection-clock')).toHaveText('42:00');
 await future.getByLabel('Fictional glucose story').selectOption('artifact');
 await expect(future.getByTestId('pattern-panel')).toHaveAttribute('data-kind','rapid');
 await expect(panel).toHaveAttribute('data-state','flagged');
 await expect(panel.getByTestId('projection-clock')).toHaveCount(0);
 await future.getByLabel('3D sample',{exact:true}).fill('4');
 await expect(future.getByTestId('pattern-panel')).toHaveAttribute('data-kind','reversal');
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Patient workspace',exact:true}).click();
 await expect(page.locator('[data-destination=workspace]').getByTestId('projection-panel')).toHaveCount(0);
 await expect(page.locator('[data-destination=workspace] .score-reading')).toHaveText('—');
 expect(posts).toEqual([]);expect(errors).toEqual([]);
});

test('score and medication markers are independent of glucose and fictional playback',async({page,request})=>{
 const data=await (await request.get('http://127.0.0.1:18083/api/patients/DEMO-001')).json();
 data.prediction={...data.prediction,status:'available',model_score:.8,threshold:.5,predicted_event:true,model_version:'TEST-VISUAL-NOT-INFERENCE'};
 await page.route('**/api/patients/DEMO-001',route=>route.fulfill({json:data}));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#workspace');
  await openPatientTwin(page);
 const workspace=page.locator('[data-destination=workspace]');const stage=workspace.getByTestId('anatomy-stage');
 await expect(stage).toHaveAttribute('data-status','ready',{timeout:15000});
 await expect(stage).toHaveAttribute('data-score-context','0.8');
 await workspace.getByRole('checkbox',{name:'Highlight medication context'}).check();
 await expect(stage).toHaveAttribute('data-medication-context','shown');
 await expect(stage).toHaveAttribute('data-glucose','142');
 await stage.screenshot({path:'../../docs/screenshots/visual_twin_context_desktop.png'});
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Future lab',exact:true}).click();
 const future=page.locator('[data-destination=future]');
 await future.getByLabel('Fictional glucose story').selectOption('countdown');
 await expect(future.getByTestId('anatomy-stage')).toHaveAttribute('data-score-context','0.8');
 await expect(future.getByTestId('anatomy-stage')).toHaveAttribute('data-glucose','112');
 await future.getByTestId('projection-panel').screenshot({path:'../../docs/screenshots/visual_twin_projection_desktop.png'});
 await page.setViewportSize({width:400,height:860});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await future.getByTestId('projection-panel').screenshot({path:'../../docs/screenshots/visual_twin_projection_mobile.png'});
});
