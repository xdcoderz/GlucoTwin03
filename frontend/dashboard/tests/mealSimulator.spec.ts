import {test,expect} from '@playwright/test';

test('custom meal fields reach the API and saved simulations survive reload without replacing recorded meals',async({page,request})=>{
  const before=await (await request.get('http://127.0.0.1:18083/api/patients/DEMO-001/journal')).json();
  const bodies:Record<string,unknown>[]=[];
  page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/meal-simulations'))bodies.push(r.postDataJSON());});
  await page.goto('/#workspace');
  const meal=page.locator('#meal-context');
  await expect(meal.getByRole('button',{name:'Simulate this meal'})).toBeEnabled();
  await meal.getByLabel('Meal description',{exact:true}).fill('2 rotis with dal and a cup of curd');
  await expect(meal.getByRole('button',{name:'Bread / roti',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(meal.getByRole('button',{name:'Dairy',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(meal.getByRole('button',{name:'Meat / eggs / fish',exact:true})).toHaveAttribute('aria-pressed','false');
  await meal.getByLabel('Total portion (g)',{exact:true}).fill('250');
  await meal.getByLabel('Minutes since previous meal',{exact:true}).fill('180');
  await meal.getByRole('button',{name:'Simulate this meal'}).click();
  await expect(meal.getByTestId('meal-simulation-score')).toHaveText('—');
  await expect(meal.locator('.meal-result')).toContainText('No estimate was substituted');
  expect(bodies).toEqual([{description:'2 rotis with dal and a cup of curd',categories:['bread','dairy'],portionGrams:250,minutesSincePreviousMeal:180}]);
  await page.reload();await meal.locator('.meal-simulation-history > summary').click();
  await meal.locator('.meal-simulation-history li button').filter({hasText:'2 rotis with dal'}).first().click();
  await expect(meal.getByLabel('Meal description',{exact:true})).toHaveValue('2 rotis with dal and a cup of curd');
  await expect(meal.getByLabel('Total portion (g)',{exact:true})).toHaveValue('250');
  expect(await (await request.get('http://127.0.0.1:18083/api/patients/DEMO-001/journal')).json()).toEqual(before);
  await page.getByLabel('Synthetic scenario').selectOption('DEMO-002');
  await expect(meal.getByLabel('Meal description',{exact:true})).not.toHaveValue('2 rotis with dal and a cup of curd');
  await expect(meal.getByTestId('meal-simulation-score')).toHaveCount(0);
});

test('returned meal scores drive a separate labeled twin and edits clear stale output',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  // Explicit UI test fixture only. Production inference is verified on Docker separately.
  await page.route('**/api/patients/DEMO-001/meal-simulations',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    const input=route.request().postDataJSON(),score=input.portionGrams>=300?.72:.21;
    await route.fulfill({json:{simulationId:crypto.randomUUID(),patientId:'DEMO-001',mode:'meal_what_if',createdAt:new Date().toISOString(),baselineAt:'2026-10-30T12:00:00Z',inputHash:'explicit-ui-test-fixture',meal:{...input,selectedFoodCategories:input.categories},features:{reported_food_weight_g:input.portionGrams},prediction:{status:'available',model_score:score,threshold:.5,predicted_event:score>=.5,horizon_minutes:120,model_version:'UI-TEST-FIXTURE',top_factors:[{feature:'reported_food_weight_g',contribution:.1,direction:'up'}]},note:'UI test only'}});
  });
  await page.goto('/#workspace');const meal=page.locator('#meal-context');
  await expect(meal.getByRole('button',{name:'Simulate this meal'})).toBeEnabled();
  await meal.getByLabel('Total portion (g)',{exact:true}).fill('350');
  await meal.getByRole('button',{name:'Simulate this meal'}).click();
  await expect(meal.getByTestId('meal-simulation-score')).toHaveText('0.720');
  const stage=meal.getByTestId('anatomy-stage');await expect(stage).toHaveAttribute('data-status','ready',{timeout:15000});
  await expect(stage).toHaveAttribute('data-body-tone','attention');await expect(stage).toHaveAttribute('data-organ-palette','natural');
  await expect(meal.locator('.twin-signal-key')).toContainText('MEAL WHAT-IF SCORE CONTEXT');
  await expect(meal.locator('.body-glow-legend')).toContainText('Blue does not establish a safe meal');
  await meal.getByLabel('Total portion (g)',{exact:true}).fill('150');
  await expect(stage).toHaveCount(0);await expect(meal.getByTestId('meal-simulation-score')).toHaveCount(0);
  await meal.getByRole('button',{name:'Simulate this meal'}).click();
  await expect(meal.getByTestId('meal-simulation-score')).toHaveText('0.210');await expect(stage).toHaveAttribute('data-body-tone','neutral');
  await page.setViewportSize({width:400,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await meal.locator('.meal-form-grid').screenshot({path:'../../docs/screenshots/meal_form_mobile.png'});
  await meal.getByRole('button',{name:'Hide meal simulation twin'}).click();expect(errors).toEqual([]);
});

test('invalid or empty meals cannot be submitted and inference errors do not fabricate scores',async({page})=>{
  let posts=0;
  await page.route('**/api/patients/DEMO-001/meal-simulations',async route=>{
    if(route.request().method()!=='POST')return route.continue();posts++;
    await route.fulfill({status:503,json:{error:'Model connection failed. Retry after checking the service.'}});
  });
  await page.goto('/#workspace');const meal=page.locator('#meal-context');
  const button=meal.getByRole('button',{name:'Simulate this meal'});await expect(button).toBeEnabled();
  await meal.getByLabel('Meal description',{exact:true}).fill('');await button.click();expect(posts).toBe(0);
  await meal.getByLabel('Meal description',{exact:true}).fill('A custom meal');
  await meal.getByLabel('Total portion (g)',{exact:true}).fill('0');await button.click();expect(posts).toBe(0);
  await meal.getByLabel('Total portion (g)',{exact:true}).fill('200');await button.click();
  await expect(meal.getByRole('alert')).toContainText('Model connection failed');await expect(meal.getByTestId('meal-simulation-score')).toHaveCount(0);
});
