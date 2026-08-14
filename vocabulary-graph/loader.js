const DATA_VERSION=14;
const overlay=document.querySelector('#dataLoader');
const bar=document.querySelector('#loaderBar');
const percent=document.querySelector('#loaderPercent');
const size=document.querySelector('#loaderSize');
const statusText=document.querySelector('#loaderStatus');
const retry=document.querySelector('#loaderRetry');
const datasetStatus=document.querySelector('#datasetStatus');
const chunkPromises=new Map();
const loadedChunks=new Set();

window.VOCAB_CHUNKS={};

function formatMB(bytes){return `${(bytes/1024/1024).toFixed(1)} MB`}
function updateProgress(loaded,total){
  const value=total?Math.min(100,Math.round(loaded/total*100)):0;
  bar.style.width=value+'%';percent.textContent=value+'%';
  size.textContent=total?`${formatMB(loaded)} / ${formatMB(total)}`:`已读取 ${formatMB(loaded)}`;
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.onload=()=>{script.remove();resolve()};script.onerror=reject;document.body.appendChild(script);
  });
}
async function loadAsset(src,total,showProgress=false){
  if(location.protocol==='file:'){
    if(showProgress)bar.classList.add('indeterminate');
    await loadScript(src);return;
  }
  const response=await fetch(src);
  if(!response.ok)throw new Error(`HTTP ${response.status}: ${src}`);
  if(!response.body?.getReader){
    const blob=await response.blob();if(showProgress)updateProgress(blob.size,total||blob.size);
    const url=URL.createObjectURL(blob);await loadScript(url);URL.revokeObjectURL(url);return;
  }
  const reader=response.body.getReader(),chunks=[];let loaded=0;
  while(true){
    const {done,value}=await reader.read();if(done)break;
    chunks.push(value);loaded+=value.byteLength;if(showProgress)updateProgress(loaded,total);
  }
  const url=URL.createObjectURL(new Blob(chunks,{type:'text/javascript'}));
  await loadScript(url);URL.revokeObjectURL(url);
}
function integrateChunk(letter){
  const payload=window.VOCAB_CHUNKS[letter];
  if(!payload)throw new Error(`Missing neighbor chunk: ${letter}`);
  payload.ids.forEach((id,i)=>{window.VOCAB_NEIGHBORS[id]=payload.neighbors[i]});
  delete window.VOCAB_CHUNKS[letter];loadedChunks.add(letter);
  if(datasetStatus)datasetStatus.textContent=loadedChunks.size===26?'50,000 words · offline':`50,000 words · data ${loadedChunks.size}/26`;
}
window.ensureNeighborChunk=function(letter,options={}){
  letter=(letter||'l').toLowerCase();if(!/^[a-z]$/.test(letter))letter='l';
  if(loadedChunks.has(letter))return Promise.resolve();
  if(chunkPromises.has(letter))return chunkPromises.get(letter);
  const meta=window.VOCAB_MANIFEST.chunks[letter];
  const promise=(async()=>{
    if(options.foreground){statusText.textContent=`正在加载 ${letter.toUpperCase()} 组关系…`;bar.classList.remove('indeterminate');bar.style.width='0';percent.textContent='0%'}
    await loadAsset(`data/neighbors-${letter}.js?v=${DATA_VERSION}`,meta.bytes,Boolean(options.foreground));
    integrateChunk(letter);
  })().finally(()=>chunkPromises.delete(letter));
  chunkPromises.set(letter,promise);return promise;
};
function idlePause(){
  return new Promise(resolve=>{
    const done=()=>setTimeout(resolve,220);
    if('requestIdleCallback' in window)requestIdleCallback(done,{timeout:1500});else setTimeout(done,350);
  });
}
async function preloadInBackground(firstLetter){
  const order='etaoinshrdlucmfwypvbgkjqxz'.split('').filter(x=>x!==firstLetter);
  for(const letter of order){
    await idlePause();
    try{await window.ensureNeighborChunk(letter)}catch(error){console.warn(`Background chunk ${letter} failed`,error)}
  }
}
async function boot(){
  try{
    retry.hidden=true;statusText.textContent='正在读取数据清单…';bar.classList.add('indeterminate');
    await loadScript(`data/manifest.js?v=${DATA_VERSION}`);
    statusText.textContent='正在加载基础词库…';bar.classList.remove('indeterminate');bar.style.width='0';percent.textContent='0%';
    await loadAsset(`data/core.js?v=${DATA_VERSION}`,window.VOCAB_MANIFEST.coreBytes,true);
    window.VOCAB_NEIGHBORS=new Array(window.VOCAB_DATA.words.length);
    const hashWord=decodeURIComponent(location.hash.slice(1)).toLowerCase();
    const firstLetter=/^[a-z]/.test(hashWord)?hashWord[0]:'l';
    await window.ensureNeighborChunk(firstLetter,{foreground:true});
    statusText.textContent='正在生成关系图…';bar.classList.remove('indeterminate');bar.style.width='100%';percent.textContent='100%';
    await loadScript(`app.js?v=${DATA_VERSION}`);
    overlay.classList.add('complete');setTimeout(()=>overlay.remove(),320);
    setTimeout(()=>preloadInBackground(firstLetter),800);
  }catch(error){
    console.error('Word Orbit loading failed:',error);
    statusText.textContent='词库加载失败，请检查网络后重试';size.textContent='';bar.classList.remove('indeterminate');
    retry.hidden=false;retry.onclick=()=>location.reload();
  }
}
boot();
