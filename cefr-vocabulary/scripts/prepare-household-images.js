/* Convert built-in imagegen PNG originals into lightweight web assets. */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const manifest=require('../data/household-image-prompts.json');
const base=path.join(__dirname,'../assets/images/household');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const assets=manifest.scenes.flatMap(scene=>[
  {name:`${scene.id}-v2`,width:1200},
  ...scene.cards.map(([word])=>({name:`${scene.id}-cards/${slug(word)}`,width:768}))
]);
const available=assets.filter(asset=>fs.existsSync(path.join(base,asset.name+'.png')));
const missing=assets.filter(asset=>!fs.existsSync(path.join(base,asset.name+'.png')));
if(missing.length&&!process.argv.includes('--partial')){
  console.error(`Still missing ${missing.length} source images:\n${missing.map(item=>item.name).join('\n')}`);
  process.exit(1);
}
let sourceBytes=0,webBytes=0;
for(const asset of available){
  const input=path.join(base,asset.name+'.png');
  const output=path.join(base,asset.name+'.webp');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  execFileSync('cwebp',['-quiet','-q','82','-m','6','-resize',String(asset.width),'0',input,'-o',output]);
  sourceBytes+=fs.statSync(input).size;
  webBytes+=fs.statSync(output).size;
}
console.log(`${available.length}/${assets.length} images: ${(sourceBytes/1048576).toFixed(1)} MiB PNG → ${(webBytes/1048576).toFixed(1)} MiB WebP; cards 768px, overviews 1200px`);
