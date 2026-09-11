import './style.css';
import { exhibits, regions, scenarios, cartVelocity } from './data.js';
import { ExhibitViewer } from './viewer.js';
import { GuideSpeech } from './speech.js';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const base=import.meta.env.BASE_URL;
let current=exhibits[0],selectedRegion=null,viewer;
const catalog=$('#catalog-list');
catalog.innerHTML=exhibits.map(e=>`<button class="exhibit-card" data-id="${e.id}" aria-pressed="false" aria-label="查看 ${e.fullName}"><span class="card-top"><span>NO. ${e.number}</span><span class="selected-mark" aria-hidden="true"></span></span><img class="card-image" src="${base}images/${e.id}.png" alt="${e.fullName} 原创外观模型" width="192" height="100" /><span class="card-title">${e.name}</span><span class="card-bottom"><span>${e.version}</span><span>${e.tone}</span></span></button>`).join('');
$('#region-list').innerHTML=regions.map((r,i)=>`<button class="region-button" data-region="${r.id}" aria-pressed="false"><span class="region-index">${i+1}</span><span class="region-text"><strong>${r.name}</strong><small>${r.hint}</small></span><span class="region-arrow">↗</span></button>`).join('');
$('#hotspots').innerHTML=regions.map((r,i)=>`<button class="hotspot" data-region="${r.id}" aria-label="在模型上选择${r.name}" aria-pressed="false" hidden>${i+1}</button>`).join('');
const speech=new GuideSpeech({status:$('#speech-status'),play:$('#speak'),pause:$('#pause'),stop:$('#stop'),rate:$('#speech-rate')});
function selectRegion(id){
  selectedRegion=id;speech.cancel(false);viewer?.select(id);
  $$('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===id)));
  const region=regions.find(r=>r.id===id);
  $('#region-en').textContent=region?.en||'LOOK A LITTLE CLOSER';
  $('#region-name').textContent=region?.name||'先看整体，再看细节';
  $('#region-description').textContent=region?current.descriptions[id]:'点击模型上的标记，或选择上方卡片，开启一段外观探索。';
}
function resetButtons(){
  $('#explode').setAttribute('aria-pressed','false');$('#auto-rotate').setAttribute('aria-pressed','false');
  $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='perspective'));
}
function chooseExhibit(id){
  current=exhibits.find(e=>e.id===id)||exhibits[0];
  $$('.exhibit-card').forEach(b=>{const active=b.dataset.id===current.id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.querySelector('.selected-mark').textContent=active?'✓':'';});
  $('#maker').textContent=current.maker;$('#exhibit-name').textContent=current.name;$('#version').textContent=current.version;
  $('#exhibit-intro').textContent=current.intro;$('#observation').textContent=current.observation;
  $('#viewer-edition').textContent=`EXHIBIT ${current.number} / 03`;$('#watermark').textContent={g17:'G17','92fs':'92FS','1911':'1911'}[current.id];
  $('#facts').innerHTML=[['具体版本',current.version],['口径标识',current.caliber],['标准弹匣容量',`${current.capacity} 发`],['参考材料',current.material]].map(([key,val])=>`<div><dt>${key}</dt><dd>${val}</dd></div>`).join('');
  $('#source').href=current.source;$('#source').textContent=current.sourceName+' ↗';
  selectRegion(null);resetButtons();viewer?.load(current.id);
}
try{
  viewer=new ExhibitViewer($('#model-canvas'),selectRegion,(state,message)=>{
    $('#viewer').dataset.state=state;$('#load-state').hidden=state==='ready';$('#load-state').textContent=message||'';
    $('#load-state').style.cursor=state==='error'?'pointer':'default';
    if(state==='error'){$('#load-state').tabIndex=0;$('#load-state').setAttribute('role','button');}
    else{$('#load-state').removeAttribute('tabindex');$('#load-state').setAttribute('role','status');}
    $$('#explode,#auto-rotate,#reset,[data-view]').forEach(b=>b.disabled=state!=='ready');
  });
}catch(e){$('#viewer').dataset.state='unsupported';$('#load-state').textContent='此设备暂不支持三维显示。你仍可浏览配图、文字、语音与实验。';$$('#explode,#auto-rotate,#reset,[data-view]').forEach(b=>b.disabled=true);console.warn('WebGL unavailable',e.message);}
$('#load-state').addEventListener('click',()=>{if($('#viewer').dataset.state==='error')viewer?.load(current.id);});
$('#load-state').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#load-state').click();}});
$$('.exhibit-card').forEach(b=>b.addEventListener('click',()=>chooseExhibit(b.dataset.id)));
$$('[data-region]').forEach(b=>b.addEventListener('click',()=>selectRegion(b.dataset.region)));
$('#search').addEventListener('input',e=>{const term=e.target.value.trim().toLowerCase();let shown=0;$$('.exhibit-card').forEach(b=>{const exhibit=exhibits.find(e=>e.id===b.dataset.id);b.hidden=!`${exhibit.fullName} ${exhibit.maker} ${exhibit.version}`.toLowerCase().includes(term);if(!b.hidden)shown++;});$('#no-results').hidden=shown>0;});
function switchTab(facts){$('#tab-observe').setAttribute('aria-selected',String(!facts));$('#tab-facts').setAttribute('aria-selected',String(facts));$('#tab-observe').tabIndex=facts?-1:0;$('#tab-facts').tabIndex=facts?0:-1;$('#panel-observe').hidden=facts;$('#panel-facts').hidden=!facts;}
$('#tab-observe').addEventListener('click',()=>switchTab(false));$('#tab-facts').addEventListener('click',()=>switchTab(true));
$$('[role=tab]').forEach(b=>b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const facts=e.key==='End'||(e.key!=='Home'&&b.id==='tab-observe');switchTab(facts);$(facts?'#tab-facts':'#tab-observe').focus();}}));
$('#explode').addEventListener('click',()=>{if(viewer){viewer.exploded=!viewer.exploded;$('#explode').setAttribute('aria-pressed',String(viewer.exploded));}});
$('#auto-rotate').addEventListener('click',()=>{if(viewer){viewer.controls.autoRotate=!viewer.controls.autoRotate;$('#auto-rotate').setAttribute('aria-pressed',String(viewer.controls.autoRotate));}});
$('#reset').addEventListener('click',()=>{viewer?.reset();selectRegion(null);resetButtons();});
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>{viewer?.view(b.dataset.view);$$('[data-view]').forEach(el=>el.classList.toggle('active',el===b));}));
$('#speak').addEventListener('click',()=>speech.speak(selectedRegion?`${regions.find(r=>r.id===selectedRegion).name}。${current.descriptions[selectedRegion]}`:`${current.fullName}。${current.intro}`));
const dialog=$('#about-dialog');$('#all-sources').innerHTML=exhibits.map(e=>`<a href="${e.source}" target="_blank" rel="noopener noreferrer">${e.fullName} — 官方资料 ↗</a>`).join('');
$$('#about-open,#footer-about').forEach(b=>b.addEventListener('click',()=>dialog.showModal()));$('#about-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
let cartAnimations=[];
function resetLab(){cartAnimations.forEach(a=>a.cancel());cartAnimations=[];const mass=Number($('#mass').value);$('#mass-value').textContent=`${mass} kg`;$('#cart-label').textContent=`${mass} kg`;$('#lab-result').textContent='推开时，两辆小车得到大小相等、方向相反的动量。';}
$('#mass').addEventListener('input',resetLab);
$('#run-experiment').addEventListener('click',()=>{
  resetLab();const mass=Number($('#mass').value);const distance=Math.max(15,($('#lab-stage').clientWidth/2)-68);
  const options={duration:1800,fill:'forwards',easing:'linear'};
  cartAnimations.push($('#cart-a').animate([{transform:'translateX(0)'},{transform:`translateX(${-distance}px)`}],options),$('#cart-b').animate([{transform:'translateX(0)'},{transform:`translateX(${distance/mass}px)`}],options));
  $('#lab-result').textContent=`A 车向左 ${cartVelocity(1).toFixed(1)} m/s，B 车向右 ${cartVelocity(mass).toFixed(1)} m/s。${mass===1?'质量相同，速度大小相同。':`B 车质量是 A 的 ${mass} 倍，速度大小是 A 的 1/${mass}。`}两车总动量仍为 0。`;
});
let quizIndex=0;
function renderQuiz(){const q=scenarios[quizIndex];$('#quiz-number').textContent=`0${quizIndex+1} / 03`;$('#quiz-question').textContent=q.question;$('#quiz-feedback').textContent='';$('#quiz-next').hidden=true;$('#quiz-options').innerHTML=q.options.map((opt,i)=>`<button class="quiz-option" data-option="${i}">${String.fromCharCode(65+i)}　${opt}</button>`).join('');$$('.quiz-option').forEach(b=>b.addEventListener('click',()=>{const correct=Number(b.dataset.option)===q.correct;$$('.quiz-option').forEach(el=>{el.disabled=true;if(Number(el.dataset.option)===q.correct)el.classList.add('correct');});if(!correct)b.classList.add('incorrect');$('#quiz-feedback').textContent=(correct?'答对了。':'记住这个更安全的选择：')+q.explanation;$('#quiz-next').textContent=quizIndex===2?'完成啦，再复习一次 ↺':'下一个情境 →';$('#quiz-next').hidden=false;}));}
$('#quiz-next').addEventListener('click',()=>{quizIndex=(quizIndex+1)%scenarios.length;renderQuiz();});
const sections=$$('#gallery,#lab,#safety');const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible)$$('.header nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${visible.target.id}`));},{rootMargin:'-10% 0px -45% 0px',threshold:[0,.2,.5]});sections.forEach(s=>observer.observe(s));
chooseExhibit('g17');renderQuiz();
// Read-only diagnostics for acceptance tests; no rendering controls exposed.
window.atlasDiagnostics=()=>({model:viewer?.modelId,ready:viewer?.ready,groups:Object.keys(viewer?.groups||{}),active:viewer?.active,expanded:viewer?.exploded,positions:Object.fromEntries(Object.entries(viewer?.groups||{}).map(([k,o])=>[k,o.position.toArray()])),camera:viewer?.camera.position.toArray(),meshes:viewer?.model?(()=>{let n=0;viewer.model.traverse(o=>{if(o.isMesh)n++;});return n;})():0,highlighted:viewer?.model?(()=>{let n=0;viewer.model.traverse(o=>{if(o.isMesh&&o.material.emissiveIntensity>0)n++;});return n;})():0});
