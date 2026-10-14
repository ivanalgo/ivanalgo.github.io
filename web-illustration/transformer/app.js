"use strict";

const D = 4, HEADS = 2, DH = 2, FF = 8;
const OUTPUT_VOCAB = ["数据", "模型", "帮助", "我们", "理解", "世界", "学习", "。"];
const $ = (s) => document.querySelector(s);
const fmt = (x) => Number.isFinite(x) ? Number(x).toFixed(state.precision) : (x === -Infinity ? "−∞" : String(x));
const clone = (x) => JSON.parse(JSON.stringify(x, (_, v) => v === -Infinity ? "-Infinity" : v));

const state = { steps: [], timeline: [], nodeCursor: 0, step: 0, view: 0, maxVisited: 0, precision: 3, trace: null };
window.__traceLab = state;
const FLOW = ["Token", "Embed", "LN₁", "QKV", "Attention", "Project", "Residual", "LN₂", "MLP", "Residual", "LN final", "Logits", "Softmax"];

function tokenize(text) {
  const clean = text.trim() || "空";
  if (/\s/.test(clean)) return clean.split(/\s+/).filter(Boolean).slice(0, 8);
  if (/^[\u3400-\u9fff]+$/.test(clean)) return [...clean].slice(0, 8);
  return (clean.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [clean]).slice(0, 8);
}
function hashToken(token) {
  let h = 2166136261;
  for (const ch of token) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 10007;
}
function weight(rows, cols, seed, scale = .55) {
  return Array.from({length: rows}, (_, i) => Array.from({length: cols}, (_, j) =>
    scale * Math.sin((i + 1) * (j + 1) * (seed + .37)) + scale * .35 * Math.cos((i + j + 2) * (seed + .71))));
}
function vec(n, seed, scale = .25) { return Array.from({length:n}, (_, i) => scale * Math.sin((i + 1) * (seed + .83))); }
function add(a,b) { return a.map((r,i) => r.map((v,j) => v + b[i][j])); }
function matmul(a,b) { return a.map(row => b[0].map((_,j) => row.reduce((s,v,k) => s + v*b[k][j], 0))); }
function addBias(a,b) { return a.map(row => row.map((v,j) => v+b[j])); }
function transpose(a) { return a[0].map((_,j) => a.map(r => r[j])); }
function softmaxRows(a) { return a.map(row => { const finite=row.filter(Number.isFinite); const m=Math.max(...finite); const ex=row.map(v=>Number.isFinite(v)?Math.exp(v-m):0); const s=ex.reduce((x,y)=>x+y,0); return ex.map(v=>v/s); }); }
function layerNorm(a, gamma, beta) {
  const mean=a.map(r=>r.reduce((x,y)=>x+y,0)/r.length);
  const variance=a.map((r,i)=>r.reduce((s,x)=>s+(x-mean[i])**2,0)/r.length);
  const normalized=a.map((r,i)=>r.map(x=>(x-mean[i])/Math.sqrt(variance[i]+1e-5)));
  const output=normalized.map(r=>r.map((x,j)=>x*gamma[j]+beta[j]));
  return {mean:mean.map(x=>[x]), variance:variance.map(x=>[x]), normalized, output};
}
function gelu(x) { return .5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x**3))); }
function splitHeads(x) { return Array.from({length:HEADS},(_,h)=>x.map(r=>r.slice(h*DH,(h+1)*DH))); }
function concatHeads(heads) { return heads[0].map((_,i)=>heads.flatMap(h=>h[i])); }

function step(id, title, group, description, formula, intuition, gpt, views) {
  return {id,title,group,description,formula,intuition,gpt,views};
}
function matrixView(name, data, rowLabels, colLabels, detail) { return {type:"matrix",name,data,rowLabels,colLabels,detail}; }
function embeddingSumView(tokenData,positionData,resultData,rowLabels,colLabels) {
  return {type:"embedding-sum",name:"逐元素相加",tokenData,positionData,resultData,rowLabels,colLabels};
}

function runTrace(text, temperature, topK) {
  const tokens=tokenize(text), ids=tokens.map(hashToken), T=tokens.length;
  const tokEmb=ids.map(id=>Array.from({length:D},(_,j)=>.62*Math.sin((id%997+1)*(j+1)*.017)+.18*Math.cos((id%89+j+1)*.13)));
  const posEmb=tokens.map((_,i)=>Array.from({length:D},(_,j)=> j%2===0?Math.sin(i/Math.pow(10000,j/D)):Math.cos(i/Math.pow(10000,(j-1)/D))));
  const x0=add(tokEmb,posEmb);
  const gamma1=[.92,1.06,.97,1.03], beta1=[.02,-.01,.03,-.02];
  const ln1=layerNorm(x0,gamma1,beta1);
  const Wq=weight(D,D,1.1), Wk=weight(D,D,2.1), Wv=weight(D,D,3.1);
  const bq=vec(D,1), bk=vec(D,2), bv=vec(D,3);
  const splitWeight=w=>[w.map(row=>row.slice(0,DH)),w.map(row=>row.slice(DH,DH*2))];
  const [Wq1,Wq2]=splitWeight(Wq), [Wk1,Wk2]=splitWeight(Wk), [Wv1,Wv2]=splitWeight(Wv);
  const [bq1,bq2]=[bq.slice(0,DH),bq.slice(DH)], [bk1,bk2]=[bk.slice(0,DH),bk.slice(DH)], [bv1,bv2]=[bv.slice(0,DH),bv.slice(DH)];
  const Q1=addBias(matmul(ln1.output,Wq1),bq1), K1=addBias(matmul(ln1.output,Wk1),bk1), V1=addBias(matmul(ln1.output,Wv1),bv1);
  const Q2=addBias(matmul(ln1.output,Wq2),bq2), K2=addBias(matmul(ln1.output,Wk2),bk2), V2=addBias(matmul(ln1.output,Wv2),bv2);
  const Q=Q1.map((row,i)=>[...row,...Q2[i]]), K=K1.map((row,i)=>[...row,...K2[i]]), V=V1.map((row,i)=>[...row,...V2[i]]);
  const qh=splitHeads(Q), kh=splitHeads(K), vh=splitHeads(V);
  const raw=[], scaled=[], masked=[], probs=[], contexts=[];
  for(let h=0;h<HEADS;h++) {
    raw[h]=matmul(qh[h],transpose(kh[h]));
    scaled[h]=raw[h].map(r=>r.map(v=>v/Math.sqrt(DH)));
    masked[h]=scaled[h].map((r,i)=>r.map((v,j)=>j>i?-Infinity:v));
    probs[h]=softmaxRows(masked[h]);
    contexts[h]=matmul(probs[h],vh[h]);
  }
  const concat=concatHeads(contexts), Wo=weight(D,D,4.1,.42), bo=vec(D,4,.12);
  const projected=addBias(matmul(concat,Wo),bo), res1=add(x0,projected);
  const ln2=layerNorm(res1,[1.04,.95,1.02,.99],[-.02,.02,0,.01]);
  const W1=weight(D,FF,5.1,.38), b1=vec(FF,5,.1), fc1=addBias(matmul(ln2.output,W1),b1);
  const activated=fc1.map(r=>r.map(gelu)), W2=weight(FF,D,6.1,.31), b2=vec(D,6,.08), fc2=addBias(matmul(activated,W2),b2);
  const res2=add(res1,fc2), lnf=layerNorm(res2,[1,1.03,.98,1.01],[0,.01,-.01,.02]);
  const last=lnf.output[T-1];
  const Wout=weight(D,OUTPUT_VOCAB.length,7.1,.48), bout=vec(OUTPUT_VOCAB.length,7,.08);
  const logits=addBias(matmul([last],Wout),bout)[0], scaledLogits=logits.map(x=>x/temperature);
  const order=scaledLogits.map((x,i)=>({x,i})).sort((a,b)=>b.x-a.x);
  const keep=new Set(order.slice(0,topK).map(x=>x.i));
  const filtered=scaledLogits.map((x,i)=>keep.has(i)?x:-Infinity);
  const probabilities=softmaxRows([filtered])[0];

  const featureLabels=["d₀","d₁","d₂","d₃"], tokenLabels=tokens.map((t,i)=>`${i}:${t}`);
  const dotDetail=(left,right,bias=0,label="")=>(r,c)=>{
    const biasValue=Array.isArray(bias)?bias[c]:bias;
    return ({
    value: matmul(left,right)[r][c]+biasValue,
    location:`${label}[${r}, ${c}]`,
    text:`${left[r].map((v,k)=>`${fmt(v)} × ${fmt(right[k][c])}`).join(" + ")}${biasValue?` + bias ${fmt(biasValue)}`:""}\n= ${fmt(matmul(left,right)[r][c]+biasValue)}`
  })};
  const directDetail=(name,data)=>(r,c)=>({value:data[r][c],location:`${name}[${r}, ${c}]`,text:`该值是 ${name} 张量在第 ${r} 行、第 ${c} 列的输出。`});
  const lnDetail=(name,input,ln)=>(r,c)=>({value:ln.output[r][c],location:`${name}[${r}, ${c}]`,text:`x = ${fmt(input[r][c])}\nμ = ${fmt(ln.mean[r][0])}\nσ² = ${fmt(ln.variance[r][0])}\n(x−μ)/√(σ²+ε) = ${fmt(ln.normalized[r][c])}\n仿射变换后 = ${fmt(ln.output[r][c])}`});

  const steps=[];
  steps.push(step("token","Tokenization","Token","将文本切成 token，并把每个 token 映射为稳定整数 ID。","tokens = tokenize(text)\nid = FNV1a(token) mod 10007","模型只能处理整数；token ID 是查找向量的地址，而不是 token 的含义。","GPT‑2 使用 BPE 词表 50,257；这里采用可复现的教学 tokenizer。",[
    {type:"tokens",name:"Tokens 与 IDs",tokens,ids}
  ]));
  steps.push(step("embed","Token + Position Embedding","Embed","把 Token 向量矩阵与位置矩阵按相同坐标逐元素相加，得到输入结构矩阵 X₀。","X₀[i,d] = E_token[tokenᵢ,d] + E_pos[i,d]","同一个词出现在不同位置时，需要得到不同的初始表示。三张矩阵并排可以直接核对每一个坐标。","GPT‑2: [T,768] + [T,768] = [T,768]；这里完整展示 [T,4]。",[
    embeddingSumView(tokEmb,posEmb,x0,tokenLabels,featureLabels)
  ]));
  steps.push(step("ln1","LayerNorm 1","LN₁","对每个 token 的特征独立计算均值和方差，再进行归一化与仿射变换。","LN(x) = γ ⊙ (x−μ)/√(σ²+ε) + β","LayerNorm 不混合 token，只调整每个 token 内部四个特征的尺度。","GPT‑2 每个 block 使用两次 LayerNorm，均沿 768 维计算。",[
    matrixView("Mean μ",ln1.mean,tokenLabels,["μ"],directDetail("mean",ln1.mean)),
    matrixView("Variance σ²",ln1.variance,tokenLabels,["σ²"],directDetail("variance",ln1.variance)),
    matrixView("Normalized",ln1.normalized,tokenLabels,featureLabels,directDetail("normalized",ln1.normalized)),
    matrixView("LayerNorm output",ln1.output,tokenLabels,featureLabels,lnDetail("LN₁",x0,ln1))
  ]));
  steps.push(step("qkv","Per-head Q / K / V Projection","QKV","将 LayerNorm 1 输出分别与两个头的六个权重矩阵相乘，再加对应 bias，得到每个头独立的 Q、K、V。","Qₕ=XWqₕ+bqₕ   Kₕ=XWkₕ+bkₕ   Vₕ=XWvₕ+bvₕ","每个注意力头拥有独立的 Q/K/V 投影子空间；六组投影并行计算。","GPT‑2 通常把所有头的 Q/K/V 权重合并存储；这里按列拆开，显式展示两个头。",[
    matrixView("Wq₁ · Head 1",Wq1,featureLabels,["h1d₀","h1d₁"],directDetail("Wq₁",Wq1)),
    matrixView("Wk₁ · Head 1",Wk1,featureLabels,["h1d₀","h1d₁"],directDetail("Wk₁",Wk1)),
    matrixView("Wv₁ · Head 1",Wv1,featureLabels,["h1d₀","h1d₁"],directDetail("Wv₁",Wv1)),
    matrixView("Wq₂ · Head 2",Wq2,featureLabels,["h2d₀","h2d₁"],directDetail("Wq₂",Wq2)),
    matrixView("Wk₂ · Head 2",Wk2,featureLabels,["h2d₀","h2d₁"],directDetail("Wk₂",Wk2)),
    matrixView("Wv₂ · Head 2",Wv2,featureLabels,["h2d₀","h2d₁"],directDetail("Wv₂",Wv2)),
    matrixView("Q₁",Q1,tokenLabels,["h1d₀","h1d₁"],dotDetail(ln1.output,Wq1,bq1,"Q₁")),
    matrixView("K₁",K1,tokenLabels,["h1d₀","h1d₁"],dotDetail(ln1.output,Wk1,bk1,"K₁")),
    matrixView("V₁",V1,tokenLabels,["h1d₀","h1d₁"],dotDetail(ln1.output,Wv1,bv1,"V₁")),
    matrixView("Q₂",Q2,tokenLabels,["h2d₀","h2d₁"],dotDetail(ln1.output,Wq2,bq2,"Q₂")),
    matrixView("K₂",K2,tokenLabels,["h2d₀","h2d₁"],dotDetail(ln1.output,Wk2,bk2,"K₂")),
    matrixView("V₂",V2,tokenLabels,["h2d₀","h2d₁"],dotDetail(ln1.output,Wv2,bv2,"V₂"))
  ]));
  const labels=tokenLabels;
  const attentionViews=[
    ["QKᵀ raw",raw,(h,r,c)=>({value:raw[h][r][c],location:`Head ${h+1} · score[${r},${c}]`,text:`${qh[h][r].map((v,k)=>`${fmt(v)} × ${fmt(kh[h][c][k])}`).join(" + ")}\n= ${fmt(raw[h][r][c])}`})],
    ["Scaled",scaled,(h,r,c)=>({value:scaled[h][r][c],location:`Head ${h+1} · scaled[${r},${c}]`,text:`${fmt(raw[h][r][c])} ÷ √${DH}\n= ${fmt(scaled[h][r][c])}`})],
    ["Causal mask",masked,(h,r,c)=>({value:masked[h][r][c],location:`Head ${h+1} · masked[${r},${c}]`,text:c>r?"该位置在当前 token 的未来，被设为 −∞。":`允许访问：保留 ${fmt(scaled[h][r][c])}`})],
    ["Softmax attention",probs,(h,r,c)=>({value:probs[h][r][c],location:`Head ${h+1} · attention[${r},${c}]`,text:`exp(${fmt(masked[h][r][c])}) ÷ Σ exp(row ${r})\n= ${fmt(probs[h][r][c])}`})],
    ["Attention × V",contexts,(h,r,c)=>({value:contexts[h][r][c],location:`Head ${h+1} · context[${r},${c}]`,text:`${probs[h][r].map((v,k)=>`${fmt(v)} × ${fmt(vh[h][k][c])}`).join(" + ")}\n= ${fmt(contexts[h][r][c])}`})]
  ].map(([name,data,detail])=>({type:"dual-head",name,heads:[0,1].map(h=>matrixView(`Head ${h+1} · ${name}`,data[h],labels,name==="Attention × V"?[`h${h}d₀`,`h${h}d₁`]:labels,(r,c)=>detail(h,r,c)))}));
  steps.push(step("attention","Masked Self-Attention · Head 1 + Head 2","Attention","两个注意力头并行计算 token 两两相关性，并通过因果 Mask 禁止读取未来；左侧为 Head 1，右侧为 Head 2。",`Aₕ = softmax(mask(QₕKₕᵀ/√${DH}))\nContextₕ = Aₕ·Vₕ`,"两个头使用不同投影子空间并行观察不同关系；每一行 Softmax 后之和等于 1。","GPT‑2 每头维度 64、共 12 头；这里并排完整展示两个维度为 2 的注意力头。",attentionViews));
  steps.push(step("project","Concatenate + Output Projection","Project","拼接两个头的 Context，再用输出矩阵混合各头信息。","O = Concat(head₁, head₂)Wo + bo","多头先并行观察不同关系，再在这里合并回统一特征空间。","GPT‑2 拼接 12×64=768，再投影到 768。",[
    matrixView("Concatenated heads",concat,tokenLabels,featureLabels,directDetail("concat",concat)),
    matrixView("Projected attention",projected,tokenLabels,featureLabels,dotDetail(concat,Wo,bo,"attention_out"))
  ]));
  steps.push(step("res1","Residual Addition 1","Residual","将进入注意力子层之前的 X₀ 与注意力输出逐元素相加。","R₁ = X₀ + Attention(X₀)","残差路径保留原状态，注意力只需要学习应当增加或修正的部分。","GPT‑2 的残差张量形状始终保持 [T,768]。",[
    matrixView("Residual 1",res1,tokenLabels,featureLabels,(r,c)=>({value:res1[r][c],location:`R₁[${r},${c}]`,text:`${fmt(x0[r][c])} + ${fmt(projected[r][c])} = ${fmt(res1[r][c])}`}))
  ]));
  steps.push(step("ln2","LayerNorm 2","LN₂","在进入 MLP 前，对第一次残差的结果再次归一化。","Z = LN(R₁)","Attention 完成 token 之间的信息交换；归一化后交给 MLP 做逐 token 特征变换。","GPT‑2 同样沿每个 token 的 768 个特征归一化。",[
    matrixView("Mean μ",ln2.mean,tokenLabels,["μ"],directDetail("mean",ln2.mean)),
    matrixView("Variance σ²",ln2.variance,tokenLabels,["σ²"],directDetail("variance",ln2.variance)),
    matrixView("LayerNorm output",ln2.output,tokenLabels,featureLabels,lnDetail("LN₂",res1,ln2))
  ]));
  steps.push(step("mlp","MLP · Expand, GELU, Contract","MLP","每个 token 独立经过 4→8→4 的前馈网络，中间加入 GELU 非线性。","H = GELU(ZW₁+b₁)\nM = HW₂+b₂","MLP 不在 token 间移动数据；它对每个 token 已收集的信息进行非线性加工。","GPT‑2 small 使用 768→3072→768。",[
    matrixView("Linear 1 · 4→8",fc1,tokenLabels,Array.from({length:FF},(_,i)=>`f${i}`),dotDetail(ln2.output,W1,b1,"fc1")),
    matrixView("GELU",activated,tokenLabels,Array.from({length:FF},(_,i)=>`f${i}`),(r,c)=>({value:activated[r][c],location:`GELU[${r},${c}]`,text:`GELU(${fmt(fc1[r][c])}) = ${fmt(activated[r][c])}`})),
    matrixView("Linear 2 · 8→4",fc2,tokenLabels,featureLabels,dotDetail(activated,W2,b2,"fc2"))
  ]));
  steps.push(step("res2","Residual Addition 2","Residual","把 MLP 输出加回第一次残差，得到 Transformer Block 的最终输出。","R₂ = R₁ + MLP(LN(R₁))","第二条残差同样保留主干状态，使深层网络仍能稳定传递信息。","GPT‑2 会把这个结果送入下一个 block；共重复 12 次。",[
    matrixView("Block output R₂",res2,tokenLabels,featureLabels,(r,c)=>({value:res2[r][c],location:`R₂[${r},${c}]`,text:`${fmt(res1[r][c])} + ${fmt(fc2[r][c])} = ${fmt(res2[r][c])}`}))
  ]));
  steps.push(step("lnf","Final LayerNorm","LN final","最后一个 Block 后再做一次 LayerNorm。","Y = LN_final(R₂)","这是进入词表投影前的最终 token 表示；只使用最后一个 token 预测下一个 token。","GPT‑2 输出仍为 [T,768]，推理时通常只投影最后位置。",[
    matrixView("Final normalized states",lnf.output,tokenLabels,featureLabels,lnDetail("LN_final",res2,lnf))
  ]));
  steps.push(step("logits","Vocabulary Projection · Logits","Logits","最后一个 token 的 4 维状态投影到候选词表，每个候选得到一个未归一化分数。","logits = Y_last · W_vocab + b","Logit 可以比较大小，但还不是概率；这里尚未应用 Temperature 或 Top-k。","GPT‑2 投影到 50,257 个 token；这里使用 8 个候选词。",[
    matrixView("Logits",[logits],["last token"],OUTPUT_VOCAB,(r,c)=>({value:logits[c],location:`logit[${OUTPUT_VOCAB[c]}]`,text:`${last.map((v,k)=>`${fmt(v)} × ${fmt(Wout[k][c])}`).join(" + ")} + ${fmt(bout[c])}\n= ${fmt(logits[c])}`}))
  ]));
  steps.push(step("sampling","Temperature · Top-k · Softmax","Softmax","缩放 logits，过滤 Top-k，然后 Softmax 得到总和为 1 的概率。","pᵢ = exp(filtered(logitᵢ/T)) / Σⱼ exp(·)","Temperature 控制分布尖锐程度；Top-k 把候选范围限制在得分最高的 k 个 token。","GPT‑2 的采样规则相同，只是候选集合更大。",[
    {type:"prob",name:"Next-token probabilities",tokens:OUTPUT_VOCAB,logits,scaledLogits,filtered,probabilities}
  ]));

  return {config:{D,HEADS,DH,FF,temperature,topK},input:text,tokens,ids,weights:{Wq,Wk,Wv,Wq1,Wk1,Wv1,Wq2,Wk2,Wv2,bq1,bk1,bv1,bq2,bk2,bv2,Wo,W1,W2,Wout},tensors:{tokEmb,posEmb,x0,ln1,Q,K,V,Q1,K1,V1,Q2,K2,V2,raw,scaled,masked,probs,contexts,concat,projected,res1,ln2,fc1,activated,fc2,res2,lnf,logits,scaledLogits,filtered,probabilities},steps};
}

function heatColor(v,max) {
  if (!Number.isFinite(v)) return {bg:"#d9d7d0",fg:"#6b736f"};
  const t=Math.min(Math.abs(v)/(max||1),1), alpha=.12+.67*t;
  return v>=0?{bg:`rgba(45,128,98,${alpha})`,fg:t>.52?"white":"#173f31"}:{bg:`rgba(240,120,69,${alpha})`,fg:t>.52?"white":"#6d2c14"};
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function stepShape(view) {
  if (view.type === "matrix") return `${view.data.length} × ${view.data[0].length}`;
  if (view.type === "dual-head") return `2 heads · ${view.heads[0].data.length} × ${view.heads[0].data[0].length}`;
  if (view.type === "embedding-sum") return `${view.resultData.length} × ${view.resultData[0].length}`;
  if (view.type === "tokens") return `${view.tokens.length} tokens`;
  return `${view.tokens.length} candidates`;
}

function renderMatrix(view) {
  const data = view.data;
  const finite = data.flat().filter(Number.isFinite);
  const max = Math.max(...finite.map(Math.abs), .001);
  const cols = view.colLabels || data[0].map((_, i) => String(i));
  const rows = view.rowLabels || data.map((_, i) => String(i));
  let html = `<div class="matrix-wrap"><div class="matrix-name"><span>${escapeHtml(view.name)}</span><span>${data.length} × ${data[0].length}</span></div><table class="matrix"><thead><tr><th></th>${cols.map(x => `<th>${escapeHtml(x)}</th>`).join("")}</tr></thead><tbody>`;
  data.forEach((row, r) => {
    html += `<tr><th>${escapeHtml(rows[r] || String(r))}</th>`;
    row.forEach((v, c) => {
      const color = heatColor(v, max);
      html += `<td data-cell data-r="${r}" data-c="${c}" style="background:${color.bg};color:${color.fg}">${fmt(v)}</td>`;
    });
    html += "</tr>";
  });
  return html + "</tbody></table></div>";
}

function renderEquationTable(source, data, rowLabels, colLabels) {
  const finite = data.flat().filter(Number.isFinite);
  const max = Math.max(...finite.map(Math.abs), .001);
  return `<table class="equation-table" data-source="${source}"><thead><tr><th></th>${colLabels.map(x => `<th>${escapeHtml(x)}</th>`).join("")}</tr></thead><tbody>${data.map((row, r) => `<tr><th>${escapeHtml(rowLabels[r])}</th>${row.map((v, c) => {
    const color = heatColor(v, max);
    return `<td data-cell data-source="${source}" data-r="${r}" data-c="${c}" style="background:${color.bg};color:${color.fg}">${fmt(v)}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderEmbeddingEquation(view) {
  const dims = `${view.resultData.length} × ${view.resultData[0].length}`;
  return `<div class="embedding-equation">
    <section class="equation-card matrix-node embedding-token" data-embed-node="token"><i class="matrix-port matrix-port-in"></i><div class="equation-card-head"><div><b>Token 向量矩阵</b><small>E_token[tokenᵢ, d]</small></div><span>${dims}</span></div>${renderEquationTable("token", view.tokenData, view.rowLabels, view.colLabels)}<i class="matrix-port matrix-port-out"></i></section>
    <section class="equation-card matrix-node embedding-position" data-embed-node="position"><i class="matrix-port matrix-port-in"></i><div class="equation-card-head"><div><b>位置矩阵</b><small>E_pos[positionᵢ, d]</small></div><span>${dims}</span></div>${renderEquationTable("position", view.positionData, view.rowLabels, view.colLabels)}<i class="matrix-port matrix-port-out"></i></section>
    <div class="embedding-plus" aria-label="逐元素相加">+</div>
    <section class="equation-card result matrix-node embedding-result" data-embed-node="result"><i class="matrix-port matrix-port-in"></i><div class="equation-card-head"><div><b>输入结构矩阵 X₀</b><small>送入 Transformer Block</small></div><span>${dims}</span></div>${renderEquationTable("result", view.resultData, view.rowLabels, view.colLabels)}<i class="matrix-port matrix-port-out"></i></section>
    <div class="equation-caption">Token 向量矩阵与位置矩阵按相同坐标逐元素相加，结果进入下游 LayerNorm。</div>
  </div>`;
}

function renderTokens(view) {
  return `<div class="matrix-wrap"><div class="matrix-name"><span>Token 与稳定整数 ID</span><span>${view.tokens.length} tokens</span></div><table class="matrix token-table"><thead><tr><th>位置</th><th>Token</th><th>ID</th></tr></thead><tbody>${view.tokens.map((t, i) => `<tr><td>${i}</td><td>${escapeHtml(t)}</td><td>${view.ids[i]}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderProbabilities(view) {
  const max = Math.max(...view.probabilities);
  return `<div class="prob-bars">${view.tokens.map((t, i) => `<div class="prob-row"><b>${escapeHtml(t)}</b><div class="bar-track"><div class="bar" style="width:${max ? view.probabilities[i] / max * 100 : 0}%"></div></div><span>${(view.probabilities[i] * 100).toFixed(2)}%</span></div>`).join("")}</div>`;
}

function renderDualHead(view) {
  const isQkt=/QKᵀ raw/i.test(view.name), isContext=/Attention × V/i.test(view.name);
  return `<div class="dual-head-grid ${isQkt?'qkt-head-grid':''} ${isContext?'context-head-grid':''}">${view.heads.map((head, h) => `<section class="head-panel" data-head="${h}">${isQkt?`<div class="qkt-input-ports" aria-label="Head ${h+1} 的 Q 与 K 转置输入"><span class="qkt-port qkt-port-q" data-qkt-port="q">Q${h+1}</span><span class="qkt-op">×</span><span class="qkt-port qkt-port-k" data-qkt-port="k">K${h+1}ᵀ</span></div>`:''}${isContext?`<div class="context-input-ports" aria-label="Head ${h+1} 的注意力权重与 V 输入"><span class="context-port" data-context-port="a">A${h+1}</span><span class="qkt-op">×</span><span class="context-port" data-context-port="v">V${h+1}</span></div>`:''}<div class="head-label"><span>HEAD ${h + 1}</span><b>${escapeHtml(view.name)}</b></div>${renderMatrix(head)}</section>`).join("")}</div>`;
}

function viewHtml(view) {
  if (view.type === "embedding-sum") return renderEmbeddingEquation(view);
  if (view.type === "dual-head") return renderDualHead(view);
  if (view.type === "matrix") return renderMatrix(view);
  if (view.type === "tokens") return renderTokens(view);
  return renderProbabilities(view);
}

const DEPENDENCIES = {
  token:{inputs:["Raw text"],output:"Token IDs [T]"},
  embed:{inputs:["Token IDs [T]","Position [T]"],output:"X₀ [T×4]"},
  ln1:{inputs:["X₀ [T×4]"],output:"LN₁(X₀) [T×4]"},
  qkv:{inputs:["LN₁ output [T×4]"],output:"Q, K, V [T×4]"},
  attention:{inputs:["Q, K, V [T×4]"],output:"Head₁, Head₂ context [T×2]"},
  project:{inputs:["Head₁ context [T×2]","Head₂ context [T×2]"],output:"Attention output [T×4]"},
  res1:{inputs:["X₀ [T×4]","Attention output [T×4]"],output:"R₁ [T×4]",merge:true,skipFrom:"embed"},
  ln2:{inputs:["R₁ [T×4]"],output:"LN₂(R₁) [T×4]"},
  mlp:{inputs:["LN₂ output [T×4]"],output:"MLP output [T×4]"},
  res2:{inputs:["R₁ [T×4]","MLP output [T×4]"],output:"R₂ [T×4]",merge:true,skipFrom:"res1"},
  lnf:{inputs:["R₂ [T×4]"],output:"Y [T×4]"},
  logits:{inputs:["Y_last [4]"],output:"Logits [8]"},
  sampling:{inputs:["Logits [8]","Temperature","Top-k"],output:"Probability [8]"}
};

function svgNode(name,attrs,text){
  const node=document.createElementNS("http://www.w3.org/2000/svg",name);
  Object.entries(attrs||{}).forEach(([k,v])=>node.setAttribute(k,String(v)));
  if(text!=null) node.textContent=text;
  return node;
}

function drawDependencyGraph(){
  const page=$("#calculationPage");
  if(!page) return;
  page.querySelector(".dependency-svg")?.remove();
  const steps=[...page.querySelectorAll(".calc-step")];
  if(steps.length<2) return;
  const pageRect=page.getBoundingClientRect();
  const svg=svgNode("svg",{class:"dependency-svg",width:page.scrollWidth,height:page.scrollHeight,viewBox:`0 0 ${page.scrollWidth} ${page.scrollHeight}`,"aria-label":"矩阵级数据依赖连线"});
  const defs=svgNode("defs");
  const marker=svgNode("marker",{id:"dataArrow",markerWidth:9,markerHeight:9,refX:8,refY:4.5,orient:"auto",markerUnits:"strokeWidth"});
  marker.appendChild(svgNode("path",{d:"M0,0 L9,4.5 L0,9 Z",fill:"#2d8062"})); defs.appendChild(marker); svg.appendChild(defs);
  const rawBox=el=>{const r=el.getBoundingClientRect();return {left:r.left-pageRect.left,right:r.right-pageRect.left,top:r.top-pageRect.top,bottom:r.bottom-pageRect.top,cx:(r.left+r.right)/2-pageRect.left};};
  const anchorElement=(node,role="source")=>{
    const step=node.closest('.calc-step')?.dataset.stepId;
    if(step==="embed") return node.querySelector(role==="source"?'.embedding-result':'.embedding-token')||node;
    if(node.classList.contains('dual-head-block')) return node.querySelector('.dual-head-grid')||node;
    return node.querySelector('.matrix-wrap,.prob-bars,.embedding-equation')||node;
  };
  const box=(node,role)=>rawBox(anchorElement(node,role));
  const nodes=steps.map(step=>[...step.querySelectorAll('.view-block')].sort((a,b)=>Number(a.dataset.viewIndex)-Number(b.dataset.viewIndex)));
  const addPath=(d,cls="")=>svg.appendChild(svgNode("path",{d,class:`data-path ${cls}`.trim(),"marker-end":"url(#dataArrow)"}));
  const addLabel=(x,y,text,cls="data-label")=>{const width=Math.max(70,Math.min(210,text.length*6.2+16));svg.appendChild(svgNode("rect",{x:x-width/2,y:y-10,width,height:20,rx:10,class:`${cls}-bg`}));svg.appendChild(svgNode("text",{x,y:y+3,class:cls,"text-anchor":"middle"},text));};
  const roundedOrthogonal=(x1,y1,x2,y2,laneY,r=12,minTail=40)=>{
    const dir=x2>=x1?1:-1;
    const maxLane=Math.max(y1+18,y2-minTail-r);
    const adjustedLane=Math.min(laneY,maxLane);
    const safeR=Math.min(r,Math.abs(x2-x1)/2,Math.max(0,Math.abs(adjustedLane-y1)),Math.max(0,Math.abs(y2-adjustedLane)));
    if(Math.abs(x2-x1)<4) return `M ${x1} ${y1} L ${x2} ${y2}`;
    return `M ${x1} ${y1} L ${x1} ${adjustedLane-safeR} Q ${x1} ${adjustedLane} ${x1+dir*safeR} ${adjustedLane} L ${x2-dir*safeR} ${adjustedLane} Q ${x2} ${adjustedLane} ${x2} ${adjustedLane+safeR} L ${x2} ${y2}`;
  };
  const connect=(source,target,label,cls="",laneShift=0)=>{
    const a=box(source,"source"),b=box(target,"target"),startX=a.cx,startY=a.bottom+2,endX=b.cx,endY=b.top-7;
    const laneY=startY+Math.max(30,(endY-startY)/2)+laneShift;
    addPath(roundedOrthogonal(startX,startY,endX,endY,laneY),cls);
    if(label) addLabel((startX+endX)/2,laneY-14,label,cls.includes('skip')?'skip-label':'data-label');
  };
  const connectViaRight=(source,target,label,laneX,cls="")=>{
    const a=box(source,"source"),b=box(target,"target"),x1=a.cx,y1=a.bottom+2,x2=b.cx,y2=b.top-7;
    const exitY=y1+30,entryY=Math.min(y2-48,exitY+Math.max(48,(y2-exitY)/2)),r=12;
    const d=`M ${x1} ${y1} L ${x1} ${exitY-r} Q ${x1} ${exitY} ${x1+r} ${exitY} L ${laneX-r} ${exitY} Q ${laneX} ${exitY} ${laneX} ${exitY+r} L ${laneX} ${entryY-r} Q ${laneX} ${entryY} ${laneX-r} ${entryY} L ${x2+r} ${entryY} Q ${x2} ${entryY} ${x2} ${entryY+r} L ${x2} ${y2}`;
    addPath(d,cls);
    if(label) addLabel(laneX-8,(exitY+entryY)/2,label,cls.includes('skip')?'skip-label':'data-label');
  };
  steps.forEach((step,i)=>{
    const stepId=step.dataset.stepId,views=nodes[i];
    if(stepId==="embed"){
      const token=step.querySelector('.embedding-token'),position=step.querySelector('.embedding-position'),result=step.querySelector('.embedding-result'),plus=step.querySelector('.embedding-plus');
      if(token&&position&&result&&plus){
        const t=rawBox(token),p=rawBox(position),r=rawBox(result),m=rawBox(plus);
        const topLane=Math.max(t.bottom,p.bottom)+30;
        addPath(roundedOrthogonal(t.cx,t.bottom+2,m.cx-8,m.top+4,topLane),"internal-path");
        addPath(roundedOrthogonal(p.cx,p.bottom+2,m.cx+8,m.top+4,topLane+14),"internal-path");
        addPath(roundedOrthogonal(m.cx,m.bottom-2,r.cx,r.top-7,m.bottom+18),"internal-path");
      }
    }else if(stepId==="ln1"||stepId==="ln2"){
      if(views.length>=3){ connect(views[0],views[2],"μ"); connect(views[1],views[2],"σ²"); }
      if(views.length>=4) connect(views[2],views[3],"γ, β");
    }else if(stepId==="attention"){
      const operationLabels=["÷ √d_head","+ causal mask","row-wise Softmax","attention weights × V"];
      views.forEach((node,j)=>{
        if(j===0) return;
        const previous=views[j-1],fromPanels=[...previous.querySelectorAll('.head-panel')],toPanels=[...node.querySelectorAll('.head-panel')];
        fromPanels.forEach((fromPanel,head)=>{
          const toPanel=toPanels[head];
          if(!toPanel) return;
          const targetPort=j===4?toPanel.querySelector('[data-context-port="a"]'):null;
          const a=rawBox(fromPanel),b=targetPort?rawBox(targetPort):rawBox(toPanel),startX=a.cx,startY=a.bottom+2,endX=b.cx,endY=(targetPort?b.top:b.top)-7,laneY=startY+Math.max(34,(endY-startY)/2);
          addPath(roundedOrthogonal(startX,startY,endX,endY,laneY,12,44),"internal-path attention-stage-path");
          addLabel((startX+endX)/2,laneY-14,`Head ${head+1}: ${operationLabels[j-1]}`,"data-label");
        });
      });
    }else if(stepId==="project"||stepId==="mlp"){
      views.forEach((node,j)=>{ if(j>0) connect(views[j-1],node,"中间结果","internal-path"); });
    }
    if(i===0) return;
    const prevNodes=nodes[i-1],source=prevNodes[prevNodes.length-1],dep=DEPENDENCIES[stepId]||{};
    if(stepId==="qkv"){
      const outputCount=Math.max(0,views.length-6);
      if(outputCount>0){
        const sourceBox=box(source,"source"), matrixArea=step.querySelector('.matrix-gallery'), areaBox=rawBox(matrixArea), centerLaneX=areaBox.cx;
        const headLaneXs=[centerLaneX-38,centerLaneX+38], levelOffsets=[106,82,58];
        for(let j=0;j<outputCount;j++){
          const output=views[6+j],weight=views[j],label=["Q₁","K₁","V₁","Q₂","K₂","V₂"][j],head=j<3?0:1,column=j%3;
          const outputBox=box(output,"target"),weightBox=box(weight,"source"),mergeX=outputBox.cx,mergeY=outputBox.top-levelOffsets[column],laneX=headLaneXs[head]+(column-1)*12;
          const trunkStartY=sourceBox.bottom+28,approachX=mergeX+(head===0?18:-18);
          const inputPath=`M ${sourceBox.cx} ${sourceBox.bottom+2} L ${sourceBox.cx} ${trunkStartY-12} Q ${sourceBox.cx} ${trunkStartY} ${sourceBox.cx+(laneX>sourceBox.cx?12:-12)} ${trunkStartY} L ${laneX} ${trunkStartY} L ${laneX} ${mergeY-12} Q ${laneX} ${mergeY} ${laneX+(mergeX>laneX?12:-12)} ${mergeY} L ${approachX} ${mergeY}`;
          addPath(inputPath,"head-input-path multiply-input-path");
          addLabel(laneX,(trunkStartY+mergeY)/2,`LN₁→${label}`,"data-label");
          addPath(roundedOrthogonal(weightBox.cx,weightBox.bottom+2,mergeX,mergeY-18,weightBox.bottom+30+(column-1)*10,12,36),"parameter-path multiply-input-path");
          addLabel((weightBox.cx+mergeX)/2,mergeY-34,["Wq₁+bq₁","Wk₁+bk₁","Wv₁+bv₁","Wq₂+bq₂","Wk₂+bk₂","Wv₂+bv₂"][j],"data-label");
          svg.appendChild(svgNode("circle",{cx:mergeX,cy:mergeY,r:18,class:"multiply-node"}));
          svg.appendChild(svgNode("text",{x:mergeX,y:mergeY+7,class:"multiply-symbol","text-anchor":"middle"},"×"));
          addPath(`M ${mergeX} ${mergeY+18} L ${mergeX} ${outputBox.top-7}`,"multiply-output-path");
        }
      }
    }
    else if(stepId==="attention" && prevNodes.length>=12){
      const target=views[0], panels=[...target.querySelectorAll('.head-panel')];
      const pairs=[{q:prevNodes[6],k:prevNodes[7]},{q:prevNodes[9],k:prevNodes[10]}];
      panels.forEach((panel,head)=>{
        const qPort=panel.querySelector('[data-qkt-port="q"]'),kPort=panel.querySelector('[data-qkt-port="k"]');
        if(!qPort||!kPort) return;
        [[pairs[head].q,qPort,`Q${head+1}`,-16],[pairs[head].k,kPort,`K${head+1}ᵀ`,16]].forEach(([sourceNode,port,label,shift])=>{
          const a=box(sourceNode,"source"),b=rawBox(port),endX=b.cx,endY=b.top-8;
          const laneY=a.bottom+44+shift;
          addPath(roundedOrthogonal(a.cx,a.bottom+2,endX,endY,laneY,12,44),"attention-input-path qkt-input-path");
          addLabel((a.cx+endX)/2,laneY-14,label,"data-label");
        });
      });
      if(views.length>=5){
        const contextPanels=[...views[4].querySelectorAll('.head-panel')],vNodes=[prevNodes[8],prevNodes[11]];
        contextPanels.forEach((panel,head)=>{
          const vPort=panel.querySelector('[data-context-port="v"]'),sourceNode=vNodes[head];
          if(!vPort||!sourceNode) return;
          const a=box(sourceNode,"source"),b=rawBox(vPort),x1=a.cx,y1=a.bottom+2,x2=b.cx,y2=b.top-8,attentionArea=rawBox(step.querySelector('.matrix-gallery')),centerX=attentionArea.cx,laneX=head===0?centerX-44:centerX+44;
          const exitY=y1+34,entryY=y2-52,r=12;
          const d=`M ${x1} ${y1} L ${x1} ${exitY-r} Q ${x1} ${exitY} ${x1+(laneX>x1?12:-12)} ${exitY} L ${laneX} ${exitY} L ${laneX} ${entryY-r} Q ${laneX} ${entryY} ${laneX+(x2>laneX?12:-12)} ${entryY} L ${x2} ${entryY} L ${x2} ${y2}`;
          addPath(d,"value-bypass-path");
          addLabel(laneX,(exitY+entryY)/2,`V${head+1}: value vectors`,"data-label");
        });
      }
    }else if(stepId==="project" && prevNodes.length){
      const target=views[0],operator=target.querySelector('[data-concat-operator]'),targetMatrix=target.querySelector('.matrix-wrap'),sourcePanels=[...source.querySelectorAll('.head-panel')];
      if(operator&&targetMatrix&&sourcePanels.length>=2){
        ['head1','head2'].forEach((portName,head)=>{
          const port=operator.querySelector(`[data-concat-port="${portName}"]`),a=rawBox(sourcePanels[head]),b=rawBox(port),laneY=a.bottom+48+head*16;
          addPath(roundedOrthogonal(a.cx,a.bottom+2,b.cx,b.top-8,laneY,12,44),"concat-input-path");
          addLabel((a.cx+b.cx)/2,laneY-14,`Head ${head+1} Context [T×2]`,"data-label");
        });
        const op=rawBox(operator),matrix=rawBox(targetMatrix);
        addPath(roundedOrthogonal(op.cx,op.bottom+2,matrix.cx,matrix.top-7,op.bottom+28,12,40),"concat-output-path");
        addLabel(op.cx,op.bottom+18,"Concat → [T×4]","data-label");
      }
    }else if(dep.merge){
      const target=views[0],main=source,a=box(main,"source"),b=box(target,"target"),mergeX=b.cx,mergeY=b.top-78;
      addPath(roundedOrthogonal(a.cx,a.bottom+2,mergeX-18,mergeY,a.bottom+28),"main-path");
      const sourceIndex=state.steps.findIndex(x=>x.id===dep.skipFrom);
      if(sourceIndex>=0 && sourceIndex<i){
        const skipNode=nodes[sourceIndex][nodes[sourceIndex].length-1],s=box(skipNode,"source"),canvas=step.querySelector('.canvas-step'),canvasBox=rawBox(canvas);
        const laneX=canvasBox.right-46,exitY=s.bottom+34,entryY=mergeY,r=12,endX=mergeX+18;
        const d=`M ${s.cx} ${s.bottom+2} L ${s.cx} ${exitY-r} Q ${s.cx} ${exitY} ${s.cx+r} ${exitY} L ${laneX-r} ${exitY} Q ${laneX} ${exitY} ${laneX} ${exitY+r} L ${laneX} ${entryY-r} Q ${laneX} ${entryY} ${laneX-r} ${entryY} L ${endX} ${entryY}`;
        addPath(d,"skip-path residual-right-lane");
        addLabel(laneX-12,(exitY+entryY)/2,dep.inputs[0],"skip-label");
      }
      svg.appendChild(svgNode("circle",{cx:mergeX,cy:mergeY,r:17,class:"merge-node"}));
      svg.appendChild(svgNode("text",{x:mergeX,y:mergeY+7,class:"merge-plus","text-anchor":"middle"},"+"));
      addPath(roundedOrthogonal(mergeX,mergeY+17,mergeX,b.top-7,mergeY+22),"merge-out");
      addLabel((a.cx+mergeX)/2,mergeY-14,dep.inputs[1],"data-label");
    }else connect(source,views[0],dep.inputs?.join(" + ")||"data");
  });
  page.prepend(svg);
}

function renderViewBlock(view,index,stepId) {
  const modifier=view.type==="dual-head"?" dual-head-block":"";
  const concatNode=stepId==="project"&&index===0?`<div class="concat-operator" data-concat-operator><div class="concat-inputs"><span data-concat-port="head1">Head 1 Context<br><small>[T×2]</small></span><span data-concat-port="head2">Head 2 Context<br><small>[T×2]</small></span></div><b>Concat(axis = feature)</b><small>[T×2] + [T×2] → [T×4]</small></div>`:"";
  return `<section class="view-block${modifier} ${concatNode?'concat-target-block':''}" data-view-index="${index}" data-node="${escapeHtml(stepId)}:${index}"><div class="view-block-body">${concatNode}${viewHtml(view)}</div></section>`;
}

function initialValueNote(view) {
  if (view.type === "prob") {
    const max = Math.max(...view.probabilities);
    const i = view.probabilities.indexOf(max);
    return {
      value: view.tokens[i],
      location: "最高概率候选",
      text: view.tokens.map((t, j) => `${t}: logit ${fmt(view.logits[j])} → scaled ${fmt(view.scaledLogits[j])} → p ${(view.probabilities[j] * 100).toFixed(2)}%`).join("\n")
    };
  }
  return { value: "—", location: view.type === "tokens" ? "分词和 ID 映射已完成" : "点击右侧任意矩阵数值", text: "" };
}

function sourceFor(stepId,viewIndex,view){
  const parameterSources={
    embed:["Token IDs：由 Tokenization 生成；E_token：固定教学词向量参数；E_pos：正弦位置编码","位置编码：由 token 位置确定","X₀：Token 向量 + 位置编码"],
    ln1:["输入：X₀；按每个 token 的 4 个特征求均值","输入：X₀ 与 μ；求方差","输入：X₀、μ、σ²；ε=1e-5","输入：Normalized；模型参数 γ₁、β₁"],
    ln2:["输入：R₁；按特征求均值","输入：R₁ 与 μ；求方差","输入：R₁、μ、σ²；ε=1e-5","输入：Normalized；模型参数 γ₂、β₂"],
    qkv:[
      "模型参数 Wq₁：[4×2]，来自合并 Wq 的前两列","模型参数 Wk₁：[4×2]，来自合并 Wk 的前两列","模型参数 Wv₁：[4×2]，来自合并 Wv 的前两列",
      "模型参数 Wq₂：[4×2]，来自合并 Wq 的后两列","模型参数 Wk₂：[4×2]，来自合并 Wk 的后两列","模型参数 Wv₂：[4×2]，来自合并 Wv 的后两列",
      "Q₁ = LN₁ output × Wq₁ + bq₁","K₁ = LN₁ output × Wk₁ + bk₁","V₁ = LN₁ output × Wv₁ + bv₁",
      "Q₂ = LN₁ output × Wq₂ + bq₂","K₂ = LN₁ output × Wk₂ + bk₂","V₂ = LN₁ output × Wv₂ + bv₂"
    ],
    attention:["输入：Q、K","输入：QKᵀ；常量 √d_head","输入：Scaled scores；因果 Mask","输入：Masked scores；Softmax","输入：Attention probability、V"],
    project:["输入：Head 1 context、Head 2 context","输入：Concatenated heads；模型参数 Wo、bo"],
    res1:["输入：X₀ 与 Attention output"],
    mlp:["输入：LN₂ output；模型参数 W₁、b₁","输入：Linear 1；GELU 函数","输入：GELU output；模型参数 W₂、b₂"],
    res2:["输入：R₁ 与 MLP output"],
    lnf:["输入：R₂；最终 LayerNorm 参数 γ、β"],
    logits:["输入：Y_last；模型参数 W_vocab、b_vocab"],
    sampling:["输入：Logits；用户参数 Temperature、Top-k；Softmax"]
  };
  return parameterSources[stepId]?.[viewIndex] || (view.type==="tokens"?"来源：用户输入文本；Tokenizer：教学用 FNV1a 映射":"来源：上一计算节点输出");
}

function buildTimeline(steps){
  const items=[];
  steps.forEach((step,stepIndex)=>step.views.forEach((view,viewIndex)=>items.push({stepIndex,viewIndex,title:view.name||step.title,source:sourceFor(step.id,viewIndex,view)})));
  return items;
}

function visibleCounts(){
  const counts=new Map();
  state.timeline.slice(0,state.nodeCursor+1).forEach(item=>counts.set(item.stepIndex,(counts.get(item.stepIndex)||0)+1));
  return counts;
}

function renderNodeUnit(view,i,stepId){
  return `<div class="node-unit ${view.type==='dual-head'?'dual-node':''}" data-unit-index="${i}">${renderViewBlock(view,i,stepId)}<div class="source-badge" data-source-for="${i}"><b>来源</b><span>${escapeHtml(sourceFor(stepId,i,view))}</span></div></div>`;
}

function renderMatrixGallery(step,visibleViews){
  if(step.id!=="qkv") return `<div class="matrix-gallery views-${visibleViews.length} ${visibleViews.length===1?"single":""}">${visibleViews.map((view,i)=>renderNodeUnit(view,i,step.id)).join("")}</div>`;
  const group=(head,label,indexes)=>{
    const items=indexes.filter(i=>i<visibleViews.length).map(i=>renderNodeUnit(visibleViews[i],i,step.id)).join("");
    return `<section class="head-group head-${head}" data-head-group="${head}"><header class="head-group-title"><span>HEAD ${head}</span><b>${label}</b></header><div class="head-group-grid">${items||'<p class="head-group-empty">等待生成该 Head 的矩阵</p>'}</div></section>`;
  };
  return `<div class="matrix-gallery qkv-head-layout">${group(1,"Query / Key / Value projections",[0,1,2,6,7,8])}<div class="head-center-lane" aria-hidden="true"><span>shared LN₁ input</span></div>${group(2,"Query / Key / Value projections",[3,4,5,9,10,11])}</div>`;
}

function renderStepCard(stepIndex,visibleCount) {
  const step = state.steps[stepIndex];
  const visibleViews=step.views.slice(0,visibleCount);
  const firstView = visibleViews[0];
  const note = initialValueNote(firstView);
  return `<article class="calc-step" id="step-${stepIndex}" data-step="${stepIndex}" data-step-id="${escapeHtml(step.id)}">
    <aside class="step-notes">
      <div class="rail-step-head"><span>${String(stepIndex+1).padStart(2,"0")}</span><div><small>${escapeHtml(step.group)}</small><h3>${escapeHtml(step.title)}</h3></div></div>
      <p class="step-description">${escapeHtml(step.description)}</p>
      <div class="note-block"><span class="note-label">公式</span><div class="formula">${escapeHtml(step.formula)}</div></div>
      <div class="note-block value-note"><span class="note-label">选中数值</span><div class="value-number">${escapeHtml(note.value)}</div><div class="value-location">${escapeHtml(note.location)}</div><div class="value-breakdown">${escapeHtml(note.text)}</div></div>
      <div class="note-block"><span class="note-label">这一层在做什么</span><p>${escapeHtml(step.intuition)}</p></div>
      <div class="note-block gpt-note"><span class="note-label">映射到 GPT-2 small</span><p>${escapeHtml(step.gpt)}</p></div>
    </aside>
    <section class="canvas-step" aria-label="${escapeHtml(step.title)} 计算矩阵">
      <div class="canvas-step-label"><span>STEP ${String(stepIndex+1).padStart(2,"0")}</span><b>${escapeHtml(step.title)}</b><em>${visibleViews.length} / ${step.views.length} 个节点</em></div>
      ${renderMatrixGallery(step,visibleViews)}
    </section>
  </article>`;
}

function updateValueNote(card, detail) {
  const number = card.querySelector(".value-number");
  const location = card.querySelector(".value-location");
  const breakdown = card.querySelector(".value-breakdown");
  if (!number || !location || !breakdown) return;
  number.textContent = Number.isFinite(detail.value) ? fmt(detail.value) : String(detail.value);
  location.textContent = detail.location;
  breakdown.textContent = detail.text;
}

function bindCard(card) {
  const stepIndex = Number(card.dataset.step);
  const step = state.steps[stepIndex];

  card.querySelectorAll('.view-block').forEach(block=>{
    const view=step.views[Number(block.dataset.viewIndex)];
    if (view.type === "embedding-sum") {
      const cells = [...block.querySelectorAll(".equation-table td[data-cell]")];
      const peers = (r, c) => cells.filter(x => Number(x.dataset.r) === r && Number(x.dataset.c) === c);
      cells.forEach(cell => {
        const r = Number(cell.dataset.r), c = Number(cell.dataset.c), source = cell.dataset.source;
        cell.onmouseenter = () => peers(r, c).forEach(x => x.classList.add("paired"));
        cell.onmouseleave = () => peers(r, c).forEach(x => x.classList.remove("paired"));
        cell.onclick = () => {
          card.querySelectorAll('td.selected').forEach(x=>x.classList.remove('selected'));
          peers(r, c).forEach(x => x.classList.add("selected"));
          const a = view.tokenData[r][c], b = view.positionData[r][c], out = view.resultData[r][c];
          updateValueNote(card, {value:source === "token" ? a : source === "position" ? b : out,location:`${source === "token" ? "E_token" : source === "position" ? "E_pos" : "X₀"}[${r}, ${c}] · token ${view.rowLabels[r]} · ${view.colLabels[c]}`,text:`Token 向量     ${fmt(a)}\n位置编码       ${fmt(b)}\n               ─────────\n结构矩阵 X₀    ${fmt(a)} + ${fmt(b)} = ${fmt(out)}`});
        };
      });
    } else if (view.type === "dual-head") {
      const cells = [...block.querySelectorAll(".head-panel td[data-cell]")];
      cells.forEach(cell => cell.onclick = () => {
        card.querySelectorAll('td.selected').forEach(x=>x.classList.remove('selected'));
        cell.classList.add("selected");
        const panel = cell.closest(".head-panel");
        const head = view.heads[Number(panel.dataset.head)];
        updateValueNote(card, head.detail(Number(cell.dataset.r), Number(cell.dataset.c)));
      });
    } else if (view.type === "matrix") {
      const cells = [...block.querySelectorAll("td[data-cell]")];
      cells.forEach(cell => cell.onclick = () => {
        card.querySelectorAll('td.selected').forEach(x=>x.classList.remove('selected'));
        cell.classList.add("selected");
        updateValueNote(card, view.detail(Number(cell.dataset.r), Number(cell.dataset.c)));
      });
    }
  });
}

function renderStepMap() {
  const map = $("#stepMap");
  const counts=visibleCounts();
  const active=state.timeline[state.nodeCursor];
  map.innerHTML = state.steps.map((step, i) => {
    const visible=counts.get(i)||0;
    const classes = `map-item ${visible===step.views.length ? "done" : ""} ${i === active.stepIndex ? "current" : ""} ${!visible ? "locked" : ""}`;
    const content = `<span class="map-index">${visible}/${step.views.length}</span><span class="map-name">${escapeHtml(step.title)}</span>`;
    return visible ? `<a href="#step-${i}" class="${classes}">${content}</a>` : `<span class="${classes}" aria-label="尚未生成：${escapeHtml(step.title)}">${content}</span>`;
  }).join("");
  const current=map.querySelector(".current");
  if(current) map.scrollLeft=Math.max(0,current.offsetLeft-map.clientWidth/2+current.clientWidth/2);
}

function renderProgress() {
  const count = state.nodeCursor + 1;
  const total = state.timeline.length;
  const current=state.timeline[state.nodeCursor];
  $("#progressText").textContent = `${count} / ${total}`;
  $("#progressName").textContent = `${state.steps[current.stepIndex].title} · ${current.title}`;
  $("#progressBar").style.width = `${count / total * 100}%`;
  const finished = count === total;
  $("#nextBtn").disabled = finished;
  $("#dockNextBtn").disabled = finished;
  $("#continueDock").hidden = finished;
  $("#completeState").hidden = !finished;
  const completeProgress=$("#completeState > span"); if(completeProgress) completeProgress.textContent=`${total} / ${total}`;
  $("#autoBtn").disabled = finished;
  if (!finished) {
    const next=state.timeline[count];
    $("#nextStepLabel").textContent = `下一节点 · ${String(count + 1).padStart(2, "0")}`;
    $("#nextStepName").textContent = `${state.steps[next.stepIndex].title} · ${next.title}`;
  }
  document.body.dataset.generatedSteps = String(count);
}

function renderAll(scrollToLatest) {
  const page = $("#calculationPage");
  const counts=visibleCounts();
  page.innerHTML = [...counts.entries()].sort((a,b)=>a[0]-b[0]).map(([stepIndex,count])=>renderStepCard(stepIndex,count)).join("");
  page.querySelectorAll(".calc-step").forEach(bindCard);
  renderStepMap();
  renderProgress();
  requestAnimationFrame(()=>requestAnimationFrame(drawDependencyGraph));
  if (scrollToLatest) {
    const active=state.timeline[state.nodeCursor];
    requestAnimationFrame(() => document.querySelector(`#step-${active.stepIndex}`)?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }));
  }
}

function reducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function stopAuto() {
  if (state.autoTimer) window.clearInterval(state.autoTimer);
  state.autoTimer = null;
  $("#autoBtn").textContent = "自动生成";
}

function nextStep() {
  if (state.nodeCursor >= state.timeline.length - 1) return;
  state.nodeCursor += 1;
  renderAll(true);
  if (state.nodeCursor >= state.timeline.length - 1) stopAuto();
}

function toggleAuto() {
  if (state.autoTimer) {
    stopAuto();
    showToast("自动生成已暂停");
    return;
  }
  if (state.nodeCursor >= state.timeline.length - 1) return;
  $("#autoBtn").textContent = "暂停生成";
  nextStep();
  state.autoTimer = window.setInterval(nextStep, 1100);
}

function run() {
  stopAuto();
  state.precision = Number($("#precisionInput").value);
  state.trace = runTrace($("#promptInput").value, Number($("#tempInput").value), Number($("#topKInput").value));
  const attentionSums = state.trace.tensors.probs.flatMap(head => head.map(row => row.reduce((a, b) => a + b, 0)));
  const probabilitySum = state.trace.tensors.probabilities.reduce((a, b) => a + b, 0);
  const sameMatrix=(a,b)=>a.length===b.length&&a.every((row,i)=>row.length===b[i].length&&row.every((v,j)=>Math.abs(v-b[i][j])<1e-12));
  const recombinedQ=state.trace.tensors.Q1.map((r,i)=>[...r,...state.trace.tensors.Q2[i]]);
  const recombinedK=state.trace.tensors.K1.map((r,i)=>[...r,...state.trace.tensors.K2[i]]);
  const recombinedV=state.trace.tensors.V1.map((r,i)=>[...r,...state.trace.tensors.V2[i]]);
  const invalid = attentionSums.some(x => Math.abs(x - 1) > 1e-9) || Math.abs(probabilitySum - 1) > 1e-9 || !sameMatrix(recombinedQ,state.trace.tensors.Q) || !sameMatrix(recombinedK,state.trace.tensors.K) || !sameMatrix(recombinedV,state.trace.tensors.V);
  if (invalid) throw new Error("数值校验失败：Softmax 或双头 Q/K/V 拆分一致性不通过。");
  state.steps = state.trace.steps;
  state.timeline = buildTimeline(state.steps);
  const requestedNodes = Number(new URLSearchParams(location.search).get("nodes") || new URLSearchParams(location.search).get("steps"));
  state.nodeCursor = Number.isFinite(requestedNodes) && requestedNodes > 0 ? Math.min(state.timeline.length - 1, Math.floor(requestedNodes) - 1) : 0;
  state.maxVisited = state.timeline[state.nodeCursor].stepIndex;
  state.viewByStep = {};
  document.body.dataset.qa = "passed";
  renderAll(false);
}

$("#runBtn").onclick = () => { run(); $("#calculationPage").scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); };
$("#promptInput").addEventListener("keydown", event => { if (event.key === "Enter") $("#runBtn").click(); });
$("#tempInput").oninput = event => $("#tempValue").textContent = Number(event.target.value).toFixed(1);
$("#topKInput").oninput = event => $("#topKValue").textContent = event.target.value;
$("#precisionInput").onchange = () => { state.precision = Number($("#precisionInput").value); renderAll(false); };
$("#nextBtn").onclick = nextStep;
$("#dockNextBtn").onclick = nextStep;
$("#autoBtn").onclick = toggleAuto;
$("#resetBtn").onclick = () => { stopAuto(); state.nodeCursor = 0; state.maxVisited = 0; state.viewByStep = {}; renderAll(false); $("#calculationPage").scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); };
$("#backTopBtn").onclick = () => $("#calculationPage").scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
$("#exportBtn").onclick = () => {
  const data = clone({ ...state.trace, steps: undefined });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transformer-trace.json";
  a.click();
  URL.revokeObjectURL(a.href);
};
$("#tourBtn").onclick = () => $("#tourDialog").showModal();
$("#closeTour").onclick = () => $("#tourDialog").close();
document.addEventListener("keydown", event => {
  if (event.target.matches("input,select") || $("#tourDialog").open) return;
  if (event.key === "ArrowRight") nextStep();
  if (event.key === " ") { event.preventDefault(); toggleAuto(); }
});

window.addEventListener("resize",()=>requestAnimationFrame(drawDependencyGraph));

try {
  run();
} catch (error) {
  console.error(error);
  showToast(error.message || "计算初始化失败");
}
