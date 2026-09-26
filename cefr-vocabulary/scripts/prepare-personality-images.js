/* Mechanical resizing only; source illustrations were previously generated with imagegen. */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const base=path.join(__dirname,'../assets/images/personality');
const files=[];
for(const entry of fs.readdirSync(base,{withFileTypes:true})){
  if(entry.isFile()&&entry.name.endsWith('-v2.png'))files.push(path.join(base,entry.name));
  if(entry.isDirectory()&&entry.name.endsWith('-cards')){
    for(const name of fs.readdirSync(path.join(base,entry.name))){
      if(name.endsWith('.png'))files.push(path.join(base,entry.name,name));
    }
  }
}
if(files.length!==55){
  console.error(`Expected 55 PNG originals, found ${files.length}`);
  process.exit(1);
}
let sourceBytes=0,webBytes=0;
for(const input of files){
  const output=input.replace(/\.png$/,'.webp');
  const width=input.includes('-cards/')?768:1200;
  if(!fs.existsSync(output)||fs.statSync(output).mtimeMs<fs.statSync(input).mtimeMs){
    execFileSync('cwebp',['-quiet','-q','82','-m','6','-resize',String(width),'0',input,'-o',output]);
  }
  sourceBytes+=fs.statSync(input).size;
  webBytes+=fs.statSync(output).size;
}
console.log(`55 images: ${(sourceBytes/1048576).toFixed(1)} MiB PNG → ${(webBytes/1048576).toFixed(1)} MiB WebP; cards 768px, overviews 1200px`);
