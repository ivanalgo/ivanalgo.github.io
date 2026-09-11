const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const manifest=require('../data/household-image-prompts.json');
const base=path.join(__dirname,'../assets/images/household');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const assets=manifest.scenes.flatMap(scene=>[
  `${scene.id}-v2.webp`,
  ...scene.cards.map(([word])=>`${scene.id}-cards/${slug(word)}.webp`)
]);
assert.equal(manifest.scenes.length,5);
assert.equal(manifest.scenes.flatMap(scene=>scene.cards).length,50);
assert.equal(assets.length,55);
const hashes=new Set();
for(const asset of assets){
  const data=fs.readFileSync(path.join(base,asset));
  assert.equal(data.subarray(0,4).toString(),'RIFF',`${asset} is not WebP`);
  assert.equal(data.subarray(8,12).toString(),'WEBP',`${asset} is not WebP`);
  hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
}
assert.equal(hashes.size,55,'Every household illustration must be distinct');
console.log('Household images: 5 overviews + 50 distinct word cards; all WebP assets present.');
