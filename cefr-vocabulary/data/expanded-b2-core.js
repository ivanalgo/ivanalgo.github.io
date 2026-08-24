(function(){
  const positions=[[12,18],[34,20],[56,17],[80,21],[18,43],[41,45],[64,42],[84,48],[29,74],[72,76]];
  const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  const templates={
    noun:(word,topic,zh)=>[[`The ${word} was discussed in detail before a decision was made.`,`在作出决定前，大家详细讨论了“${zh}”这一事项。`],[`Experts explained why the ${word} matters in this ${topic} context.`,`专家解释了为什么“${zh}”在这一${topic}情境中很重要。`]],
    adjective:(word,topic,zh)=>[[`The group described the situation as ${word}.`,`小组用“${zh}”来描述这种情况。`],[`A more ${word} approach may produce better results.`,`采取更符合“${zh}”特点的方法，可能会带来更好的结果。`]],
    verb:(word,topic,zh)=>[[`People often need to ${word} when circumstances change.`,`情况变化时，人们常常需要采取与“${zh}”相关的行动。`],[`It can be difficult to ${word} without careful planning.`,`如果没有认真规划，要做到“${zh}”可能并不容易。`]],
    adverb:(word,topic,zh)=>[[`The situation changed ${word} over time.`,`随着时间推移，情况以“${zh}”所表达的方式发生了变化。`],[`The speaker explained the point ${word}.`,`发言者按照“${zh}”所表达的方式解释了这一点。`]]
  };
  function makeWord(topic,scene,raw,peers){
    const [display,partOfSpeech,definition,definitionZh,collocations,collocationsZh,example,exampleZh,ipa=""]=raw;
    const type=partOfSpeech.includes("adjective")?"adjective":partOfSpeech.includes("verb")?"verb":partOfSpeech.includes("adverb")?"adverb":"noun";
    const generated=templates[type](display,topic.titleZh,definitionZh);
    return {
      id:`${topic.id}-${slug(display)}`,display,partOfSpeech,ipa,
      sense:{definition,definitionZh,cefr:"B2",cefrEvidence:{status:"inferred",reference:topic.taxonomyReferences[0]}},
      collocations:collocations.split("|"),collocationsZh:collocationsZh.split("|"),
      examples:[example,...generated.map(item=>item[0])],examplesZh:[exampleZh,...generated.map(item=>item[1])],
      relatedWords:peers.filter(value=>value!==display).slice(0,2).map(value=>`${topic.id}-${slug(value)}`),
      topic:{category:topic.category,subtopic:scene.subtopic},scenes:[scene.id],tags:[topic.id,scene.id,topic.titleZh]
    };
  }
  window.CEFR_EXPAND_TOPIC=function(topicId,spec){
    const pack=window.CEFR_ADDITIONAL_TOPIC_PACKS[topicId];
    const topic=pack.topic;
    const existingById=Object.fromEntries(pack.scenes.map(scene=>[scene.id,scene]));
    Object.entries(spec.existingImages).forEach(([id,image])=>{existingById[id].image=image;delete existingById[id].icon;});
    const newScenes=Object.fromEntries(spec.newScenes.map(scene=>[scene.id,{...scene,accent:topic.accent,accent2:topic.accent2,labels:[]} ]));
    const allScenes={...existingById,...newScenes};
    Object.entries(spec.words).forEach(([sceneId,rows])=>{
      const scene=allScenes[sceneId];
      const peerNames=[...pack.vocabulary.filter(item=>item.scenes.includes(sceneId)).map(item=>item.display),...rows.map(row=>row[0])];
      rows.forEach(row=>pack.vocabulary.push(makeWord(topic,scene,row,peerNames)));
    });
    pack.scenes=spec.sceneOrder.map(id=>allScenes[id]);
    pack.scenes.forEach(scene=>{
      const words=pack.vocabulary.filter(item=>item.scenes.includes(scene.id));
      words.forEach(item=>{item.relatedWords=item.relatedWords.map(value=>pack.vocabulary.some(candidate=>candidate.id===value)?value:words.find(candidate=>candidate.id!==item.id)?.id).filter(Boolean).slice(0,2);});
      scene.labels=words.map((item,index)=>({id:item.id,x:positions[index][0],y:positions[index][1]}));
    });
  };
})();
