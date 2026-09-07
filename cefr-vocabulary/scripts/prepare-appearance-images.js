/* Encode completed imagegen PNGs as web-ready WebP assets without changing their composition. */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const manifest=require('../data/appearance-image-prompts.json');
const base=path.join(__dirname,'../assets/images/appearance');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const names=manifest.scenes.flatMap(s=>[`${s.id}-v2`,...s.cards.map(([word])=>`${s.id}-cards/${slug(word)}`)]);
const missing=names.filter(name=>!fs.existsSync(path.join(base,name+'.png')));
const partial=process.argv.includes('--partial');
if(missing.length&&!partial){console.error(`Still missing ${missing.length} source images:\n${missing.join('\n')}`);process.exit(1);}
const available=names.filter(name=>fs.existsSync(path.join(base,name+'.png')));
let sourceBytes=0,webBytes=0;
for(const name of available){
  const input=path.join(base,name+'.png'),output=path.join(base,name+'.webp');
  if(!fs.existsSync(output))execFileSync('cwebp',['-quiet','-q','86','-m','6',input,'-o',output]);
  sourceBytes+=fs.statSync(input).size;webBytes+=fs.statSync(output).size;
}
console.log(`${available.length}/${names.length} images: ${(sourceBytes/1048576).toFixed(1)} MiB PNG → ${(webBytes/1048576).toFixed(1)} MiB WebP`);
