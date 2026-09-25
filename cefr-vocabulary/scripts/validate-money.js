const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const context={window:{CEFR_TOPICS:[{id:'money',category:'Finance',taxonomyReferences:['https://dictionary.cambridge.org/topics/finance/paying-money/','https://dictionary.cambridge.org/topics/finance/saving-and-savings-accounts/']}],CEFR_ADDITIONAL_TOPIC_PACKS:{}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data/money-b2-copy.js'),'utf8'),context);
const pack=context.window.CEFR_ADDITIONAL_TOPIC_PACKS.money;
assert.equal(pack.vocabulary.length,50);
assert.equal(pack.scenes.length,5);
assert.equal(pack.idioms.length,4);
assert.equal(new Set(pack.vocabulary.map(v=>v.id)).size,50);
const examples=[];
for(const word of pack.vocabulary){
  assert.ok(word.sense.definition.length>20,word.id);
  assert.match(word.sense.definitionZh,/[\u4e00-\u9fff]/,word.id);
  for(const field of ['collocations','examples']){
    assert.equal(word[field].length,3,word.id+' '+field);
    assert.equal(word[field+'Zh'].length,3,word.id+' '+field+'Zh');
    word[field+'Zh'].forEach(text=>assert.match(text,/[\u4e00-\u9fff]/));
  }
  examples.push(...word.examples);
}
assert.equal(new Set(examples).size,150,'Examples must be distinct');
for(const idiom of pack.idioms){
  assert.equal(idiom.examples.length,3);
  assert.equal(idiom.examplesZh.length,3);
  idiom.examplesZh.forEach(text=>assert.match(text,/[\u4e00-\u9fff]/));
}
if(process.argv.includes('--content-only')){
  console.log('Money content OK: 50 words, 150 distinct bilingual examples, 150 bilingual collocations, 12 idiom examples.');
  process.exit(0);
}
const assets=pack.scenes.flatMap(scene=>[
  {file:scene.image,width:1200},
  ...scene.visualCards.map(card=>({file:card.image,width:768}))
]);
const hashes=new Set();let total=0;
for(const {file,width} of assets){
  const data=fs.readFileSync(path.join(root,file));
  assert.equal(data.toString('ascii',0,4),'RIFF',file);
  assert.equal(data.toString('ascii',8,12),'WEBP',file);
  let decodedWidth;
  for(let offset=12;offset+8<=data.length;){
    const type=data.toString('ascii',offset,offset+4),length=data.readUInt32LE(offset+4);
    if(type==='VP8 ')decodedWidth=data.readUInt16LE(offset+14)&0x3fff;
    if(type==='VP8X')decodedWidth=data.readUIntLE(offset+12,3)+1;
    offset+=8+length+(length%2);
  }
  assert.equal(decodedWidth,width,`${file}: wrong delivery width`);
  hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
  total+=data.length;
}
assert.equal(assets.length,55);
assert.equal(hashes.size,55,'Every image must be distinct');
console.log(`Money OK: 50 words, 5 scenes, 55 distinct correctly sized images (${(total/1048576).toFixed(1)} MiB), complete bilingual copy.`);
