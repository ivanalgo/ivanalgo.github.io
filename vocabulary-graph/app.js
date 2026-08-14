const {words,meanings,neighbors}=window.VOCAB_DATA;
const index=new Map(words.map((w,i)=>[w,i]));
const search=document.querySelector('#search'), suggestions=document.querySelector('#suggestions');
const graph=document.querySelector('#graph'), nodes=document.querySelector('#nodes'), canvas=document.querySelector('#lines');
const title=document.querySelector('#title'), titleMeaning=document.querySelector('#titleMeaning'), back=document.querySelector('#back');
let current=index.get('learn')||0, history=[], rotation=0, activeSuggestion=0;

function speakWord(word){
  if(!('speechSynthesis' in window))return;
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(word);
  utterance.lang='en-US';utterance.rate=.82;utterance.pitch=1;
  const voices=speechSynthesis.getVoices();
  utterance.voice=voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang.startsWith('en'))||null;
  speechSynthesis.speak(utterance);
}

function showWord(word,push=true){
  word=word.toLowerCase().trim();
  if(!index.has(word)){const first=words.find(w=>w.startsWith(word));if(!first)return;word=first}
  if(push&&current!==index.get(word))history.push(current);
  current=index.get(word);rotation=0;search.value=word;title.textContent=word;titleMeaning.textContent=meanings[current];back.disabled=!history.length;
  suggestions.hidden=true;render();history.replaceState(null,'',`#${word}`);
}
function render(){
  nodes.innerHTML='';const rect=graph.getBoundingClientRect(),w=rect.width,h=rect.height,cx=w/2,cy=h/2;
  const count=w<700?18:w<980?28:36, all=neighbors[current], list=all.slice(rotation).concat(all.slice(0,rotation));
  const points=[];
  addNode(words[current],meanings[current],cx,cy,'center',null,0);
  list.slice(0,count).forEach(([idx,score],i)=>{
    const ring=i<8?1:i<20?2:3,slot=ring===1?i:ring===2?i-8:i-20,total=ring===1?8:ring===2?Math.min(12,count-8):count-20;
    const rx=ring===1?Math.min(175,w*.19):ring===2?Math.min(330,w*.32):Math.min(500,w*.44), ry=ring===1?115:ring===2?215:300;
    const angle=-Math.PI/2+(slot/total)*Math.PI*2+(ring===2?.16:ring===3?.08:0);
    const x=cx+Math.cos(angle)*rx,y=cy+Math.sin(angle)*ry;
    const tier=i<6?'hot':i<16?'warm':i<28?'mild':'cool';
    points.push({x,y,score,delay:i,tier});addNode(words[idx],meanings[idx],x,y,tier,score,i+1);
  });
  const dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  points.forEach((p,i)=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.strokeStyle=p.tier==='hot'?'rgba(255,91,88,.42)':p.tier==='warm'?'rgba(244,151,42,.29)':p.tier==='mild'?'rgba(35,176,154,.20)':'rgba(70,111,219,.12)';ctx.lineWidth=p.tier==='hot'?1.8:p.tier==='warm'?1.25:.8;ctx.stroke()});
}
function addNode(word,meaning,x,y,cls,score,delay){
  const b=document.createElement('div');b.className=`node ${cls}`;b.style.left=x+'px';b.style.top=y+'px';b.style.animationDelay=(delay*.018)+'s';
  b.innerHTML=`<span class="word-row"><span class="word-label">${word}</span><button class="speak-btn" type="button" aria-label="播放 ${word} 的发音" title="播放发音">🔊</button></span><span class="meaning">${meaning}</span>${score?`<span class="score">语义相似度 ${score.toFixed(2)}</span>`:''}`;
  const speaker=b.querySelector('.speak-btn');speaker.onclick=e=>{e.stopPropagation();speakWord(word)};
  if(score){b.setAttribute('role','button');b.tabIndex=0;b.onclick=()=>showWord(word);b.onkeydown=e=>{if(e.target===b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showWord(word)}}}
  nodes.appendChild(b);
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
back.onclick=()=>{if(history.length){const i=history.pop();current=i;showWord(words[i],false)}};
document.querySelector('#shuffle').onclick=()=>{rotation=(rotation+7)%neighbors[current].length;render()};
addEventListener('resize',()=>requestAnimationFrame(render));
showWord(location.hash.slice(1)||'learn',false);
