const overlay=document.querySelector('#dataLoader');
const bar=document.querySelector('#loaderBar');
const percent=document.querySelector('#loaderPercent');
const size=document.querySelector('#loaderSize');
const statusText=document.querySelector('#loaderStatus');
const retry=document.querySelector('#loaderRetry');
// fetch() 返回的是解压后的字节流，而 CDN 的 Content-Length 可能是 gzip/br 压缩体积。
const EXPECTED_DATA_BYTES=29137347;

function formatMB(bytes){return `${(bytes/1024/1024).toFixed(1)} MB`}
function updateProgress(loaded,total){
  const value=total?Math.min(100,Math.round(loaded/total*100)):0;
  bar.style.width=value+'%';percent.textContent=value+'%';
  size.textContent=total?`${formatMB(loaded)} / ${formatMB(total)}`:`已读取 ${formatMB(loaded)}`;
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
  });
}
async function loadData(){
  try{
    retry.hidden=true;
    if(location.protocol==='file:'){
      statusText.textContent='正在读取本地词库…';bar.classList.add('indeterminate');
      await loadScript('vocab-data.js?v=10');
    }else{
      statusText.textContent='正在下载离线词库…';
      const response=await fetch('vocab-data.js?v=10');
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const total=EXPECTED_DATA_BYTES;
      if(response.body&&response.body.getReader){
        const reader=response.body.getReader(),chunks=[];let loaded=0;
        while(true){
          const {done,value}=await reader.read();if(done)break;
          chunks.push(value);loaded+=value.byteLength;updateProgress(loaded,total);
        }
        const url=URL.createObjectURL(new Blob(chunks,{type:'text/javascript'}));
        await loadScript(url);URL.revokeObjectURL(url);
      }else{
        const source=await response.blob();updateProgress(source.size,total||source.size);
        const url=URL.createObjectURL(source);await loadScript(url);URL.revokeObjectURL(url);
      }
    }
    statusText.textContent='正在生成关系图…';bar.classList.remove('indeterminate');bar.style.width='100%';percent.textContent='100%';
    await loadScript('app.js?v=10');
    overlay.classList.add('complete');setTimeout(()=>overlay.remove(),320);
  }catch(error){
    console.error('Word Orbit loading failed:',error);
    statusText.textContent='词库加载失败，请检查网络后重试';size.textContent='';bar.classList.remove('indeterminate');
    retry.hidden=false;retry.onclick=()=>location.reload();
  }
}
loadData();
