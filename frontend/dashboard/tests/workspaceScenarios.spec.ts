import {test,expect} from '@playwright/test';
import {sampleGlow} from '../src/anatomy/visualStates';

test('body glow withholds invalid samples and distinguishes concerning, improving and neutral trends',()=>{
  for(const value of [null,NaN,Infinity,-1,0])expect(sampleGlow(value,0).tone).toBe('unavailable');
  for(const value of [69,180,250])expect(sampleGlow(value,0).tone).toBe('attention');
  for(const value of [70,112,179])expect(sampleGlow(value,.2).tone).toBe('steady');
  expect(sampleGlow(112,-1).tone).toBe('steady');expect(sampleGlow(112,null).tone).toBe('neutral');
  expect(sampleGlow(95,-1).tone).toBe('attention');expect(sampleGlow(155,1).tone).toBe('attention');
  expect(sampleGlow(90,1).tone).toBe('steady');expect(sampleGlow(125,1).tone).toBe('neutral');
  expect(sampleGlow(112,null).color).toBe('#629cf5');
});

test('workspace scenarios drive twin and countdown without changing recorded inputs, scores or journals',async({page,request})=>{
  const journalUrl='http://127.0.0.1:18083/api/patients/DEMO-001/journal';
  const before=await (await request.get(journalUrl)).json();
  const posts:string[]=[],errors:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#workspace');
  const ws=page.locator('[data-destination=workspace]'),demo=ws.locator('.workspace-scenarios');
  await expect(ws.locator('.workspace-history-content [data-testid=twin-glucose]')).not.toContainText('—');
  const recordedValue=await ws.locator('.workspace-history-content [data-testid=twin-glucose]').innerText();
  const score=await ws.locator('.score-reading').innerText();
  await demo.locator(':scope > summary').click();
  const stage=demo.getByTestId('anatomy-stage');await expect(stage).toHaveAttribute('data-status','ready');
  const scenarios=demo.getByLabel('Fictional glucose story');await expect(scenarios.locator('option')).toHaveCount(5);
  for(const [scenario,index,tone] of [['rise','4','steady'],['surge','4','attention'],['dip','4','attention'],['artifact','3','attention']]) {
    await scenarios.selectOption(scenario);await demo.getByLabel('3D sample',{exact:true}).fill(index);await expect(stage).toHaveAttribute('data-body-tone',tone);
  }
  await scenarios.selectOption('countdown');
  await expect(stage).toHaveAttribute('data-glucose','112');await expect(stage).toHaveAttribute('data-body-tone','steady');
  await expect(stage).toHaveAttribute('data-organ-palette','natural');await expect(stage).toHaveAttribute('data-body-framing','neck-to-knees');
  await expect(demo.getByTestId('projection-clock')).toHaveText('42:00');
  await demo.getByRole('button',{name:'Run projection clock'}).click();
  await expect(demo.getByRole('button',{name:'Pause projection clock'})).toBeVisible();
  await demo.getByRole('button',{name:'Pause projection clock'}).click();
  await demo.getByRole('button',{name:'Reset projection clock'}).click();await expect(demo.getByTestId('projection-clock')).toHaveText('42:00');
  await stage.screenshot({path:'../../docs/screenshots/workspace_scenario_twin.png'});
  await demo.screenshot({path:'../../docs/screenshots/workspace_scenario_countdown.png'});
  await demo.getByLabel('3D sample',{exact:true}).fill('5');await expect(stage).toHaveAttribute('data-glucose','67');await expect(stage).toHaveAttribute('data-body-tone','attention');
  await expect(demo.getByTestId('projection-clock')).toHaveCount(0);
  await demo.getByRole('checkbox',{name:'Show glucose overlay'}).uncheck();await expect(stage).toHaveAttribute('data-body-tone','off');
  await expect(ws.locator('.workspace-history-content [data-testid=twin-glucose]')).toHaveText(recordedValue);await expect(ws.locator('.score-reading')).toHaveText(score);
  await page.setViewportSize({width:400,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Future lab',exact:true}).click();
  await expect(page.locator('[data-destination=future]').getByTestId('anatomy-stage')).toHaveAttribute('data-status','ready');
  expect(await page.evaluate(()=>{const ids=[...document.querySelectorAll('input[id],h2[id],h3[id]')].map(el=>el.id);return ids.filter((id,index)=>ids.indexOf(id)!==index);})).toEqual([]);
  expect(await (await request.get(journalUrl)).json()).toEqual(before);expect(posts).toEqual([]);expect(errors).toEqual([]);
});

test('landing body aura responds while natural organs and neck-to-knees framing stay fixed',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const hero=page.getByTestId('landing-experience');await expect(hero).toHaveAttribute('data-scene-status','ready');
  await expect(hero).toHaveAttribute('data-body-tone','steady');
  await expect(hero).toHaveAttribute('data-organ-palette','natural');await expect(hero).toHaveAttribute('data-body-framing','neck-to-knees');
  await hero.getByRole('button',{name:'Scripted curve',exact:true}).click();
  await hero.getByRole('slider',{name:'Select sample reading'}).fill('4');await expect(hero).toHaveAttribute('data-body-tone','attention');
  await hero.getByTestId('landing-stage').screenshot({path:'../../docs/screenshots/landing_organ_tint_red.png'});
  await hero.getByRole('button',{name:'Fictional day',exact:true}).click();
  await hero.getByRole('slider',{name:'Select sample reading'}).fill('0');await expect(hero).toHaveAttribute('data-body-tone','neutral');
  await hero.getByRole('slider',{name:'Select sample reading'}).fill('8');await expect(hero).toHaveAttribute('data-body-tone','steady');
  await hero.getByTestId('landing-stage').screenshot({path:'../../docs/screenshots/landing_organ_tint_green.png'});
  await hero.getByRole('slider',{name:'Select sample reading'}).fill('5');await expect(hero).toHaveAttribute('data-body-tone','off');
  await expect(hero.locator('#body-glow-label')).toContainText('No valid sample');
});
