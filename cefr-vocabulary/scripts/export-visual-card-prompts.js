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
  ,"data/remaining-b2-topics.js"
].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file}));

const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const matchingPacks=Object.values(context.CEFR_ADDITIONAL_TOPIC_PACKS)
  .filter(pack=>!args.topic||pack.topic.id===args.topic);
const styleReferences={
  society:"assets/images/environment/action-policy-v2.webp",
  science:"assets/images/technology/digital-innovation-v2.webp",
  education:"assets/images/work/careers-growth-v2.webp",
  communication:"assets/images/work/communication-meetings-v2.webp"
};
const overview=args.overview==="true";
const topics=overview?matchingPacks.flatMap(pack=>pack.scenes
  .filter(scene=>!args.scene||scene.id===args.scene)
  .map(scene=>({
    topicId:pack.topic.id,
    topicTitle:pack.topic.title,
    sceneId:scene.id,
    sceneTitle:scene.title,
    reference:path.join(root,styleReferences[pack.topic.id]||"assets/images/music/music-emotion-v2.webp"),
    output:path.join(root,"assets/images",pack.topic.id,`${scene.id}-v2.webp`),
    prompt:[
      "Use case: illustration-story",
      "Asset type: wide 16:9 scene overview for an adult B2 English-learning website",
      `Input image: style-only reference; create a new illustration for ${pack.topic.title} / ${scene.title} and do not copy the reference composition`,
      `Primary request: show a coherent, believable learning scene about ${scene.description}`,
      `Subject: adults naturally engaged with these ten ideas: ${pack.vocabulary.filter(item=>item.scenes.includes(scene.id)).map(item=>item.display).join(", ")}.`,
      "Style/medium: polished contemporary editorial illustration, bright natural background, warm human detail, clean shapes, sophisticated but approachable",
      "Composition/framing: one connected wide scene with 3–6 people or focal objects; clear foreground, middle ground and background; no collage and no multi-panel layout",
      "Lighting/mood: airy daylight, optimistic and calm, high legibility",
      "Constraints: show several concrete actions from the scene; diverse natural-looking adults where people are needed; no written words, letters, captions, labels, UI, logos, trademarks or watermark",
      "Avoid: vague symbolism, dark murky lighting, decorative clutter, duplicated people, distorted hands"
    ].join("\n")
  }))):matchingPacks
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
  console.error("No image prompts matched the requested topic and scene.");
  process.exit(1);
}
process.stdout.write(JSON.stringify(topics,null,2));
