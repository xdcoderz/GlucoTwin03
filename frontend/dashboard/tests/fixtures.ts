import {test as base,expect} from '@playwright/test';
export {expect};
export type {Page} from '@playwright/test';

export const test=base.extend<{freshPreview:void}>({
  freshPreview:[async({request},use)=>{
    const reset=await request.post('http://127.0.0.1:18083/__test/reset');
    expect(reset.ok()).toBe(true);
    await use();
  },{auto:true}],
});
