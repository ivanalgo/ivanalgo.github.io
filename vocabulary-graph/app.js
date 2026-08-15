const {words,meanings}=window.VOCAB_DATA;
const neighbors=window.VOCAB_NEIGHBORS;
const details=window.VOCAB_DETAILS;
const concepts=window.VOCAB_CONCEPTS;
const index=new Map(words.map((w,i)=>[w,i]));
const search=document.querySelector('#search'), suggestions=document.querySelector('#suggestions');
const graph=document.querySelector('#graph'), nodes=document.querySelector('#nodes'), canvas=document.querySelector('#lines');
const title=document.querySelector('#title'), titleMeaning=document.querySelector('#titleMeaning'), titleSpeak=document.querySelector('#titleSpeak'), back=document.querySelector('#back');
const modeLabel=document.querySelector('#modeLabel'),shuffle=document.querySelector('#shuffle'),method=document.querySelector('#method');
let current=index.get('learn')||0, navigationHistory=[], rotation=0, activeSuggestion=0,mode='orbit';
const selectedConceptSense=new Map();
const selectedLexicalSense=new Map();
const relationLabels={syn:'同义',ant:'反义',hyper:'上位',hypo:'下位',hyper2:'上位',hypo2:'下位',deriv:'派生'};
const modeLabels={orbit:'WORD NEIGHBORHOOD',tree:'CONCEPT TREE',lexical:'SYNONYMS & ANTONYMS',confuse:'CONFUSABLE WORDS'};

function speakWord(word){
  if(!('speechSynthesis' in window))return;
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(word);
  utterance.lang='en-US';utterance.rate=.82;utterance.pitch=1;
  const voices=speechSynthesis.getVoices();
  utterance.voice=voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang.startsWith('en'))||null;
  speechSynthesis.speak(utterance);
}
function speakerMarkup(word){const safe=escapeHtml(word);return `<button class="speak-btn" type="button" data-speak="${safe}" aria-label="播放 ${safe} 的发音" title="播放发音">🔊</button>`}
function bindSpeakers(root=nodes){root.querySelectorAll('.speak-btn[data-speak]').forEach(button=>button.onclick=e=>{e.stopPropagation();speakWord(button.dataset.speak)})}

async function showWord(word,push=true,senseName=null){
  word=word.toLowerCase().trim();
  if(!index.has(word)){const first=words.find(w=>w.startsWith(word));if(!first)return;word=first}
  const next=index.get(word);
  if(push&&current!==next)navigationHistory.push(current);
  current=next;rotation=0;search.value=word;title.textContent=word;titleMeaning.textContent=meanings[current];back.disabled=!navigationHistory.length;
  if(senseName)selectedConceptSense.set(next,senseName);
  suggestions.hidden=true;window.history.replaceState(null,'',`#${word}`);
  await renderCurrent(next);
}
function showDataLoading(letter,label){
  nodes.innerHTML=`<div class="graph-loading detail-loading"><strong>正在加载 ${letter} 组${label}…</strong><div class="chunk-progress"><span></span></div><div class="chunk-progress-meta"><span>0%</span><span>准备中</span></div></div>`;
  const loading=nodes.querySelector('.graph-loading'),fill=loading.querySelector('.chunk-progress span'),meta=loading.querySelector('.chunk-progress-meta');
  return (loaded,total,indeterminate)=>{
    if(!loading.isConnected)return;
    if(indeterminate){fill.classList.add('indeterminate');meta.firstElementChild.textContent='读取中';meta.lastElementChild.textContent='';return}
    fill.classList.remove('indeterminate');const value=total?Math.min(100,Math.round(loaded/total*100)):0;
    fill.style.width=value+'%';meta.firstElementChild.textContent=value+'%';meta.lastElementChild.textContent=total?`${(loaded/1024/1024).toFixed(1)} / ${(total/1024/1024).toFixed(1)} MB`:'';
  };
}
async function renderCurrent(expected=current){
  const requestedMode=mode;
  modeLabel.textContent=modeLabels[mode];shuffle.hidden=mode!=='orbit';graph.classList.toggle('detail-view',mode!=='orbit');
  document.querySelectorAll('.mode-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
  if(mode==='orbit'){
    method.textContent='GloVe 2024 + ECDICT hybrid rerank';
    if(!neighbors[expected])await window.ensureNeighborChunk(words[expected][0],{onProgress:showDataLoading(words[expected][0].toUpperCase(),'关联')});
    if(current===expected&&mode==='orbit')renderOrbit();return;
  }
  method.textContent=mode==='tree'?'WordNet concept hierarchy':mode==='lexical'?'WordNet + Wiktionary + Moby':'CMUdict + spelling distance';
  if(!details[expected])await window.ensureDetailChunk(words[expected][0],{onProgress:showDataLoading(words[expected][0].toUpperCase(),'学习数据')});
  if(current!==expected||mode!==requestedMode)return;
  if(mode==='tree')renderTree();else if(mode==='lexical')renderLexical();else renderConfusions();
}
function renderOrbit(){
  nodes.innerHTML='';const rect=graph.getBoundingClientRect(),w=rect.width,h=rect.height,cx=w/2,cy=h/2;
  const all=neighbors[current];if(!all)return;
  const count=w<700?18:w<980?28:36, list=all.slice(rotation).concat(all.slice(0,rotation));
  const points=[];
  addNode(words[current],meanings[current],cx,cy,'center',null,0,null);
  list.slice(0,count).forEach(([idx,score,relation],i)=>{
    const ring=i<8?1:i<20?2:3,slot=ring===1?i:ring===2?i-8:i-20,total=ring===1?8:ring===2?Math.min(12,count-8):count-20;
    const rx=ring===1?Math.min(235,w*.22):ring===2?Math.min(385,w*.35):Math.min(510,w*.44), ry=ring===1?140:ring===2?230:300;
    const angle=-Math.PI/2+(slot/total)*Math.PI*2+(ring===2?.16:ring===3?.08:0);
    const x=cx+Math.cos(angle)*rx,y=cy+Math.sin(angle)*ry;
    const tier=i<6?'hot':i<16?'warm':i<28?'mild':'cool';
    points.push({x,y,score,delay:i,tier});addNode(words[idx],meanings[idx],x,y,tier,score,i+1,relation);
  });
  const dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  points.forEach((p,i)=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.strokeStyle=p.tier==='hot'?'rgba(255,91,88,.42)':p.tier==='warm'?'rgba(244,151,42,.29)':p.tier==='mild'?'rgba(35,176,154,.20)':'rgba(70,111,219,.12)';ctx.lineWidth=p.tier==='hot'?1.8:p.tier==='warm'?1.25:.8;ctx.stroke()});
}
function addNode(word,meaning,x,y,cls,score,delay,relation){
  const b=document.createElement('div');b.className=`node ${cls}`;b.style.left=x+'px';b.style.top=y+'px';b.style.animationDelay=(delay*.018)+'s';
  const relationBadge=relationLabels[relation]?`<span class="relation relation-${relation}">${relationLabels[relation]}</span>`:'';
  b.innerHTML=`<span class="word-row"><span class="word-label">${word}</span><button class="speak-btn" type="button" aria-label="播放 ${word} 的发音" title="播放发音">🔊</button></span><span class="meaning">${meaning}</span>${score?`<span class="score">关联度 ${score.toFixed(2)} ${relationBadge}</span>`:''}`;
  const speaker=b.querySelector('.speak-btn');speaker.onclick=e=>{e.stopPropagation();speakWord(word)};
  if(score){b.setAttribute('role','button');b.tabIndex=0;b.onclick=()=>showWord(word);b.onkeydown=e=>{if(e.target===b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showWord(word)}}}
  nodes.appendChild(b);
}
function uniqueIds(values){return [...new Set(values)].filter(id=>id!==current)}
function singularCandidates(word){
  const values=[];
  if(word.endsWith('ies'))values.push(word.slice(0,-3)+'y');
  if(word.endsWith('es'))values.push(word.slice(0,-2),word.slice(0,-1));
  if(word.endsWith('s')&&!word.endsWith('ss'))values.push(word.slice(0,-1));
  return values;
}
function compactConfusions(items){
  const shown=new Set(items.map(item=>words[item[0]]));
  return items.filter(item=>!singularCandidates(words[item[0]]).some(singular=>shown.has(singular)));
}
function detailCard(id,badge='',meaning=''){
  const word=words[id];return `<div class="detail-card" role="button" tabindex="0" data-id="${id}"><div class="detail-word-row"><strong>${word}</strong>${speakerMarkup(word)}</div><span>${escapeHtml(meaning||meanings[id])}</span>${badge?`<em>${badge}</em>`:''}</div>`;
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function detailSection(title,items,badge='',senseMeanings={}){
  const cards=items.map(item=>Array.isArray(item)?detailCard(item[0],typeof badge==='function'?badge(item):badge,senseMeanings[item[0]]):detailCard(item,badge,senseMeanings[item])).join('');
  return `<section class="detail-section"><h3>${title}<small>${items.length}</small></h3>${cards?`<div class="detail-grid">${cards}</div>`:`<div class="empty-detail">暂无可用词条</div>`}</section>`;
}
function bindDetailCards(){nodes.querySelectorAll('.detail-card[data-id]').forEach(card=>{card.onclick=()=>showWord(words[Number(card.dataset.id)]);card.onkeydown=e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showWord(words[Number(card.dataset.id)])}}});bindSpeakers()}
function conceptSection(title,items,badge){
  const cards=items.map(([id,senseName,definition,chinese,display])=>{const clickable=id>=0,fallback=clickable?`${meanings[id]}（通用义）`:'暂无中文释义',word=display||(clickable?words[id]:'');return `<div class="detail-card concept-card ${clickable?'':'concept-static'}"${clickable?` role="button" tabindex="0" data-id="${id}" data-sense="${escapeHtml(senseName)}"`:''}><div class="detail-word-row"><strong>${escapeHtml(word)}</strong>${speakerMarkup(word)}</div><b>${escapeHtml(chinese||fallback)}</b><span title="${escapeHtml(definition)}">${escapeHtml(definition)}</span><em>${badge} · ${escapeHtml(senseName)}</em></div>`}).join('');
  return `<section class="detail-section"><h3>${title}<small>${items.length}</small></h3>${cards?`<div class="detail-grid">${cards}</div>`:`<div class="empty-detail">暂无直接关系</div>`}</section>`;
}
function bindConceptCards(){nodes.querySelectorAll('.concept-card[data-id]').forEach(card=>{card.onclick=()=>showWord(words[Number(card.dataset.id)],true,card.dataset.sense);card.onkeydown=e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showWord(words[Number(card.dataset.id)],true,card.dataset.sense)}}});bindSpeakers()}
function renderTree(){
  const baseSenses=details[current][10]||[],remembered=selectedConceptSense.get(current),extraSense=concepts[remembered];
  const senses=extraSense&&!baseSenses.some(item=>item[0]===remembered)?[extraSense,...baseSenses]:baseSenses;
  if(!senses.length){nodes.innerHTML='<div class="detail-shell"><div class="empty-detail tree-empty">WordNet 暂无可展开的概念词义</div></div>';return}
  const senseIndex=Math.max(0,senses.findIndex(item=>item[0]===remembered)),sense=senses[senseIndex];
  selectedConceptSense.set(current,sense[0]);
  const senseDisplay=sense[0].replace(/\.[a-z]\.[0-9]+$/,'').replaceAll('_',' ');
  const tabs=senses.map((item,i)=>`<button class="sense-tab ${i===senseIndex?'active':''}" data-index="${i}"><strong>${item[0]}</strong>${item[3]?`<b>${escapeHtml(item[3])}</b>`:''}<span>${escapeHtml(item[2])}</span></button>`).join('');
  const parents=sense[6]||sense[4],children=sense[7]||sense[5];
  const warning=sense[8]?`<div class="concept-warning">此词义涉及历史性或敏感的人群分类。WordNet 中 ${sense[9]||0} 个过时、冒犯性或容易误导的下位概念已默认隐藏。</div>`:'';
  nodes.innerHTML=`<div class="detail-shell"><div class="detail-intro">先选择具体词义；每个概念只显示一个常用名称，并省略低频、高难度或敏感分类。</div><div class="sense-picker"><h3>选择词义 <small>${senses.length}</small></h3><div class="sense-tabs">${tabs}</div></div>${warning}${conceptSection('上位概念',parents,'上位')}<div class="tree-arrow">↓</div><div class="tree-current"><div><div class="detail-word-row"><strong>${escapeHtml(senseDisplay)}</strong>${speakerMarkup(senseDisplay)}</div><b>${escapeHtml(sense[3]||meanings[current])}${sense[3]?'':'（通用义）'}</b><span>${escapeHtml(sense[2])}</span><em>${sense[0]}</em></div></div><div class="tree-arrow">↓</div>${conceptSection('下位概念',children,'下位')}</div>`;
  nodes.querySelectorAll('.sense-tab').forEach(button=>button.onclick=()=>{selectedConceptSense.set(current,senses[Number(button.dataset.index)][0]);renderTree()});
  bindConceptCards();
}
function renderLexical(){
  const row=details[current];
  const senses=row[11]||[];
  if(!senses.length){nodes.innerHTML='<div class="detail-shell"><div class="empty-detail tree-empty">词典中暂无可用的近义或反义关系</div></div>';return}
  const remembered=selectedLexicalSense.get(current),rememberedIndex=senses.findIndex(item=>item[0]===remembered);
  const relationCount=item=>item[4].length+item[5].length+item[6].length;
  let defaultIndex=0;
  if(relationCount(senses[0])<2){senses.forEach((item,i)=>{if(relationCount(item)>relationCount(senses[defaultIndex]))defaultIndex=i})}
  const senseIndex=rememberedIndex>=0?rememberedIndex:defaultIndex,sense=senses[senseIndex];
  selectedLexicalSense.set(current,sense[0]);
  const tabs=senses.map((item,i)=>`<button class="sense-tab ${i===senseIndex?'active':''}" data-index="${i}"><strong>${item[0]}</strong>${item[3]?`<b>${escapeHtml(item[3])}</b>`:''}<span>${escapeHtml(item[2])}</span></button>`).join('');
  const senseMeanings=sense[8]||{};
  nodes.innerHTML=`<div class="detail-shell"><div class="detail-intro">先选择具体词义；“同义”仅表示同一 WordNet 词义，“近义”由 WordNet、Wiktionary 和 Moby 候选经词性、词义与语义相似度筛选。</div><div class="sense-picker"><h3>选择词义 <small>${senses.length}</small></h3><div class="sense-tabs">${tabs}</div></div><div class="lexical-columns">${detailSection('同义词',uniqueIds(sense[4]),'同义',senseMeanings)}${detailSection('近义词',uniqueIds(sense[5]),'近义',senseMeanings)}${detailSection('反义词',uniqueIds(sense[6]),'反义',senseMeanings)}</div>${detailSection('派生词',uniqueIds(sense[7]),'派生',senseMeanings)}</div>`;
  nodes.querySelectorAll('.sense-tab').forEach(button=>button.onclick=()=>{selectedLexicalSense.set(current,senses[Number(button.dataset.index)][0]);renderLexical()});
  bindDetailCards();
}
function renderConfusions(){
  const row=details[current],shape=compactConfusions(row[7]),sound=compactConfusions(row[8]),misuse=row[9];
  nodes.innerHTML=`<div class="detail-shell"><div class="detail-intro">易混词不参与语义星图排序，这里单独用于辨别拼写、发音和用法。</div><div class="confusion-columns">${detailSection('形近词',shape,item=>`形近 ${(item[1]*100).toFixed(0)}%`)}${detailSection('同音 / 近音',sound,item=>item[2]==='same'?'同音':`近音 ${(item[1]*100).toFixed(0)}%`)}${detailSection('易误用',misuse,'易误用')}</div></div>`;
  bindDetailCards();
}
function updateSuggestions(){
  const q=search.value.toLowerCase().trim();if(!q){suggestions.hidden=true;return}
  const found=[];for(const w of words){if(w.startsWith(q)){found.push(w);if(found.length===7)break}}
  suggestions.innerHTML=found.map((w,i)=>`<button class="${i===activeSuggestion?'active':''}" data-word="${w}"><span>${w}</span><small>${meanings[index.get(w)]}</small></button>`).join('');
  suggestions.hidden=!found.length;suggestions.querySelectorAll('button').forEach(b=>b.onclick=()=>showWord(b.dataset.word));
}
search.addEventListener('input',()=>{activeSuggestion=0;updateSuggestions()});
search.addEventListener('keydown',e=>{const opts=[...suggestions.querySelectorAll('button')];if(e.key==='ArrowDown'){e.preventDefault();activeSuggestion=Math.min(activeSuggestion+1,opts.length-1);updateSuggestions()}else if(e.key==='ArrowUp'){e.preventDefault();activeSuggestion=Math.max(activeSuggestion-1,0);updateSuggestions()}else if(e.key==='Enter'){e.preventDefault();showWord(opts[activeSuggestion]?.dataset.word||search.value)}else if(e.key==='Escape')suggestions.hidden=true});
document.querySelectorAll('[data-word]').forEach(b=>b.addEventListener('click',()=>showWord(b.dataset.word)));
titleSpeak.onclick=()=>speakWord(words[current]);
back.onclick=()=>{if(navigationHistory.length){const i=navigationHistory.pop();showWord(words[i],false)}};
shuffle.onclick=()=>{if(mode==='orbit'&&neighbors[current]){rotation=(rotation+7)%neighbors[current].length;renderOrbit()}};
document.querySelectorAll('.mode-tabs button').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;rotation=0;renderCurrent()});
addEventListener('resize',()=>{if(mode==='orbit'&&neighbors[current])requestAnimationFrame(renderOrbit)});
showWord(location.hash.slice(1)||'learn',false);
