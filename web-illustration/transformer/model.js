/* Fixed teaching model. Every tensor has a stable ID and explicit dependencies. */
(function(root){
  'use strict';
  const D=4,DH=2,FF=8,VOCAB=['数据','模型','帮助','我们','理解','世界','学习','。'];
  const feature=['d₀','d₁','d₂','d₃'];
  const weight=(rows,cols,seed,scale=.55)=>Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>scale*Math.sin((i+1)*(j+1)*(seed+.37))+scale*.35*Math.cos((i+j+2)*(seed+.71))));
  const vector=(n,seed,scale=.25)=>Array.from({length:n},(_,i)=>scale*Math.sin((i+1)*(seed+.83)));
  const mm=(a,b)=>a.map(row=>b[0].map((_,c)=>row.reduce((s,v,k)=>s+v*b[k][c],0)));
  const sum=(a,b)=>a.map((row,r)=>row.map((v,c)=>v+b[r][c]));
  const bias=(a,b)=>a.map(row=>row.map((v,c)=>v+b[c]));
  const trans=a=>a[0].map((_,c)=>a.map(row=>row[c]));
  const sm=row=>{const max=Math.max(...row),ex=row.map(v=>Number.isFinite(v)?Math.exp(v-max):0),total=ex.reduce((s,v)=>s+v,0);return ex.map(v=>v/total);};
  const gelu=x=>.5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x**3)));
  function tokenize(text){const clean=text.trim()||'空';if(/\s/.test(clean))return clean.split(/\s+/).filter(Boolean);if(/^[\u3400-\u9fff]+$/.test(clean))return [...clean];return clean.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)||[clean];}
  function hash(token){let h=2166136261;for(const ch of token){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0)%10007;}
  function ln(a,g,b){const mean=a.map(row=>[row.reduce((s,v)=>s+v,0)/row.length]),variance=a.map((row,r)=>[row.reduce((s,v)=>s+(v-mean[r][0])**2,0)/row.length]),normalized=a.map((row,r)=>row.map(v=>(v-mean[r][0])/Math.sqrt(variance[r][0]+1e-5))),output=normalized.map(row=>row.map((v,c)=>v*g[c]+b[c]));return {mean,variance,normalized,output};}
  function compute(text,temperature=1,topK=4){
    if(!Number.isFinite(temperature)||temperature<=0)throw new Error('Temperature 必须大于 0');
    if(!Number.isInteger(topK)||topK<1||topK>8)throw new Error('Top-k 必须为 1–8');
    const allTokens=tokenize(text),tokens=allTokens.slice(0,8),ids=tokens.map(hash),T=tokens.length;
    const tokEmb=ids.map(id=>feature.map((_,j)=>.62*Math.sin((id%997+1)*(j+1)*.017)+.18*Math.cos((id%89+j+1)*.13)));
    const posEmb=tokens.map((_,i)=>feature.map((_,j)=>j%2===0?Math.sin(i/10000**(j/D)):Math.cos(i/10000**((j-1)/D))));
    const params={Wq:weight(D,D,1.1),Wk:weight(D,D,2.1),Wv:weight(D,D,3.1),bq:vector(D,1),bk:vector(D,2),bv:vector(D,3),Wo:weight(D,D,4.1,.42),bo:vector(D,4,.12),W1:weight(D,FF,5.1,.38),b1:vector(FF,5,.1),W2:weight(FF,D,6.1,.31),b2:vector(D,6,.08),Wout:weight(D,VOCAB.length,7.1,.48),bout:vector(VOCAB.length,7,.08),gamma1:[.92,1.06,.97,1.03],beta1:[.02,-.01,.03,-.02],gamma2:[1.04,.95,1.02,.99],beta2:[-.02,.02,0,.01],gammaFinal:[1,1.03,.98,1.01],betaFinal:[0,.01,-.01,.02]};
    const x0=sum(tokEmb,posEmb),ln1=ln(x0,params.gamma1,params.beta1);
    const qh=[],kh=[],vh=[],raw=[],scaled=[],masked=[],probs=[],contexts=[];
    for(let h=0;h<2;h++){
      for(const name of ['q','k','v']){params['W'+name+(h+1)]=params['W'+name].map(row=>row.slice(h*DH,(h+1)*DH));params['b'+name+(h+1)]=params['b'+name].slice(h*DH,(h+1)*DH);}
      qh[h]=bias(mm(ln1.output,params['Wq'+(h+1)]),params['bq'+(h+1)]);kh[h]=bias(mm(ln1.output,params['Wk'+(h+1)]),params['bk'+(h+1)]);vh[h]=bias(mm(ln1.output,params['Wv'+(h+1)]),params['bv'+(h+1)]);
      raw[h]=mm(qh[h],trans(kh[h]));scaled[h]=raw[h].map(row=>row.map(v=>v/Math.sqrt(DH)));masked[h]=scaled[h].map((row,r)=>row.map((v,c)=>c>r?-Infinity:v));probs[h]=masked[h].map(sm);contexts[h]=mm(probs[h],vh[h]);
    }
    const combine=heads=>heads[0].map((row,r)=>[...row,...heads[1][r]]),Q=combine(qh),K=combine(kh),V=combine(vh),concat=combine(contexts);
    const projected=bias(mm(concat,params.Wo),params.bo),res1=sum(x0,projected),ln2=ln(res1,params.gamma2,params.beta2),fc1=bias(mm(ln2.output,params.W1),params.b1),activated=fc1.map(row=>row.map(gelu)),fc2=bias(mm(activated,params.W2),params.b2),res2=sum(res1,fc2),lnf=ln(res2,params.gammaFinal,params.betaFinal),last=[lnf.output[T-1]],logits=bias(mm(last,params.Wout),params.bout)[0],scaledLogits=logits.map(v=>v/temperature);
    const keep=new Set(scaledLogits.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v).slice(0,topK).map(item=>item.i)),filtered=scaledLogits.map((v,i)=>keep.has(i)?v:-Infinity),probabilities=sm(filtered);
    const tensors={tokEmb,posEmb,x0,ln1,Q,K,V,Q1:qh[0],Q2:qh[1],K1:kh[0],K2:kh[1],V1:vh[0],V2:vh[1],raw,scaled,masked,probs,contexts,concat,projected,res1,ln2,fc1,activated,fc2,res2,lnf,logits,scaledLogits,filtered,probabilities};
    const graph=buildGraph({tokens,ids,params,tensors,temperature,topK});
    return {schemaVersion:2,config:{D,HEADS:2,DH,FF,temperature,topK,epsilon:1e-5,positionEncoding:'sin/cos, base 10000',tokenizer:'FNV1a codepoint hash mod 10007; max 8 tokens',tokenEmbedding:'0.62 sin((id%997+1)(d+1)0.017)+0.18 cos((id%89+d+1)0.13)',parameterMode:'fixed-generated-teaching-values',sourceCommit:'0ebc465bad6ad6d019a60903935d5fd75942ed57'},input:text,tokens,ids,inputInfo:{totalTokens:allTokens.length,truncated:allTokens.length>T,empty:!text.trim()},params,weights:params,tensors,graph};
  }
  function buildGraph({tokens,ids,params:p,tensors:t,temperature,topK}){
    const tokenRows=tokens.map((v,i)=>`${i}:${v}`),hidden=feature,mid=Array.from({length:8},(_,i)=>`f${i}`),nodes=[],steps=[],byId={};
    let current;
    const step=(id,title,note)=>{current={id,title,note,rows:[]};steps.push(current);};
    function node(id,title,data,rows,cols,inputs=[],operation='identity',extra={}){
      const n={id,title,data,rows,cols,inputs,operation,kind:'result',step:current.id,head:0,axes:{rows:'token 位置',cols:'hidden 特征'},...extra};nodes.push(n);byId[id]=n;return n;
    }
    const row=(output,parameters=[],head=0)=>current.rows.push({output,parameters,head});
    function parameter(id,title,value,inputCols,outputCols,note,head=0){return node(id,title,value,inputCols,outputCols,[],'parameter',{kind:'parameter',head,note,axes:{rows:'输入特征',cols:'输出特征'},parameterKey:id});}
    const vectorNode=(id,title,value,cols,note,head=0)=>node(id,title,[value],['共享'],cols,[],'parameter',{kind:'parameter',head,note,parameterKey:id,axes:{rows:'一份共享向量',cols:'对应输出特征'}});
    function linear(id,name,input,w,b,cols,head=0){
      const source=byId[input],inputFeatures=source.cols;
      const wNode=parameter(w,w,p[w],inputFeatures,cols,'每个元素是输入维度对输出维度的线性贡献系数。真实模型中由训练学习；这里使用固定生成值。',head);
      const axes={rows:id==='logits'?'最后 token 的预测':'token 位置',cols:id==='logits'?'候选 token':head?`Head ${head} 输出特征`:'输出特征'};
      const product=node(id+'.product',name+' · 矩阵乘积',mm(source.data,p[w]),source.rows,cols,[input,w],'matmul',{head,axes,formula:`${source.title} × ${w}`});row(product.id,[wNode.id],head);
      const bNode=vectorNode(b,b,p[b],cols,'沿所有 token 行广播相加；每个输出特征共用一份偏置。',head);
      const result=node(id,name,bias(product.data,p[b]),source.rows,cols,[product.id,b],'bias',{head,axes,formula:`矩阵乘积 + ${b}（逐行广播）`});row(result.id,[bNode.id],head);return result;
    }
    function normalization(id,name,input,g,b,stored){
      const source=byId[input];
      const mean=node(id+'.mean',name+' · 均值 μ',stored.mean,tokenRows,['μ'],[input],'mean',{formula:'沿每个 token 的特征维求均值',axes:{rows:'token 位置',cols:'每行均值'}});row(mean.id);
      const variance=node(id+'.variance',name+' · 方差 σ²',stored.variance,tokenRows,['σ²'],[input,mean.id],'variance',{formula:'Σ(x − μ)² / 4',axes:{rows:'token 位置',cols:'每行总体方差'}});row(variance.id);
      const norm=node(id+'.normalized',name+' · 标准化',stored.normalized,tokenRows,hidden,[input,mean.id,variance.id],'normalize',{formula:'(x − μ) / √(σ² + 0.00001)'});row(norm.id);
      vectorNode(g,'γ · 逐维尺度',p[g],hidden,'逐 hidden 特征缩放，同一层所有 token 共享；γ 是参数，均值和方差是计算结果。');
      const scaled=node(id+'.scaled',name+' · 缩放',norm.data.map(r=>r.map((v,c)=>v*p[g][c])),tokenRows,hidden,[norm.id,g],'scale',{formula:'标准化结果 ⊙ γ'});row(scaled.id,[g]);
      vectorNode(b,'β · 逐维偏移',p[b],hidden,'逐 hidden 特征平移，沿 token 行广播；真实模型中由训练学习。');
      const out=node(id,name+' 输出',stored.output,tokenRows,hidden,[scaled.id,b],'bias',{formula:'缩放结果 + β'});row(out.id,[b]);return out;
    }
    step('token','01 · Tokenization','先把输入映射为 token ID。最多使用 8 个 token，ID 是查向量的地址。');
    node('tokens','Token IDs',ids.map(v=>[v]),tokenRows,['ID'],[],'input',{kind:'input',axes:{rows:'输入 token',cols:'固定哈希 ID'},note:'教学分词与哈希规则，不是 GPT-2 BPE。'});row('tokens');
    step('embed','02 · Token + Position Embedding','同一坐标逐元素相加。位置编码是固定 sin/cos 规则，词向量是固定生成的教学数值。');
    node('tokEmb','Token 向量',t.tokEmb,tokenRows,hidden,['tokens'],'embedding',{kind:'parameter',axes:{rows:'当前 token 查出的词表行',cols:'hidden 特征'},note:'这里只展示当前输入查出的行；真实模型中的整张词表嵌入由训练学习。'});row('tokEmb');
    node('posEmb','位置编码',t.posEmb,tokenRows,hidden,[],'position',{kind:'constant',axes:{rows:'序列位置',cols:'sin/cos 特征'},note:'由位置和维度生成，不是学习参数。'});
    node('x0','输入结构矩阵 X₀',t.x0,tokenRows,hidden,['tokEmb','posEmb'],'add',{formula:'Token 向量 + 位置编码'});row('x0',['posEmb']);
    step('ln1','03 · LayerNorm 1','每个 token 独立归一化，不混合 token。依次展示均值、方差、标准化、γ 缩放和 β 平移。');normalization('ln1','LN₁','x0','gamma1','beta1',t.ln1);
    step('qkv','04 · 两头 Q / K / V 投影','左右两个头各用独立参数。每个投影分开显示矩阵乘积与加 bias 的结果。');
    for(let h=1;h<=2;h++)for(const letter of ['q','k','v'])linear(letter.toUpperCase()+h,letter.toUpperCase()+h,'ln1','W'+letter+h,'b'+letter+h,[`h${h}d₀`,`h${h}d₁`],h);
    step('attention','05 · Masked Self-Attention','每行是 Query token，每列是 Key token。V 沿旁路进入 Context，未来位置被 Mask。');
    for(let h=1;h<=2;h++){
      const hi=h-1;
      node('Kt'+h,'K'+h+'ᵀ',trans(t['K'+h]),byId['K'+h].cols,tokenRows,['K'+h],'transpose',{head:h,axes:{rows:'Head 特征',cols:'Key token'},formula:'交换 K 的行轴与列轴'});row('Kt'+h,[],h);
      node('raw'+h,'QKᵀ · Head '+h,t.raw[hi],tokenRows,tokenRows,['Q'+h,'Kt'+h],'matmul',{head:h,axes:{rows:'Query token',cols:'Key token'},formula:'Q × Kᵀ'});row('raw'+h,[],h);
      node('scaled'+h,'缩放分数 · Head '+h,t.scaled[hi],tokenRows,tokenRows,['raw'+h],'divide',{head:h,divisor:Math.sqrt(2),axes:{rows:'Query token',cols:'Key token'},formula:'QKᵀ / √2'});row('scaled'+h,[],h);
      node('mask'+h,'Causal Mask · Head '+h,t.masked[hi],tokenRows,tokenRows,['scaled'+h],'mask',{head:h,axes:{rows:'Query token',cols:'Key token'},formula:'未来位置设为 −∞'});row('mask'+h,[],h);
      node('attention'+h,'Attention · Head '+h,t.probs[hi],tokenRows,tokenRows,['mask'+h],'softmax',{head:h,axes:{rows:'Query token',cols:'Key token'},formula:'逐行稳定 Softmax'});row('attention'+h,[],h);
      node('context'+h,'Context · Head '+h,t.contexts[hi],tokenRows,[`h${h}d₀`,`h${h}d₁`],['attention'+h,'V'+h],'matmul',{head:h,formula:'Attention × V'});row('context'+h,[],h);
    }
    step('project','06 · Concat + 输出投影','按特征列拼接两个头，再混合回 hidden 空间。');
    node('concat','拼接后的 Context',t.concat,tokenRows,['h1d₀','h1d₁','h2d₀','h2d₁'],['context1','context2'],'concat',{formula:'Concat(axis = feature)'});row('concat');linear('projected','Attention 输出','concat','Wo','bo',hidden);
    step('res1','07 · Residual Addition 1','保留 X₀ 的旁路，逐元素加上 Attention 输出。');node('res1','残差 R₁',t.res1,tokenRows,hidden,['x0','projected'],'add',{formula:'X₀ + Attention 输出'});row('res1');
    step('ln2','08 · LayerNorm 2','与 LN₁ 使用相同的展开结构，参数 γ₂、β₂ 独立。');normalization('ln2','LN₂','res1','gamma2','beta2',t.ln2);
    step('mlp','09 · MLP · 4 → 8 → 4','每个 token 独立变换。Linear 1 的最终结果进入 GELU；W₁ 只进入矩阵乘法。');linear('fc1','Linear 1','ln2','W1','b1',mid);
    node('activated','GELU',t.activated,tokenRows,mid,['fc1'],'gelu',{axes:{rows:'token 位置',cols:'MLP 中间特征 f₀…f₇'},formula:'0.5x[1+tanh(√(2/π)(x+0.044715x³))]'});row('activated');linear('fc2','Linear 2','activated','W2','b2',hidden);
    step('res2','10 · Residual Addition 2','保留 R₁ 旁路，加上 MLP 输出。');node('res2','Block 输出 R₂',t.res2,tokenRows,hidden,['res1','fc2'],'add',{formula:'R₁ + Linear 2'});row('res2');
    step('lnf','11 · Final LayerNorm','最后一次归一化完整展示，同样包含独立的 γ、β。');normalization('lnf','Final LN','res2','gammaFinal','betaFinal',t.lnf);
    step('logits','12 · 词表投影','明确取最后一个 token 的行，再投影到 8 个候选词。教学输出矩阵独立且有 bias。');
    node('last','最后 token 的状态',[t.lnf.output.at(-1)],[tokenRows.at(-1)],hidden,['lnf'],'last',{formula:'Y[T−1, :]'});row('last');linear('logits','Logits','last','Wout','bout',VOCAB);
    step('sampling','13 · Temperature · Top-k · Softmax','明确显示缩放、保留候选和最终概率。Temperature / Top-k 是用户设置。');
    node('temperature','Temperature',[[temperature]],['设置'],['T'],[],'constant',{kind:'setting',axes:{rows:'用户设置',cols:'温度'},note:'大于 0；较低的温度让分布更尖锐。'});
    node('scaledLogits','温度缩放后的 logits',[t.scaledLogits],['候选'],VOCAB,['logits','temperature'],'divide',{divisor:temperature,formula:'logits / Temperature',axes:{rows:'最后 token 的预测',cols:'候选 token'}});row('scaledLogits',['temperature']);
    node('topK','Top-k',[[topK]],['设置'],['k'],[],'constant',{kind:'setting',axes:{rows:'用户设置',cols:'保留候选数'}});
    node('filtered','Top-k 过滤后的 logits',[t.filtered],['候选'],VOCAB,['scaledLogits','topK'],'topk',{formula:'仅保留得分最高的 k 个候选，其余 −∞',axes:{rows:'最后 token 的预测',cols:'候选 token'}});row('filtered',['topK']);
    node('probabilities','下一 token 概率',[t.probabilities],['概率'],VOCAB,['filtered'],'softmax',{formula:'稳定 Softmax；概率总和 = 1',axes:{rows:'最后 token 的预测',cols:'候选 token'}});row('probabilities');
    return {nodes,steps};
  }
  const api={compute,tokenize,hash,mm,ln,gelu,softmax:sm};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.TraceModel=api;
})(typeof window==='object'?window:globalThis);
