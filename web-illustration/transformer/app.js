'use strict';
const $=s=>document.querySelector(s);
const state={trace:null,nodes:[],byId:{},cursor:0,selected:null,precision:3,zoom:1,timer:null,space:false,drag:null,collapsed:new Set(),focusStep:null};
window.__traceLab=state;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=v=>v===-Infinity?'−∞':Number.isFinite(v)?v.toFixed(state.precision):String(v);
const kindName={result:'计算结果',parameter:'模型参数 · 固定教学数值',constant:'固定规则 / 常量',input:'用户输入',setting:'用户设置'};
function notify(message){$('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),2600);}
function heat(v,max){if(!Number.isFinite(v))return ['#dddcd4','#6c736d'];const t=Math.min(Math.abs(v)/(max||1),1),alpha=.12+.63*t;return v>=0?[`rgba(45,128,98,${alpha})`,t>.62?'#fff':'#173e2f']:[`rgba(239,126,76,${alpha})`,t>.62?'#fff':'#6d321d'];}
function matrixHtml(n){
  const max=Math.max(...n.data.flat().filter(Number.isFinite).map(Math.abs),.001),wide=n.cols.length>6;
  return `<table class="matrix${wide?' wide':''}" aria-label="${esc(n.title)} 数值矩阵"><thead><tr><th scope="col"></th>${n.cols.map(c=>`<th scope="col" title="${esc(c)}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${n.data.map((row,r)=>`<tr><th scope="row" title="${esc(n.rows[r])}">${esc(n.rows[r])}</th>${row.map((v,c)=>{const [bg,fg]=heat(v,max),shown=n.operation==='input'||n.id==='topK'?String(v):fmt(v);return `<td><button type="button" data-cell data-node="${esc(n.id)}" data-r="${r}" data-c="${c}" aria-label="${esc(n.title)}, 行 ${esc(n.rows[r])}, 列 ${esc(n.cols[c])}, ${esc(shown)}" style="--cell-bg:${bg};--cell-fg:${fg}">${shown}</button></td>`;}).join('')}</tr>`).join('')}</tbody></table>`;
}
function cardHtml(n){const collapsed=state.collapsed.has(n.id);return `<article class="node-card ${n.kind}" id="node-${n.id}" data-node-id="${n.id}" data-head="${n.head}"><div class="card-kind">${kindName[n.kind]}${n.head?' · HEAD '+n.head:''}</div><div class="card-top"><h3>${esc(n.title)}</h3><span>${n.data.length} × ${n.data[0].length}</span>${n.kind==='parameter'?`<button class="collapse-card" data-collapse="${n.id}" aria-expanded="${!collapsed}" aria-label="${collapsed?'展开':'折叠'} ${esc(n.title)} 数值">${collapsed?'展开':'收起'}</button>`:''}</div>${n.formula?`<div class="card-formula">${esc(n.formula)}</div>`:''}<div class="card-axes">行：${esc(n.axes.rows)} · 列：${esc(n.axes.cols)}</div><div class="card-content" ${collapsed?'hidden':''}>${matrixHtml(n)}${n.note?`<p class="parameter-note">${esc(n.note)}</p>`:''}${n.id==='probabilities'?probabilityHtml(n):''}</div></article>`;}
function probabilityHtml(n){return `<div class="probability-bars">${n.data[0].map((v,c)=>`<div class="probability-row"><span>${esc(n.cols[c])}</span><div class="bar-track"><i style="width:${100*v}%"></i></div><span>${(100*v).toFixed(2)}%</span></div>`).join('')}</div>`;}
function operatorHtml(n){
  if(!n.inputs.length)return '';
  const symbols={embedding:'E',add:'+',mean:'μ',variance:'σ²',normalize:'LN',scale:'⊙',matmul:'×',bias:'+',transpose:'ᵀ',divide:'÷',mask:'M',softmax:'S',concat:'∥',gelu:'G',last:'T−1',topk:'k'};
  const names={embedding:'查取教学词向量',mean:'沿特征维求均值',variance:'沿特征维求方差',normalize:'(X − μ) / √(σ² + ε)',matmul:'矩阵乘法',bias:'逐行广播相加',scale:'逐元素缩放',add:'逐元素相加',transpose:'转置',divide:n.formula,mask:'因果 Mask',softmax:'逐行 Softmax',concat:'按特征拼接',gelu:'GELU',last:'取最后 token',topk:'Top-k 过滤'};
  return `<div class="operator-stack" data-operation-for="${n.id}"><div class="operation-circle${n.operation==='normalize'?' ln-normalizer':''}" role="img" aria-label="${esc(names[n.operation]||n.operation)} 运算">${symbols[n.operation]||'ƒ'}</div><span class="operation-caption">${esc(names[n.operation]||n.formula||n.operation)}</span></div>`;
}
function createStage(step){
  const el=document.createElement('section');el.className='stage';el.id='stage-'+step.id;el.dataset.stepId=step.id;
  el.innerHTML=`<div class="stage-heading"><h2>${esc(step.title)}</h2><p>${esc(step.note)}</p></div>`;
  const heads=step.rows.some(r=>r.head);
  if(heads){const lanes=document.createElement('div');lanes.className='head-lanes';for(let h=1;h<=2;h++){const lane=document.createElement('div');lane.className='head-lane';lane.dataset.head=h;lane.innerHTML=`<div class="head-title">HEAD ${h} · ${h===1?'左侧':'右侧'}计算</div>`;lanes.append(lane);}el.append(lanes);}
  else{const lane=document.createElement('div');lane.className='standard-lane';
    if(['ln1','ln2','lnf'].includes(step.id)){
      lane.classList.add('ln-lane');const inputId=state.byId[step.id+'.mean'].inputs[0],input=state.byId[inputId];
      lane.innerHTML=`<div class="ln-frame"><div class="ln-input node-card" data-reference-id="${inputId}"><div class="card-kind">上游矩阵 · 原值沿主线传递</div><div class="card-top"><h3>${esc(input.title)}</h3><span>${input.data.length} × ${input.cols.length}</span></div>${matrixHtml(input)}</div><div class="ln-statistics"></div></div>`;
    }el.append(lane);}
  $('#stages').append(el);return el;
}
function syncCards(reformat=false){
  const visible=new Set(state.nodes.slice(0,state.cursor+1).map(n=>n.id));
  for(const step of state.trace.graph.steps){
    const activeRows=step.rows.filter(row=>[row.output,...row.parameters].some(id=>visible.has(id)));
    if(!activeRows.length)continue;
    const stage=$('#stage-'+step.id)||createStage(step);
    for(const row of activeRows){
      let rowEl=$(`[data-row-id="${row.output}"]`);
      if(!rowEl){rowEl=document.createElement('div');rowEl.className='operation-row';rowEl.dataset.rowId=row.output;rowEl.innerHTML='<div class="result-slot"></div><div class="parameter-slot"></div>';
        const statistic=/\.(mean|variance)$/.test(row.output)&&stage.querySelector('.ln-statistics');
        if(statistic){rowEl.classList.add('ln-stat-row');statistic.append(rowEl);}
        else stage.querySelector(row.head?`.head-lane[data-head="${row.head}"]`:'.standard-lane').append(rowEl);
      }
      for(const id of [row.output,...row.parameters])if(visible.has(id)){
        const existing=$(`[data-node-id="${id}"]`);if(existing&&!reformat)continue;
        const wrapper=document.createElement('div');wrapper.innerHTML=cardHtml(state.byId[id]);const card=wrapper.firstElementChild;
        if(existing)existing.replaceWith(card);else{const slot=rowEl.querySelector(id===row.output?'.result-slot':'.parameter-slot');if(id===row.output)slot.insertAdjacentHTML('beforeend',operatorHtml(state.byId[id]));slot.append(card);}
      }
    }
  }
  $('#progressText').textContent=`${state.cursor+1} / ${state.nodes.length}`;
  $('#progressName').textContent=state.nodes[state.cursor].title;
  const complete=state.cursor===state.nodes.length-1;$('#nextBtn').disabled=complete;$('#allBtn').disabled=complete;$('#autoBtn').disabled=complete;
  $('#stepMap').innerHTML=state.trace.graph.steps.map(step=>{const nodes=state.nodes.filter(n=>n.step===step.id),count=nodes.filter(n=>visible.has(n.id)).length;return `<button class="map-item${state.nodes[state.cursor].step===step.id?' current':''}" data-stage="${step.id}" ${count?'':'disabled'}><span>${count}/${nodes.length}</span>${esc(step.title)}</button>`;}).join('');
  if(reformat)document.querySelectorAll('[data-reference-id]').forEach(el=>{const n=state.byId[el.dataset.referenceId];el.querySelector('.matrix').outerHTML=matrixHtml(n);});
  requestAnimationFrame(()=>{alignOperators();sizeSurface();drawEdges();restoreSelection();});
}
function alignOperators(){document.querySelectorAll('.operation-row').forEach(row=>{const stack=row.querySelector('.operator-stack'),parameter=row.querySelector('.parameter-slot .node-card');if(!stack)return;const radius=stack.querySelector('.operation-circle').offsetHeight/2;stack.style.setProperty('--operator-offset',Math.max(0,(parameter?.offsetHeight||radius*2)/2-radius)+'px');});}
function sizeSurface(){const canvas=$('#graphCanvas');$('#scaledSurface').style.width=canvas.offsetWidth*state.zoom+'px';$('#scaledSurface').style.height=canvas.offsetHeight*state.zoom+'px';canvas.style.transform=`scale(${state.zoom})`;$('#zoomText').textContent=Math.round(state.zoom*100)+'%';}
function focusNode(id){const el=$(`[data-node-id="${id}"]`);if(!el)return;state.focusStep=state.byId[id].step;const viewport=$('#viewport'),canvas=$('#graphCanvas');const x=el.getBoundingClientRect().left-canvas.getBoundingClientRect().left,y=el.getBoundingClientRect().top-canvas.getBoundingClientRect().top;viewport.scrollTo({left:Math.max(0,x-45),top:Math.max(0,y-55),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
function focusStage(id){const el=$('#stage-'+id);if(!el)return;state.focusStep=id;$('#viewport').scrollTo({top:el.offsetTop*state.zoom-20,left:0,behavior:'smooth'});}
function setZoom(value){const viewport=$('#viewport'),old=state.zoom;state.zoom=Math.max(.3,Math.min(1.4,value));const x=(viewport.scrollLeft+viewport.clientWidth/2)/old,y=(viewport.scrollTop+viewport.clientHeight/2)/old;sizeSurface();viewport.scrollLeft=x*state.zoom-viewport.clientWidth/2;viewport.scrollTop=y*state.zoom-viewport.clientHeight/2;requestAnimationFrame(drawEdges);}
function svgEl(name,attributes){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v]of Object.entries(attributes))el.setAttribute(k,String(v));return el;}
function roundedPath(points,r=10){
  let path=`M ${points[0][0]} ${points[0][1]}`;
  for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],da=Math.hypot(b[0]-a[0],b[1]-a[1]),dc=Math.hypot(c[0]-b[0],c[1]-b[1]);if(!da||!dc)continue;const radius=Math.min(r,da/2,dc/2),before=[b[0]-(b[0]-a[0])*radius/da,b[1]-(b[1]-a[1])*radius/da],after=[b[0]+(c[0]-b[0])*radius/dc,b[1]+(c[1]-b[1])*radius/dc];path+=` L ${before[0]} ${before[1]} Q ${b[0]} ${b[1]} ${after[0]} ${after[1]}`;}
  const end=points.at(-1);return path+` L ${end[0]} ${end[1]}`;
}
function drawEdges(){
  const canvas=$('#graphCanvas'),root=canvas.getBoundingClientRect(),svg=$('#edges');svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${canvas.offsetWidth} ${canvas.offsetHeight}`);
  const defs=svgEl('defs',{});for(const [id,color]of [['dataArrow','#467b5d'],['parameterArrow','#5078a2']]){const marker=svgEl('marker',{id,markerWidth:7,markerHeight:7,refX:6,refY:3.5,orient:'auto'});marker.append(svgEl('path',{d:'M0,0 L7,3.5 L0,7 Z',fill:color}));defs.append(marker);}svg.append(defs);
  const rect=el=>{const r=el.getBoundingClientRect();return {left:(r.left-root.left)/state.zoom,right:(r.right-root.left)/state.zoom,top:(r.top-root.top)/state.zoom,bottom:(r.bottom-root.top)/state.zoom,cx:(r.left+r.right-2*root.left)/2/state.zoom,cy:(r.top+r.bottom-2*root.top)/2/state.zoom};};
  const obstacles=[...document.querySelectorAll('.node-card')].map(el=>({el,...rect(el)}));
  const clearVertical=(x,y1,y2,sourceEl,targetEl)=>!obstacles.some(o=>o.el!==sourceEl&&o.el!==targetEl&&x>o.left-6&&x<o.right+6&&Math.max(y1,o.top)<Math.min(y2,o.bottom));
  let index=0;
  const edge=(points,source,target,parameter=false,extra='')=>svg.append(svgEl('path',{d:roundedPath(points),class:`edge${parameter?' parameter':''} ${extra}`,'marker-end':`url(#${parameter?'parameterArrow':'dataArrow'})`,'data-source':source,'data-target':target,'data-edge-index':index++}));
  document.querySelectorAll('.ln-input').forEach(ref=>{
    const source=$(`[data-node-id="${ref.dataset.referenceId}"]`);if(!source)return;
    const a=rect(source),b=rect(ref),track=b.left-40;
    edge(Math.abs(a.cx-b.cx)<2&&clearVertical(b.cx,a.bottom,b.top,source,ref)?[[b.cx,a.bottom+3],[b.cx,b.top-7]]:[[a.cx,a.bottom+3],[a.cx,a.bottom+25],[track,a.bottom+25],[track,b.top-28],[b.cx,b.top-28],[b.cx,b.top-7]],ref.dataset.referenceId,ref.closest('.stage').dataset.stepId+'.normalized',false,'ln-reference-edge');
  });
  for(const target of state.nodes.slice(0,state.cursor+1)){
    const targetEl=$(`[data-node-id="${target.id}"]`),operator=$(`[data-operation-for="${target.id}"] .operation-circle`);
    if(!targetEl||!operator)continue;
    const b=rect(targetEl),op=rect(operator),stage=targetEl.closest('.stage'),lnRef=stage.querySelector('.ln-input');
    target.inputs.forEach((id,portIndex)=>{
      const sourceEl=lnRef&&lnRef.dataset.referenceId===id&&['mean','variance','normalize'].includes(target.operation)?lnRef:$(`[data-node-id="${id}"]`);if(!sourceEl)return;
      const source=state.byId[id],a=rect(sourceEl),sourceRow=rect(sourceEl.closest('.operation-row')||sourceEl),sameRow=sourceEl.closest('.operation-row')===targetEl.closest('.operation-row');
      const parameter=['parameter','setting','constant'].includes(source.kind)&&sameRow;
      const skip=(target.id==='res1'&&id==='x0')||(target.id==='res2'&&id==='res1')||(target.id.startsWith('context')&&id.startsWith('V'));
      let points;
      if(parameter){
        points=[[a.left-2,a.cy],[op.right+7,a.cy]];
      }else if(lnRef&&sourceEl===lnRef&&['mean','variance'].includes(target.operation)){
        const channel=a.right+24+(target.operation==='variance'?16:0);
        points=[[a.right+2,a.cy],[channel,a.cy],[channel,op.cy],[op.left-7,op.cy]];
      }else if(target.operation==='normalize'&&lnRef&&sourceEl!==lnRef){
        const channel=a.right+30+portIndex*22,entryY=op.top-30-portIndex*20;
        points=[[a.right+2,a.cy],[channel,a.cy],[channel,entryY],[op.cx+90,entryY],[op.cx+90,op.cy],[op.right+7,op.cy]];
      }else if(!skip&&Math.abs(a.cx-op.cx)<2&&op.top>a.bottom&&clearVertical(op.cx,a.bottom,op.top,sourceEl,targetEl)){
        points=[[a.cx,a.bottom+3],[op.cx,op.top-7]];
      }else{
        const exitY=sourceRow.bottom+18+(portIndex%3)*8;
        const track=skip?30+(target.head||portIndex)*16:b.left-36-portIndex*14;
        const entryY=op.top-36-portIndex*18;
        points=[[a.cx,a.bottom+3],[a.cx,exitY],[track,exitY],[track,entryY],[op.cx,entryY],[op.cx,op.top-7]];
      }
      edge(points,id,target.id,parameter,skip?'skip':'');
    });
    if(target.operation==='normalize')svg.append(svgEl('circle',{cx:op.cx+90,cy:op.cy,r:3,class:'edge-join'}));
    edge([[op.cx,op.bottom+2],[b.cx,b.top-7]],target.id,target.id,false,'operator-output');
  }
  applyHighlight();
}
function detail(n,r,c){
  const source=n.inputs.map(id=>state.byId[id]),value=n.data[r][c],f=fmt;
  let text='';
  switch(n.operation){
    case 'matmul':text=source[0].data[r].map((v,k)=>`${f(v)} × ${f(source[1].data[k][c])}`).join('\n+ ')+'\n= '+f(value);break;
    case 'add':text=`${f(source[0].data[r][c])} + ${f(source[1].data[r][c])}\n= ${f(value)}`;break;
    case 'bias':{
      if(source[0].operation==='matmul'){
        const [left,right]=source[0].inputs.map(id=>state.byId[id]);text=left.data[r].map((v,k)=>`${f(v)} × ${f(right.data[k][c])}`).join('\n+ ')+`\n矩阵乘积 = ${f(source[0].data[r][c])}\n+ bias[${c}] ${f(source[1].data[0][c])}\n= ${f(value)}`;
      }else text=`${f(source[0].data[r][c])} + ${f(source[1].data[0][c])}\n= ${f(value)}`;
      text+=`\n\n偏置列 ${n.cols[c]} 广播到每个 token 行。`;break;
    }
    case 'scale':text=`${f(source[0].data[r][c])} × γ[${c}] ${f(source[1].data[0][c])}\n= ${f(value)}`;break;
    case 'mean':text=`(${source[0].data[r].map(f).join(' + ')}) / ${source[0].cols.length}\n= ${f(value)}`;break;
    case 'variance':{const mean=source[1].data[r][0];text=`μ = ${f(mean)}\n`+source[0].data[r].map(v=>`(${f(v)} − ${f(mean)})²`).join('\n+ ')+`\n以上之和 / ${source[0].cols.length}\n= ${f(value)}`;break;}
    case 'normalize':text=`x = ${f(source[0].data[r][c])}\nμ = ${f(source[1].data[r][0])}\nσ² = ${f(source[2].data[r][0])}\nε = 0.00001\n(x−μ)/√(σ²+ε)\n= ${f(value)}`;break;
    case 'divide':text=`${f(source[0].data[r][c])} / ${f(n.divisor)}\n= ${f(value)}`;break;
    case 'mask':text=c>r?'Key 位于 Query 的未来：\n这个位置设为 −∞。':`Key 位置 ${c} ≤ Query 位置 ${r}\n保留 ${f(value)}`;break;
    case 'softmax':{const input=source[0].data[r],max=Math.max(...input),ex=input.map(v=>Number.isFinite(v)?Math.exp(v-max):0),total=ex.reduce((s,v)=>s+v,0);text=`行最大值 m = ${f(max)}\nexp(xᵢ − m) = ${f(ex[c])}\n分母 = ${ex.map(f).join(' + ')}\n= ${f(total)}\npᵢ = ${f(ex[c])} / ${f(total)}\n= ${f(value)}\n本行概率和 = ${f(n.data[r].reduce((s,v)=>s+v,0))}`;break;}
    case 'gelu':text=`x = ${f(source[0].data[r][c])}\nGELU(x) = 0.5x ×\n[1+tanh(√(2/π)(x+0.044715x³))]\n= ${f(value)}`;break;
    case 'transpose':text=`Kᵀ[${r},${c}] = K[${c},${r}]\n= ${f(value)}\n交换轴，不重新学习数值。`;break;
    case 'concat':{const h=c<2?0:1,local=c%2;text=`取 Head ${h+1} Context[${r},${local}]\n= ${f(value)}\n按列拼接；保留两个头的特征顺序。`;break;}
    case 'last':text=`选择最终状态第 ${source[0].data.length-1} 行\nY[T−1, ${c}] = ${f(value)}`;break;
    case 'topk':text=Number.isFinite(value)?`候选 ${n.cols[c]} 在 Top-${state.trace.config.topK} 中\n保留 ${f(value)}`:`候选 ${n.cols[c]} 不在 Top-${state.trace.config.topK} 中\n设为 −∞，最终概率为 0。`;break;
    case 'parameter':text=`${n.title}[${r},${c}] = ${f(value)}\n行：${n.rows[r]}\n列：${n.cols[c]}\n\n${n.note||'固定生成的教学参数；真实模型中由训练学习得到。'}`;break;
    case 'position':text=`位置 i = ${r}，维度 d = ${c}\n${c%2===0?`sin(${r} / 10000^(${c}/4))`:`cos(${r} / 10000^(${c-1}/4))`}\n= ${f(value)}`;break;
    case 'embedding':text=`token = ${state.trace.tokens[r]}\nID = ${state.trace.ids[r]}\n按固定教学公式生成第 ${c} 维\n= ${f(value)}\n真实词向量通过词表查行取得。`;break;
    default:text=n.note||`第 ${r} 行、第 ${c} 列 = ${f(value)}`;
  }
  return text;
}
function renderInspector(){
  const s=state.selected;if(!s){$('#inspector').innerHTML='<p class="empty-hint">点击一个矩阵数值。<br>这里会展开计算，并高亮上游输入的行、列和参数。<br><br>蓝色卡片是参数，普通卡片是计算结果。</p>';return;}
  const n=state.byId[s.id],parents=[...n.inputs];if(n.operation==='bias'&&state.byId[n.inputs[0]]?.operation==='matmul')parents.push(...state.byId[n.inputs[0]].inputs);
$('#inspector').innerHTML=`<div class="selected-title">${esc(n.title)}</div><div class="kind-tag">${kindName[n.kind]}</div><div class="selected-value">${fmt(n.data[s.r][s.c])}</div><div class="location">[${s.r}, ${s.c}] · ${esc(n.rows[s.r])} / ${esc(n.cols[s.c])}</div><div class="axis-note">行：${esc(n.axes.rows)}<br>列：${esc(n.axes.cols)}</div>${n.formula?`<div class="inspector-formula">${esc(n.formula)}</div>`:''}<div class="breakdown">${esc(detail(n,s.r,s.c))}</div><div class="parents"><button data-locate="${n.id}">回到选中结果 ↩</button>${parents.map(id=>`<button data-locate="${id}">${esc(state.byId[id].title)} ↗</button>`).join('')}</div><p class="inspector-note">显示值已四舍五入，计算使用完整精度。${esc(n.note||'')}</p>`;
}
function involvedCells(n,r,c){
  const list=[],push=(id,rr,cc)=>list.push({id,r:rr,c:cc}),allRow=(id,rr)=>state.byId[id].data[rr].forEach((_,i)=>push(id,rr,i));
  switch(n.operation){
    case 'matmul':allRow(n.inputs[0],r);state.byId[n.inputs[1]].data.forEach((_,i)=>push(n.inputs[1],i,c));break;
    case 'mean':allRow(n.inputs[0],r);break;
    case 'variance':allRow(n.inputs[0],r);push(n.inputs[1],r,0);break;
    case 'softmax':allRow(n.inputs[0],r);break;
    case 'transpose':push(n.inputs[0],c,r);break;
    case 'concat':push(n.inputs[c<2?0:1],r,c%2);break;
    case 'last':push(n.inputs[0],state.byId[n.inputs[0]].data.length-1,c);break;
    case 'normalize':push(n.inputs[0],r,c);push(n.inputs[1],r,0);push(n.inputs[2],r,0);break;
    case 'bias':case 'scale':{
      push(n.inputs[0],r,c);push(n.inputs[1],0,c);
      const parent=state.byId[n.inputs[0]];
      if(n.operation==='bias'&&parent.operation==='matmul')list.push(...involvedCells(parent,r,c));
      break;
    }
    case 'divide':case 'topk':push(n.inputs[0],r,c);if(n.inputs[1])push(n.inputs[1],0,0);break;
    default:for(const id of n.inputs){const data=state.byId[id].data;if(data[r]?.[c]!==undefined)push(id,r,c);}
  }
  return list;
}
function applyHighlight(){
  document.querySelectorAll('.chosen,.paired,.related,.node-card.selected').forEach(el=>el.classList.remove('chosen','paired','related','selected'));
  const s=state.selected,parents=s?[...state.byId[s.id].inputs]:[],targets=new Set(s?[s.id]:[]);
  if(s&&state.byId[s.id].operation==='bias'){const parent=state.byId[parents[0]];if(parent?.operation==='matmul'){targets.add(parent.id);parents.push(...parent.inputs);}}
  document.querySelectorAll('.edge').forEach(el=>{const active=targets.has(el.dataset.target);el.classList.toggle('selected',!!s&&active);el.classList.toggle('dim',!!s&&!active);});
  if(!s)return;$(`[data-node-id="${s.id}"]`)?.classList.add('selected');document.querySelectorAll(`[data-node="${s.id}"][data-r="${s.r}"][data-c="${s.c}"]`).forEach(el=>el.classList.add('chosen'));
  for(const id of parents)$(`[data-node-id="${id}"]`)?.classList.add('related');
  for(const item of involvedCells(state.byId[s.id],s.r,s.c))document.querySelectorAll(`[data-node="${item.id}"][data-r="${item.r}"][data-c="${item.c}"]`).forEach(el=>el.classList.add('paired'));
}
function restoreSelection(){renderInspector();applyHighlight();}
function previewInput(){const text=$('#promptInput').value,tokens=TraceModel.tokenize(text),used=tokens.slice(0,8);$('#inputPreview').textContent=`Tokens (${used.length}${tokens.length>8?'/'+tokens.length:''}) · ${used.join(' | ')}${tokens.length>8?' · 超过 8 个，只使用前 8 个':''}${!text.trim()?' · 空输入按“空”演示':''}`;}
function stopAuto(){if(state.timer)clearInterval(state.timer);state.timer=null;$('#autoBtn').textContent='自动生成';}
function run(){
  stopAuto();state.trace=TraceModel.compute($('#promptInput').value,Number($('#tempInput').value),Number($('#topKInput').value));state.nodes=state.trace.graph.nodes;state.byId=Object.fromEntries(state.nodes.map(n=>[n.id,n]));state.selected=null;state.collapsed.clear();
  const requested=Number(new URLSearchParams(location.search).get('nodes'));state.cursor=Number.isFinite(requested)&&requested>0?Math.min(state.nodes.length-1,Math.floor(requested)-1):0;
  $('#stages').replaceChildren();$('#edges').replaceChildren();$('#dirtyNotice').hidden=true;previewInput();syncCards();renderInspector();$('#viewport').scrollTop=0;$('#viewport').scrollLeft=0;
  requestAnimationFrame(()=>focusNode('tokens'));
}
function next(){if(state.cursor>=state.nodes.length-1)return;state.cursor++;syncCards();if($('#followInput').checked)requestAnimationFrame(()=>focusNode(state.nodes[state.cursor].id));if(state.cursor===state.nodes.length-1)stopAuto();}
$('#stages').addEventListener('click',event=>{const toggle=event.target.closest('[data-collapse]');if(toggle){const id=toggle.dataset.collapse;if(state.collapsed.has(id))state.collapsed.delete(id);else state.collapsed.add(id);syncCards(true);return;}const cell=event.target.closest('button[data-cell]');if(!cell)return;stopAuto();state.selected={id:cell.dataset.node,r:Number(cell.dataset.r),c:Number(cell.dataset.c)};restoreSelection();});
$('#inspector').addEventListener('click',event=>{const button=event.target.closest('[data-locate]');if(button)focusNode(button.dataset.locate);});
$('#stepMap').addEventListener('click',event=>{const button=event.target.closest('[data-stage]');if(button)focusStage(button.dataset.stage);});
$('#clearBtn').onclick=()=>{state.selected=null;restoreSelection();};
$('#runBtn').onclick=()=>{try{run();}catch(error){notify(error.message);}};
$('#nextBtn').onclick=next;
$('#allBtn').onclick=()=>{stopAuto();state.cursor=state.nodes.length-1;syncCards();notify('完整计算已展开，可通过左侧步骤小地图定位。');};
$('#resetBtn').onclick=()=>{stopAuto();state.cursor=0;state.selected=null;$('#stages').replaceChildren();syncCards();$('#viewport').scrollTop=0;};
$('#autoBtn').onclick=()=>{if(state.timer){stopAuto();return;}state.timer=setInterval(next,1100);$('#autoBtn').textContent='暂停生成';next();};
$('#precisionInput').onchange=()=>{state.precision=Number($('#precisionInput').value);syncCards(true);renderInspector();};
for(const id of ['promptInput','tempInput','topKInput'])$('#'+id).addEventListener('input',()=>{previewInput();$('#tempValue').textContent=Number($('#tempInput').value).toFixed(1);$('#topKValue').textContent=$('#topKInput').value;$('#dirtyNotice').hidden=false;});
$('#promptInput').addEventListener('keydown',event=>{if(event.key==='Enter')$('#runBtn').click();});
$('#zoomOut').onclick=()=>setZoom(state.zoom-.1);$('#zoomIn').onclick=()=>setZoom(state.zoom+.1);
$('#fitBtn').onclick=()=>{const id=state.focusStep||state.nodes[state.cursor].step,current=$('#stage-'+id);if(current){setZoom(Math.min(1,($('#viewport').clientWidth-60)/$('#graphCanvas').offsetWidth));requestAnimationFrame(()=>focusStage(id));}};
$('#latestBtn').onclick=()=>focusNode(state.nodes[state.cursor].id);
$('#exportBtn').onclick=()=>{const json=JSON.stringify(state.trace,(_,v)=>v===-Infinity?'-Infinity':v,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='transformer-trace-complete.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#helpBtn').onclick=()=>$('#helpDialog').showModal();$('#closeHelp').onclick=()=>$('#helpDialog').close();
document.addEventListener('keydown',event=>{if(event.target.matches('input,select,textarea,button')||$('#helpDialog').open)return;if(event.code==='Space'){state.space=true;event.preventDefault();}if(event.key==='ArrowRight')next();});
document.addEventListener('keyup',event=>{if(event.code==='Space')state.space=false;});
window.addEventListener('blur',()=>{state.space=false;state.drag=null;$('#viewport').classList.remove('panning');});
$('#viewport').addEventListener('pointerdown',event=>{if(!state.space||event.target.closest('button'))return;state.drag={x:event.clientX,y:event.clientY,left:$('#viewport').scrollLeft,top:$('#viewport').scrollTop};$('#viewport').setPointerCapture(event.pointerId);$('#viewport').classList.add('panning');event.preventDefault();});
$('#viewport').addEventListener('pointermove',event=>{if(!state.drag)return;$('#viewport').scrollLeft=state.drag.left+state.drag.x-event.clientX;$('#viewport').scrollTop=state.drag.top+state.drag.y-event.clientY;});
$('#viewport').addEventListener('pointerup',()=>{state.drag=null;$('#viewport').classList.remove('panning');});
window.addEventListener('resize',()=>requestAnimationFrame(()=>{sizeSurface();drawEdges();}));
run();
