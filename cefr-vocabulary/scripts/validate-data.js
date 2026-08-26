/* Optional: node cefr-vocabulary/scripts/validate-data.js (no dependencies). */
global.window=global;
const fs=require("fs");
const path=require("path");
require("../data/topics.js");
require("../data/scenes-music-b2.js");
require("../data/music-b2.js");
require("../data/music-b2-zh.js");
require("../data/music-b2-examples.js");
require("../data/additional-b2.js");
require("../data/expanded-b2-core.js");
require("../data/travel-b2-expanded.js");
require("../data/work-b2-expanded.js");
require("../data/technology-b2-expanded.js");
require("../data/environment-b2-expanded.js");
require("../data/health-b2-expanded.js");
require("../data/remaining-b2-topics.js");

const packs={music:{topic:CEFR_TOPICS.find(item=>item.id==="music"),vocabulary:CEFR_VOCABULARY,scenes:CEFR_SCENES,idioms:CEFR_LEARNING_NOTES.idioms},...CEFR_ADDITIONAL_TOPIC_PACKS};
const errors=[];
let wordCount=0,sceneCount=0,exampleCount=0,idiomExampleCount=0;

CEFR_TOPICS.forEach(topic=>{
  const pack=packs[topic.id];
  if(!pack){errors.push(`${topic.id}: missing topic pack`);return;}
  const ids=new Set();
  const sceneIds=new Set(pack.scenes.map(scene=>scene.id));
  if(pack.vocabulary.length!==50)errors.push(`${topic.id}: expected 50 vocabulary senses, found ${pack.vocabulary.length}`);
  if(pack.scenes.length!==5)errors.push(`${topic.id}: expected 5 scenes, found ${pack.scenes.length}`);
  pack.vocabulary.forEach(item=>{
    if(ids.has(item.id))errors.push(`${topic.id}: duplicate vocabulary ID ${item.id}`);
    ids.add(item.id);
    if(!item.sense?.definition||!item.sense?.definitionZh)errors.push(`${item.id}: missing definition`);
    if(!["A1","A2","B1","B2","C1","C2"].includes(item.sense?.cefr))errors.push(`${item.id}: invalid CEFR`);
    if(!item.sense?.cefrEvidence?.reference)errors.push(`${item.id}: missing CEFR reference`);
    if(!item.collocations?.length||item.collocations.length!==item.collocationsZh?.length)errors.push(`${item.id}: collocations incomplete`);
    if(item.examples?.length<3||item.examples.length!==item.examplesZh?.length)errors.push(`${item.id}: examples incomplete`);
    item.scenes.forEach(scene=>{if(!sceneIds.has(scene))errors.push(`${item.id}: unknown scene ${scene}`);});
    item.relatedWords.forEach(related=>{if(!pack.vocabulary.some(candidate=>candidate.id===related||candidate.id===related.replace(/\s+/g,"-")))errors.push(`${item.id}: unknown related word ${related}`);});
  });
  pack.scenes.forEach(scene=>{
    if(scene.labels.length!==10)errors.push(`${topic.id}/${scene.id}: expected 10 labels, found ${scene.labels.length}`);
    if(!scene.image||!fs.existsSync(path.join(__dirname,"..",scene.image)))errors.push(`${topic.id}/${scene.id}: missing scene image ${scene.image||"(none)"}`);
    scene.labels.forEach(label=>{if(!pack.vocabulary.some(item=>item.id===label.id))errors.push(`${topic.id}/${scene.id}: unknown label ${label.id}`);});
    if(scene.visualCards?.length!==10)errors.push(`${topic.id}/${scene.id}: expected 10 visual cards, found ${scene.visualCards?.length||0}`);
    scene.visualCards?.forEach(card=>{
      if(!pack.vocabulary.some(item=>item.id===card.id))errors.push(`${topic.id}/${scene.id}: unknown visual-card word ${card.id}`);
      if(!card.alt)errors.push(`${topic.id}/${scene.id}/${card.id}: missing visual-card alt text`);
      if(!card.image||!fs.existsSync(path.join(__dirname,"..",card.image)))errors.push(`${topic.id}/${scene.id}/${card.id}: missing visual-card image ${card.image||"(none)"}`);
    });
  });
  pack.idioms.forEach(item=>{if(item.examples?.length<3||item.examples.length!==item.examplesZh?.length)errors.push(`${topic.id}/${item.phrase}: idiom examples incomplete`);});
  wordCount+=pack.vocabulary.length;sceneCount+=pack.scenes.length;
  exampleCount+=pack.vocabulary.reduce((sum,item)=>sum+item.examples.length,0);
  idiomExampleCount+=pack.idioms.reduce((sum,item)=>sum+item.examples.length,0);
});

if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`OK: ${CEFR_TOPICS.length} B2 topics, ${wordCount} vocabulary senses, ${sceneCount} scenes, ${exampleCount} vocabulary examples, ${idiomExampleCount} idiom examples`);
