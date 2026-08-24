const state={query:"",homeQuery:"",deck:"",topicId:""};
const $=selector=>document.querySelector(selector);
const topics=window.CEFR_TOPICS;
const packs={
  music:{topic:topics.find(item=>item.id==="music"),vocabulary:window.CEFR_VOCABULARY,scenes:window.CEFR_SCENES,idioms:window.CEFR_LEARNING_NOTES.idioms},
  ...window.CEFR_ADDITIONAL_TOPIC_PACKS
};
let activePack=packs.music;
let vocabulary=activePack.vocabulary;
let scenes=activePack.scenes;
let idioms=activePack.idioms;
let decks=[];

function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function byId(id){return vocabulary.find(item=>item.id===id);}
function matches(item,query){return !query||[item.display,item.sense.definition,item.sense.definitionZh,...item.collocations,...item.collocationsZh].join(" ").toLowerCase().includes(query.toLowerCase());}
function topicMatches(topic,query){if(!query)return true;const pack=packs[topic.id];return [topic.title,topic.titleZh,topic.category,topic.description,...pack.vocabulary.flatMap(item=>[item.display,item.sense.definitionZh])].join(" ").toLowerCase().includes(query.toLowerCase());}

let naturalVoice=null;
function chooseVoice(){if(!("speechSynthesis" in window))return null;const voices=speechSynthesis.getVoices();const english=voices.filter(voice=>/^en[-_]/i.test(voice.lang));const score=voice=>{const name=voice.name.toLowerCase();let points=/en[-_]gb/i.test(voice.lang)?30:0;if(/premium|enhanced|natural|neural|siri/.test(name))points+=50;if(/serena|daniel|kate|oliver|jamie|stephanie/.test(name))points+=20;if(/google|microsoft|apple/.test(name))points+=8;return points;};naturalVoice=[...english].sort((a,b)=>score(b)-score(a))[0]||null;return naturalVoice;}
if("speechSynthesis" in window){chooseVoice();speechSynthesis.addEventListener?.("voiceschanged",chooseVoice);}
function speak(text,kind="sentence"){if(!("speechSynthesis" in window))return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-GB";utterance.voice=naturalVoice||chooseVoice();utterance.rate=kind==="word"?.72:.84;utterance.pitch=kind==="word"?1:1.04;utterance.volume=1;speechSynthesis.speak(utterance);}
function audioButton(text,label,kind="sentence"){return `<button class="audio-button" type="button" data-speak="${escapeHtml(text)}" data-speech-kind="${kind}" aria-label="${escapeHtml(label)}"><span aria-hidden="true">🔊</span></button>`;}
function speakerButton(item){return audioButton(item.display,`Pronounce ${item.display}`,"word");}

function buildDecks(){
  decks=[
    ...scenes.map((scene,index)=>({id:`scene-${scene.id}`,kind:"scene",title:`Scene ${index+1}`,subtitle:scene.title})),
    {id:"examples-1",kind:"examples",title:"Examples 1",subtitle:"Reusable sentences"},
    {id:"examples-2",kind:"examples",title:"Examples 2",subtitle:"More contexts"},
    {id:"idioms-1",kind:"idioms",title:"Idioms 1",subtitle:"Everyday expressions"},
    {id:"idioms-2",kind:"idioms",title:"Idioms 2",subtitle:"Everyday expressions"},
    {id:"all",kind:"all",title:"All",subtitle:"Show every card"}
  ];
  if(!decks.some(deck=>deck.id===state.deck))state.deck=decks[0].id;
}

function activateTopic(id){
  const next=packs[id]||packs.music;
  if(state.topicId!==next.topic.id){state.topicId=next.topic.id;state.query="";state.deck="";}
  activePack=next;vocabulary=next.vocabulary;scenes=next.scenes;idioms=next.idioms;buildDecks();
}

function renderHome(){
  const shown=topics.filter(topic=>topicMatches(topic,state.homeQuery));
  $("#topicGrid").innerHTML=shown.length?shown.map(topic=>{const pack=packs[topic.id];return `<button class="topic-card" type="button" data-topic="${topic.id}" style="--topic-accent:${topic.accent};--topic-accent-2:${topic.accent2}"><div class="card-art"><span class="topic-icon" aria-hidden="true">${escapeHtml(topic.icon)}</span><span>${escapeHtml(topic.titleZh)} · ${pack.scenes.length} scenes</span></div><div><p class="eyebrow">${escapeHtml(topic.category)}</p><h2>${escapeHtml(topic.title)} <b>${topic.level}</b></h2><p>${escapeHtml(topic.description)}</p><small>${pack.vocabulary.length} vocabulary senses · ${pack.scenes.length} visual scenes</small></div></button>`;}).join(""):`<div class="empty">No B2 topic matched “${escapeHtml(state.homeQuery)}”.</div>`;
  const generalReferences=[...new Set(topics.map(topic=>topic.taxonomyReferences[0])),"https://www.englishprofile.org/wordlists"];
  $("#methodReferences").innerHTML=generalReferences.map((url,index)=>`<li><a href="${url}" target="_blank" rel="noreferrer">${index<topics.length?`${topics[index].title} SMART Vocabulary reference`:"English Vocabulary Profile"}</a></li>`).join("");
}

function renderTopicHeader(){
  const topic=activePack.topic;
  $("#topicEyebrow").textContent=`${topic.category} · Cambridge SMART Vocabulary`;
  $("#topicName").innerHTML=`${escapeHtml(topic.title.toUpperCase())} <span>${topic.level}</span>`;
  $("#topicSummary").textContent=topic.description;
  $("#topicStats").textContent=`${vocabulary.length} words · ${scenes.length} scenes`;
  $("#topicSearchLabel").textContent=`Search ${topic.title} ${topic.level}`;
  $("#methodReferences").innerHTML=[...topic.taxonomyReferences,"https://www.englishprofile.org/wordlists"].map((url,index)=>`<li><a href="${url}" target="_blank" rel="noreferrer">${index<topic.taxonomyReferences.length?`Cambridge SMART Vocabulary reference ${index+1}`:"English Vocabulary Profile"}</a></li>`).join("");
}

function setRoute(topicId){
  const hasTopic=Boolean(topicId&&packs[topicId]);
  $("#home").hidden=hasTopic;$("#topic").hidden=!hasTopic;
  if(hasTopic){activateTopic(topicId);renderTopicHeader();$("#topicSearch").value=state.query;renderTopic();}else{state.topicId="";state.query="";$("#topicSearch").value="";renderHome();}
}
function updateTopicSearch(value){state.query=value.trim();$("#topicSearch").value=value;renderTopic();}

function grammarLine(item){return `${escapeHtml(item.partOfSpeech)}${item.ipa?` · ${escapeHtml(item.ipa)}`:""}`;}
function wordCard(item){return `<article class="word-card">${speakerButton(item)}<button class="word-open" type="button" data-word="${item.id}"><span><b>${escapeHtml(item.display)}</b><small>${grammarLine(item)}</small><small class="word-zh">${escapeHtml(item.sense.definitionZh)}</small></span></button></article>`;}
function sentenceLine(english,chinese,label="Play sentence"){return `<div class="sentence-line">${audioButton(english,label)}<div><span>${escapeHtml(english)}</span><small>${escapeHtml(chinese)}</small></div></div>`;}
function sampleWords(){const count=Math.min(10,vocabulary.length);return Array.from({length:count},(_,index)=>vocabulary[Math.floor(index*vocabulary.length/count)]);}

function renderDeckNav(){$("#deckNav").innerHTML=decks.map(deck=>`<button type="button" class="deck-card ${state.deck===deck.id?"active":""}" data-deck="${deck.id}"><b>${escapeHtml(deck.title)}</b><span>${escapeHtml(deck.subtitle)}</span></button>`).join("");}
function renderScene(scene){
  const words=vocabulary.filter(item=>item.scenes.includes(scene.id));
  const collocations=words.map(item=>`<article class="quick-collocation">${audioButton(item.collocations[0],"Play collocation")}<button type="button" data-word="${item.id}"><b>${escapeHtml(item.collocations[0])}</b><span>${escapeHtml(item.collocationsZh[0])}</span></button></article>`).join("");
  const sceneArt=scene.image?`<img src="${scene.image}" alt="Modern learning illustration for ${escapeHtml(scene.title)}" loading="lazy">`:`<div class="scene-symbol" aria-hidden="true"><span>${escapeHtml(scene.icon)}</span><small>${escapeHtml(scene.title)}</small></div>`;
  return `<article class="scene"><header><div><p class="eyebrow">${escapeHtml(scene.subtopic)}</p><h2>${escapeHtml(scene.title)} <span>${escapeHtml(scene.titleZh)}</span></h2><p>${escapeHtml(scene.description)}</p></div><b>${words.length} words</b></header><div class="scene-layout"><div class="visual ${scene.image?"":"icon-visual"}" style="--scene-accent:${scene.accent||activePack.topic.accent};--scene-accent-2:${scene.accent2||activePack.topic.accent2}">${sceneArt}${scene.labels.map(label=>`<button class="label label-${scene.id} label-${activePack.topic.id}" type="button" data-word="${label.id}" style="left:${label.x}%;top:${label.y}%">${escapeHtml(byId(label.id).display)}</button>`).join("")}</div><div class="word-list">${words.map(wordCard).join("")}</div></div><section class="scene-collocations"><p class="eyebrow">Quick review</p><h3>Common collocations <span>常见搭配</span></h3><div class="bank-collocations">${collocations}</div></section></article>`;
}
function renderExampleDeck(group){const all=sampleWords();const midpoint=Math.ceil(all.length/2);const items=group===1?all.slice(0,midpoint):all.slice(midpoint);return `<section class="deck-panel"><header><p class="eyebrow">Ready to borrow</p><h2>Model examples ${group} <span>可复用双语例句</span></h2><p>Listen, notice the collocation, then reuse the sentence pattern in your own discussion.</p></header><div class="example-deck-grid">${items.map(item=>`<article class="example-deck-card"><div class="example-word">${speakerButton(item)}<button type="button" data-word="${item.id}"><b>${escapeHtml(item.display)}</b><span>${escapeHtml(item.sense.definitionZh)}</span></button></div><div class="deck-sentences">${item.examples.map((sentence,index)=>sentenceLine(sentence,item.examplesZh[index],"Play example sentence")).join("")}</div></article>`).join("")}</div></section>`;}
function renderIdiomDeck(group){const midpoint=Math.ceil(idioms.length/2);const items=group===1?idioms.slice(0,midpoint):idioms.slice(midpoint);return `<section class="deck-panel"><header><p class="eyebrow">Everyday English</p><h2>${escapeHtml(activePack.topic.title)} idioms ${group} <span>主题相关习语</span></h2><p>Each expression includes three contexts so you can hear how it works in natural sentences.</p></header><div class="idiom-deck-grid">${items.map(item=>`<article class="idiom-card"><h3>${escapeHtml(item.phrase)}</h3><p>${escapeHtml(item.meaning)}</p><p class="zh-note">${escapeHtml(item.meaningZh)}</p><div class="deck-sentences">${item.examples.map((sentence,index)=>sentenceLine(sentence,item.examplesZh[index],"Play idiom example sentence")).join("")}</div></article>`).join("")}</div></section>`;}
function renderAll(){return `<div class="all-notice">All cards are shown. Choose a single card above for a shorter study session.</div>${scenes.map(renderScene).join("")}${renderExampleDeck(1)}${renderExampleDeck(2)}${renderIdiomDeck(1)}${renderIdiomDeck(2)}`;}
function renderSelectedDeck(){const selected=decks.find(deck=>deck.id===state.deck)||decks[0];if(selected.kind==="scene")return renderScene(scenes.find(scene=>`scene-${scene.id}`===selected.id));if(selected.kind==="examples")return renderExampleDeck(selected.id.endsWith("1")?1:2);if(selected.kind==="idioms")return renderIdiomDeck(selected.id.endsWith("1")?1:2);return renderAll();}

function renderTopic(){const shown=vocabulary.filter(item=>matches(item,state.query));$("#resultCount").textContent=`${shown.length} / ${vocabulary.length} vocabulary items`;const searching=Boolean(state.query);$("#searchResults").hidden=!searching;$("#deckNav").hidden=searching;$("#deckContent").hidden=searching;if(searching){$("#searchResults").innerHTML=shown.length?shown.map(wordCard).join(""):`<div class="empty">No vocabulary matched “${escapeHtml(state.query)}”.</div>`;return;}renderDeckNav();$("#deckContent").innerHTML=renderSelectedDeck();}

function resolveRelated(value){return byId(value)||byId(value.replace(/\s+/g,"-"));}
function openDetail(id){const item=byId(id);if(!item)return;const evidence=item.sense.cefrEvidence;const collocations=item.collocations.map((phrase,index)=>`<div>${audioButton(phrase,"Play collocation")}<b>${escapeHtml(phrase)}</b><span>${escapeHtml(item.collocationsZh[index])}</span></div>`).join("");const examples=item.examples.map((sentence,index)=>`<blockquote class="bilingual-example">${sentenceLine(sentence,item.examplesZh[index],"Play example sentence")}</blockquote>`).join("");$("#detailContent").innerHTML=`<p class="eyebrow">${escapeHtml(item.topic.subtopic)}</p><div class="word-title">${speakerButton(item)}<div><h2>${escapeHtml(item.display)}</h2><p>${grammarLine(item)} <span class="badge">B2</span></p></div></div><p class="zh">${escapeHtml(item.sense.definitionZh)}</p><p class="definition">${escapeHtml(item.sense.definition)}</p><section><h3>Collocations · 常见搭配</h3><div class="collocation-list">${collocations}</div></section><section><h3>Examples · 双语例句</h3><div class="example-list">${examples}</div></section><section><h3>Related words · 相关词</h3><div class="related">${item.relatedWords.map(word=>{const related=resolveRelated(word);return related?`<button type="button" data-related="${related.id}">${escapeHtml(related.display)}</button>`:`<span>${escapeHtml(word)}</span>`;}).join("")}</div></section><p class="evidence ${evidence.status}"><b>${evidence.status}</b> sense-level CEFR evidence · <a href="${evidence.reference}" target="_blank" rel="noreferrer">reference</a></p>`;if(!$("#detail").open)$("#detail").showModal();}

document.addEventListener("click",event=>{
  const audio=event.target.closest("[data-speak]");if(audio){event.stopPropagation();speak(audio.dataset.speak,audio.dataset.speechKind);return;}
  const word=event.target.closest("[data-word]");if(word)openDetail(word.dataset.word);
  const related=event.target.closest("[data-related]");if(related)openDetail(related.dataset.related);
  const topic=event.target.closest("[data-topic]");if(topic)location.hash=topic.dataset.topic;
  const deck=event.target.closest("[data-deck]");if(deck){state.deck=deck.dataset.deck;renderTopic();$("#deckNav").scrollIntoView({behavior:"smooth",block:"start"});}
});
$("#search").addEventListener("input",event=>{state.homeQuery=event.target.value.trim();renderHome();});
$("#topicSearch").addEventListener("input",event=>updateTopicSearch(event.target.value));
$("#topicSearch").addEventListener("blur",event=>{if(!event.target.value.trim())updateTopicSearch("");});
$("#backButton").onclick=()=>{location.hash="";};
$("#closeDetail").onclick=()=>$("#detail").close();
$("#methodButton").onclick=()=>$("#method").showModal();
$("#closeMethod").onclick=()=>$("#method").close();
document.addEventListener("keydown",event=>{if(event.key==="/"&&!/input/i.test(event.target.tagName)){event.preventDefault();$(location.hash?"#topicSearch":"#search").focus();}});
window.addEventListener("hashchange",()=>setRoute(location.hash.slice(1)));
renderHome();setRoute(location.hash.slice(1));

const validationIssues=(()=>{const issues=[];Object.values(packs).forEach(pack=>{pack.vocabulary.forEach(item=>{if(item.collocations.length!==item.collocationsZh.length)issues.push(`${item.id}: missing collocation translations`);if(item.examples.length<3||item.examples.length!==item.examplesZh.length)issues.push(`${item.id}: examples incomplete`);});pack.idioms.forEach(item=>{if(item.examples.length<3||item.examples.length!==item.examplesZh.length)issues.push(`${pack.topic.id}/${item.phrase}: idiom examples incomplete`);});});return issues;})();
console.info(`CEFR data validation: ${validationIssues.length?validationIssues.join("\n"):`${topics.length} topics valid`}`);
