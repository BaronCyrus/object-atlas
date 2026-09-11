import { test, expect } from '@playwright/test';
async function ready(page){await page.goto('./');await expect(page.locator('#viewer')).toHaveAttribute('data-state','ready');}
const state=page=>page.evaluate(()=>window.atlasDiagnostics());

test('three distinct GLB exhibits load with four interactive regions and valid thumbnails',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 for(const [id,name,capacity] of [['g17','GLOCK 17','17 发'],['92fs','Beretta 92FS','15 发'],['1911','Colt 1911','7 发']]){
  await page.locator(`.exhibit-card[data-id="${id}"]`).click();await expect.poll(async()=>(await state(page)).model).toBe(id);
  await expect(page.locator('#viewer')).toHaveAttribute('data-state','ready');const s=await state(page);expect(s.groups.sort()).toEqual(['frame','grip','guard','upper']);expect(s.meshes).toBeGreaterThan(150);expect(s.meshes).toBeLessThan(220);
  await expect(page.locator('#exhibit-name')).toHaveText(name);await page.getByRole('tab',{name:'展品档案'}).click();await expect(page.locator('#facts')).toContainText(capacity);await expect(page.locator('#source')).toHaveAttribute('href',/^https:\/\//);await page.getByRole('tab',{name:'外观探索'}).click();
 }
 expect(await page.locator('.card-image').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>100))).toBe(true);expect(errors).toEqual([]);
});

test('model raycasting, highlighting, separated regions and reset work',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'侧面',exact:true}).click();
 // Click the upper surface near its annotation, away from the HTML button.
 const marker=await page.locator('.hotspot[data-region="upper"]').boundingBox();await page.mouse.click(marker.x+55,marker.y+12);
 await expect(page.locator('#region-name')).toHaveText('上部外壳');expect((await state(page)).highlighted).toBeGreaterThan(1);
 await page.locator('.region-button[data-region="grip"]').click();expect((await state(page)).active).toBe('grip');
 await page.locator('#explode').click();await expect.poll(async()=>(await state(page)).positions.upper[1]).toBeGreaterThan(.7);
 expect((await state(page)).positions.grip[2]).toBeGreaterThan(.4);
 await page.locator('#reset').click();await expect.poll(async()=>(await state(page)).positions.upper[1]).toBeLessThan(.02);expect((await state(page)).active).toBe(null);expect((await state(page)).highlighted).toBe(0);
});

test('drag, wheel, keyboard, presets and auto rotation move the camera',async({page})=>{
 await ready(page);const before=(await state(page)).camera;const box=await page.locator('canvas').boundingBox();
 await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.6+75,box.y+box.height*.6+10,{steps:8});await page.mouse.up();await page.waitForTimeout(200);expect((await state(page)).camera).not.toEqual(before);
 const dragged=(await state(page)).camera;await page.mouse.wheel(0,200);await page.waitForTimeout(200);expect((await state(page)).camera).not.toEqual(dragged);
 await page.locator('canvas').focus();const keyBefore=(await state(page)).camera;await page.keyboard.press('ArrowLeft');await page.waitForTimeout(200);expect((await state(page)).camera).not.toEqual(keyBefore);
 await page.locator('#auto-rotate').click();const rotating=(await state(page)).camera;await page.waitForTimeout(250);expect((await state(page)).camera).not.toEqual(rotating);
 await page.locator('#reset').click();await expect(page.locator('#auto-rotate')).toHaveAttribute('aria-pressed','false');
});

test('search, empty results, tab keyboard, and about dialog',async({page})=>{
 await ready(page);await page.getByRole('searchbox').fill('colt');await expect(page.locator('.exhibit-card:visible')).toHaveCount(1);await page.getByRole('searchbox').fill('不存在');await expect(page.locator('#no-results')).toBeVisible();await page.getByRole('searchbox').fill('');await expect(page.locator('.exhibit-card:visible')).toHaveCount(3);
 await page.locator('#tab-observe').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#panel-facts')).toBeVisible();await page.keyboard.press('ArrowLeft');await expect(page.locator('#panel-observe')).toBeVisible();
 await page.locator('#about-open').click();await expect(page.locator('dialog')).toBeVisible();await expect(page.locator('#all-sources a')).toHaveCount(3);await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
});

test('experiment changes velocity ratio and quiz gives corrective feedback across all three scenarios',async({page})=>{
 await ready(page);await page.locator('#mass').fill('4');await page.locator('#run-experiment').click();await expect(page.locator('#lab-result')).toContainText('B 车向右 0.5 m/s');await expect(page.locator('#lab-result')).toContainText('1/4');
 await page.locator('#mass').fill('1');await page.locator('#run-experiment').click();await expect(page.locator('#lab-result')).toContainText('质量相同');
 await page.locator('.quiz-option[data-option="1"]').click();await expect(page.locator('#quiz-feedback')).toContainText('更安全');await page.locator('#quiz-next').click();
 await page.locator('.quiz-option[data-option="1"]').click();await expect(page.locator('#quiz-feedback')).toContainText('答对了');await page.locator('#quiz-next').click();
 await page.locator('.quiz-option[data-option="2"]').click();await expect(page.locator('#quiz-next')).toContainText('完成啦');await page.locator('#quiz-next').click();await expect(page.locator('#quiz-number')).toHaveText('01 / 03');
});

test('missing speech support is explicit and text stays available',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{value:undefined}));await ready(page);await expect(page.locator('#speech-status')).toContainText('不支持语音');await expect(page.locator('#speak')).toBeDisabled();await page.locator('.region-button[data-region="upper"]').click();await expect(page.locator('#region-description')).not.toBeEmpty();
});

test('no Chinese voice is explicit',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],addEventListener(){},cancel(){},resume(){}}}));await ready(page);await expect(page.locator('#speech-status')).toContainText('未发现中文声音');await expect(page.locator('#speak')).toBeDisabled();
});

test('speech play, pause, resume, rate changes and switching exhibits cancel stale narration',async({page})=>{
 await page.addInitScript(()=>{
  window.speechCalls=[];Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-CN',name:'Test Chinese'}],addEventListener(){},speak(u){speechCalls.push(['speak',u.text,u.rate]);queueMicrotask(()=>u.onstart());},cancel(){speechCalls.push(['cancel']);},pause(){speechCalls.push(['pause']);},resume(){speechCalls.push(['resume']);}}});
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 });
 await ready(page);await page.locator('#speak').click();await expect(page.locator('#speech-status')).toContainText('正在朗读');await page.locator('#pause').click();await expect(page.locator('#pause')).toHaveText('继续');await page.locator('#pause').click();await expect(page.locator('#pause')).toHaveText('暂停');
 await page.locator('#speech-rate').selectOption('0.8');await expect(page.locator('#speech-status')).toContainText('语速已更新');await page.locator('#speak').click();expect(await page.evaluate(()=>speechCalls.filter(c=>c[0]==='speak').at(-1)[2])).toBe(.8);
 await page.locator('.exhibit-card[data-id="92fs"]').click();await expect(page.locator('#pause')).toBeDisabled();await expect(page.locator('#speech-status')).toContainText('已就绪');
});

test('model download errors are recoverable with retry',async({page})=>{
 let fail=true;await page.route('**/models/g17.glb',route=>fail?route.abort():route.continue());await page.goto('./');await expect(page.locator('#viewer')).toHaveAttribute('data-state','error');await expect(page.locator('#exhibit-name')).toHaveText('GLOCK 17');fail=false;await page.locator('#load-state').click();await expect(page.locator('#viewer')).toHaveAttribute('data-state','ready');
});

test('rapid exhibit switching displays only the last selection',async({page})=>{
 await ready(page);await page.locator('.exhibit-card[data-id="92fs"]').click();await page.locator('.exhibit-card[data-id="1911"]').click();await expect.poll(async()=>(await state(page)).model).toBe('1911');await expect(page.locator('#exhibit-name')).toHaveText('Colt 1911');
});

for(const width of [390,768])test(`responsive ${width}px: no overflow, exhibits and region controls remain usable`,async({page})=>{
 await page.setViewportSize({width,height:844});await ready(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.exhibit-card[data-id="1911"]').click();await expect.poll(async()=>(await state(page)).model).toBe('1911');await page.locator('.region-button[data-region="grip"]').click();await expect(page.locator('#region-name')).toHaveText('握把表面');
 await page.locator('#reset').click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`reports/mobile-${width}.png`,fullPage:true});
});
