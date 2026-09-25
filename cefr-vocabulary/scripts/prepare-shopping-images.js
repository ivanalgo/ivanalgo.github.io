/* Mechanical resizing only; source illustrations come from built-in imagegen. */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const manifest=require('../data/shopping-image-prompts.json');
const base=path.join(__dirname,'../assets/images/shopping');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const assets=manifest.scenes.flatMap(scene=>[
  {name:`${scene.id}-v2`,width:1200},
  ...scene.cards.map(([word])=>({name:`${scene.id}-cards/${slug(word)}`,width:768}))
]);
const available=assets.filter(a=>fs.existsSync(path.join(base,a.name+'.png')));
const missing=assets.filter(a=>!fs.existsSync(path.join(base,a.name+'.png')));
if(missing.length&&!process.argv.includes('--partial')){
  console.error(`Missing ${missing.length} originals:\n${missing.map(a=>a.name).join('\n')}`);
  process.exit(1);
}
let sourceBytes=0,webBytes=0;
for(const asset of available){
  const input=path.join(base,asset.name+'.png'),output=path.join(base,asset.name+'.webp');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  if(!fs.existsSync(output)||fs.statSync(output).mtimeMs<fs.statSync(input).mtimeMs){
    execFileSync('cwebp',['-quiet','-q','82','-m','6','-resize',String(asset.width),'0',input,'-o',output]);
  }
  sourceBytes+=fs.statSync(input).size;webBytes+=fs.statSync(output).size;
}
console.log(`${available.length}/${assets.length} images: ${(sourceBytes/1048576).toFixed(1)} MiB PNG → ${(webBytes/1048576).toFixed(1)} MiB WebP; cards 768px, overviews 1200px`);
