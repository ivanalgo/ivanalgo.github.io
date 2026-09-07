/* Regression checks for the recovered Life Stages topic. */
require('./validate-data.js');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const pack=global.CEFR_ADDITIONAL_TOPIC_PACKS['life-stages'];
const assets=pack.scenes.flatMap(scene=>[scene.image,...scene.visualCards.map(card=>card.image)]);
assert.equal(assets.length,55);
assert.equal(new Set(assets).size,55,'Image paths must be unique');
const hashes=assets.map(asset=>{
  assert.ok(!asset.startsWith('data:'),'No generated icon placeholders');
  const data=fs.readFileSync(path.join(__dirname,'..',asset));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Expected PNG');
  return crypto.createHash('sha256').update(data).digest('hex');
});
assert.equal(new Set(hashes).size,55,'Do not reuse identical images');
const sentences=[];
for(const item of pack.vocabulary){
  assert.ok(!/in this context|quality described as/.test(item.sense.definition),'Replace generic definitions');
  assert.equal(item.examples.length,3);
  assert.equal(item.collocations.length,3);
  for(const zh of [...item.examplesZh,...item.collocationsZh])assert.match(zh,/[\u3400-\u9fff]/);
  sentences.push(...item.examples);
}
assert.equal(new Set(sentences).size,150,'Examples must not repeat');
assert.ok(pack.idioms.every(idiom=>idiom.examples.every(sentence=>!sentence.includes('People often use'))));
console.log('Life Stages: 55 distinct PNGs, 150 distinct bilingual examples, no placeholder definitions.');
