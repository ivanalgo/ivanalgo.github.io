#!/usr/bin/env node
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.resolve(__dirname,"..");
const args=Object.fromEntries(process.argv.slice(2).map((value,index,list)=>value.startsWith("--")?[value.slice(2),list[index+1]]:null).filter(Boolean));
const context={console};
context.window=context;
vm.createContext(context);

[
  "data/topics.js",
  "data/additional-b2.js",
  "data/expanded-b2-core.js",
  "data/travel-b2-expanded.js",
  "data/work-b2-expanded.js",
  "data/technology-b2-expanded.js",
  "data/environment-b2-expanded.js",
  "data/health-b2-expanded.js"
].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file}));

const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const topics=Object.values(context.CEFR_ADDITIONAL_TOPIC_PACKS)
  .filter(pack=>!args.topic||pack.topic.id===args.topic)
  .flatMap(pack=>pack.scenes
    .filter(scene=>!args.scene||scene.id===args.scene)
    .flatMap(scene=>pack.vocabulary
      .filter(item=>item.scenes.includes(scene.id))
      .map(item=>{
        const imageName=slug(item.display);
        const gentle=pack.topic.id==="health"?"Keep all medical content calm, respectful, non-graphic and reassuring. ":"";
        return {
          topicId:pack.topic.id,
          topicTitle:pack.topic.title,
          sceneId:scene.id,
          sceneTitle:scene.title,
          display:item.display,
          definition:item.sense.definition,
          definitionZh:item.sense.definitionZh,
          collocation:item.collocations[0],
          example:item.examples[0],
          reference:path.join(root,scene.image),
          output:path.join(root,"assets/images",pack.topic.id,`${scene.id}-cards`,`${imageName}.webp`),
          prompt:[
            "Use case: illustration-story",
            "Asset type: 4:3 visual vocabulary card for an adult B2 English-learning website",
            `Input image: style-only reference for the ${pack.topic.title} / ${scene.title} topic; create a new image and do not copy its layout`,
            `Primary request: teach the word or phrase \"${item.display}\" by showing its precise sense: ${item.sense.definition}.`,
            `Scene/backdrop: a concrete, immediately understandable moment inspired by \"${item.collocations[0]}\" and the example \"${item.examples[0]}\".`,
            "Style/medium: polished contemporary editorial illustration, bright natural background, warm human detail, clean shapes, sophisticated but approachable",
            "Composition/framing: one dominant action or relationship, medium or close framing, clear focal point, readable at thumbnail size; no collage and no multi-panel layout",
            `Constraints: ${gentle}show the exact requested sense rather than another meaning of the word; diverse natural-looking adults where people are needed; no written words, letters, captions, labels, UI, logos, trademarks or watermark`,
            "Avoid: vague symbolism, dark murky lighting, decorative clutter, duplicated people, distorted hands"
          ].join("\n")
        };
      })));

if(!topics.length){
  console.error("No visual-card prompts matched the requested topic and scene.");
  process.exit(1);
}
process.stdout.write(JSON.stringify(topics,null,2));
