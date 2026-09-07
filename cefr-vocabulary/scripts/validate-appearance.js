require('./validate-data.js');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const prompts=require('../data/appearance-image-prompts.json');
const pack=global.CEFR_ADDITIONAL_TOPIC_PACKS.appearance;
assert.ok(pack,'Appearance topic must be registered');
assert.equal(pack.vocabulary.length,50);
assert.equal(pack.scenes.length,5);
const hashes=new Set(),sentences=new Set();
for(const scene of pack.scenes){
  const planned=prompts.scenes.find(s=>s.id===scene.id);
  assert.ok(planned);
  assert.deepEqual(pack.vocabulary.filter(w=>w.scenes.includes(scene.id)).map(w=>w.display),planned.cards.map(([word])=>word));
  for(const asset of [scene.image,...scene.visualCards.map(card=>card.image)]){
    assert.ok(asset.endsWith('.webp'),'Use web-ready images, not placeholders');
    const data=fs.readFileSync(path.join(__dirname,'..',asset));
    assert.equal(data.subarray(0,4).toString(),'RIFF');
    assert.equal(data.subarray(8,12).toString(),'WEBP');
    hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
  }
}
assert.equal(hashes.size,55,'All images must be distinct');
for(const word of pack.vocabulary){
  assert.equal(word.collocations.length,3);
  assert.equal(word.examples.length,3);
  assert.ok(!/in this context|quality described as/.test(word.sense.definition));
  for(const text of [word.sense.definitionZh,...word.collocationsZh,...word.examplesZh])assert.match(text,/[\u3400-\u9fff]/);
  word.examples.forEach(s=>sentences.add(s));
}
assert.equal(sentences.size,150);
assert.equal(pack.idioms.length,4);
console.log('Appearance: 55 distinct WebP assets, 50 words, 150 distinct bilingual examples, 4 idioms; prompt mappings match.');
