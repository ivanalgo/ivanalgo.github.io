(function(){
  const r=(display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa="")=>[display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa];
  CEFR_EXPAND_TOPIC("environment",{
    sceneOrder:["climate-energy","nature-resources","pollution-waste","everyday-impact","action-policy"],
    existingImages:{
      "climate-energy":"assets/images/environment/climate-energy-v2.webp",
      "nature-resources":"assets/images/environment/ecosystems-biodiversity-v2.webp",
      "everyday-impact":"assets/images/environment/everyday-choices-v2.webp"
    },
    newScenes:[
      {id:"pollution-waste",title:"Pollution & Waste",titleZh:"污染与废弃物",subtopic:"Environmental issues",image:"assets/images/environment/pollution-waste-v2.webp",description:"Describe pollution, waste systems and practical environmental clean-up."},
      {id:"action-policy",title:"Environmental Action & Policy",titleZh:"环保行动与政策",subtopic:"Environmental issues",image:"assets/images/environment/action-policy-v2.webp",description:"Use evidence, campaigns and policy to create measurable environmental change."}
    ],
    words:{
      "climate-energy":[
        r("greenhouse gas","noun","a gas that traps heat in the earth's atmosphere","温室气体","greenhouse gas emissions|reduce greenhouse gases|major greenhouse gas","温室气体排放|减少温室气体|主要温室气体","Carbon dioxide is a major greenhouse gas.","二氧化碳是一种主要的温室气体。"),
        r("global warming","noun","the long-term rise in the earth's average temperature","全球变暖","limit global warming|cause global warming|effects of global warming","限制全球变暖|导致全球变暖|全球变暖的影响","Scientists warn that global warming is changing rainfall patterns.","科学家警告说，全球变暖正在改变降雨模式。"),
        r("energy-efficient","adjective","using less energy to provide the same result","节能的；高能效的","energy-efficient home|energy-efficient appliance|more energy-efficient","节能住宅|节能电器|能效更高","Energy-efficient windows reduce the need for heating.","节能窗可以减少供暖需求。"),
        r("fossil fuel","noun","coal, oil or gas formed underground and burned for energy","化石燃料","burn fossil fuels|fossil-fuel industry|depend on fossil fuels","燃烧化石燃料|化石燃料行业|依赖化石燃料","The country is reducing its dependence on fossil fuels.","这个国家正在减少对化石燃料的依赖。"),
        r("carbon-neutral","adjective","causing no net increase in carbon dioxide in the atmosphere","碳中和的","carbon-neutral business|become carbon-neutral|carbon-neutral target","碳中和企业|实现碳中和|碳中和目标","The university aims to become carbon-neutral by 2035.","这所大学计划在2035年前实现碳中和。"),
        r("conserve","verb","to protect resources and avoid wasting them","节约；保护","conserve energy|conserve water|conserve natural resources","节约能源|节约用水|保护自然资源","Simple changes can help households conserve water.","简单的改变可以帮助家庭节约用水。")
      ],
      "nature-resources":[
        r("ecosystem","noun","all the living things in an area and their relationship with the environment","生态系统","healthy ecosystem|marine ecosystem|protect an ecosystem","健康的生态系统|海洋生态系统|保护生态系统","The wetland is a complex and productive ecosystem.","这片湿地是一个复杂而富有生机的生态系统。"),
        r("species","noun","a group of animals or plants with shared characteristics","物种","native species|threatened species|protect a species","本地物种|受威胁物种|保护物种","Several native species depend on the forest.","几个本地物种依赖这片森林生存。"),
        r("extinction","noun","the complete disappearance of a species","灭绝","face extinction|risk of extinction|prevent extinction","面临灭绝|灭绝风险|防止灭绝","Habitat loss has pushed the animal close to extinction.","栖息地丧失使这种动物接近灭绝。"),
        r("deforestation","noun","the cutting down and removal of large areas of forest","森林砍伐","tackle deforestation|rapid deforestation|cause deforestation","治理森林砍伐|快速毁林|导致毁林","Satellite images show rapid deforestation in the region.","卫星图像显示该地区森林砍伐速度很快。"),
        r("restore","verb","to return a damaged natural place to a healthier condition","修复；恢复","restore a habitat|restore woodland|fully restore","修复栖息地|恢复林地|完全修复","Volunteers are helping to restore the riverbank.","志愿者正在帮助修复河岸。"),
        r("wildlife","noun","animals and plants living naturally in an area","野生生物","protect wildlife|local wildlife|wildlife population","保护野生生物|当地野生生物|野生动物种群","The road includes safe crossings for local wildlife.","这条道路设有供当地野生动物安全通过的通道。")
      ],
      "everyday-impact":[
        r("disposable","adjective","designed to be thrown away after a single use","一次性的","disposable product|single-use disposable|disposable packaging","一次性产品|一次性用品|一次性包装","The restaurant has stopped using disposable cutlery.","这家餐厅已停止使用一次性餐具。"),
        r("consumption","noun","the amount of resources, energy or products that people use","消耗；消费","energy consumption|reduce consumption|excessive consumption","能源消耗|减少消耗|过度消费","Smart meters help families reduce energy consumption.","智能电表帮助家庭减少能源消耗。"),
        r("reuse","verb","to use something again instead of throwing it away","再次使用；重复利用","reuse a container|reuse materials|safely reuse","重复使用容器|再利用材料|安全重复使用","The shop encourages customers to reuse containers.","这家商店鼓励顾客重复使用容器。"),
        r("waste","noun","unwanted material or resources used without benefit","废弃物；浪费","food waste|reduce waste|household waste","食物浪费|减少废弃物|生活垃圾","Meal planning can greatly reduce food waste.","规划餐食可以显著减少食物浪费。"),
        r("eco-friendly","adjective","causing little or no harm to the environment","环保的","eco-friendly product|eco-friendly alternative|more eco-friendly","环保产品|环保替代方案|更加环保","The hotel offers an eco-friendly alternative to daily towel changes.","酒店提供了每日更换毛巾的环保替代方案。"),
        r("compost","verb","to allow food and plant waste to decay into material that improves soil","堆肥处理","compost food waste|home composting|compostable material","用食物垃圾堆肥|家庭堆肥|可堆肥材料","Residents can compost fruit and vegetable waste.","居民可以用果蔬垃圾制作堆肥。")
      ],
      "pollution-waste":[
        r("contaminate","verb","to make water, land or air dirty or unsafe","污染；使受污染","contaminate water|chemically contaminated|contaminated soil","污染水源|受到化学污染|受污染土壤","A fuel leak contaminated the nearby stream.","燃油泄漏污染了附近的溪流。"),
        r("toxic","adjective","poisonous and harmful to people, animals or the environment","有毒的","toxic waste|toxic chemical|highly toxic","有毒废物|有毒化学品|剧毒的","The factory was fined for releasing toxic chemicals.","这家工厂因排放有毒化学品而被罚款。"),
        r("landfill","noun","a place where large amounts of rubbish are buried","垃圾填埋场","send to landfill|landfill site|reduce landfill waste","送往填埋场|垃圾填埋场|减少填埋垃圾","Repairing appliances keeps useful materials out of landfill.","维修电器可以避免有用材料被送往填埋场。"),
        r("litter","noun","rubbish left in public places","乱扔的垃圾","drop litter|pick up litter|plastic litter","乱扔垃圾|捡拾垃圾|塑料垃圾","Volunteers picked up litter along the river.","志愿者沿河捡拾了垃圾。"),
        r("sewage","noun","waste water and human waste carried away through pipes","污水；生活废水","raw sewage|sewage treatment|sewage system","未经处理的污水|污水处理|排污系统","The new plant prevents raw sewage entering the sea.","新工厂防止未经处理的污水流入海洋。"),
        r("air quality","noun","the degree to which the air is clean and safe to breathe","空气质量","poor air quality|monitor air quality|improve air quality","空气质量差|监测空气质量|改善空气质量","Traffic restrictions improved air quality in the centre.","交通限制改善了市中心的空气质量。"),
        r("clean-up","noun","an organised activity to remove dirt, waste or pollution","清理行动","beach clean-up|clean-up operation|organise a clean-up","海滩清理|清理行动|组织清理","More than 200 people joined the beach clean-up.","两百多人参加了海滩清理行动。"),
        r("hazardous","adjective","dangerous to health, safety or the environment","有害的；危险的","hazardous waste|hazardous substance|potentially hazardous","危险废物|有害物质|可能有害","Batteries must be treated as hazardous waste.","电池必须作为危险废物处理。"),
        r("microplastic","noun","an extremely small piece of plastic found in water, soil and living things","微塑料","microplastic pollution|microplastic particle|reduce microplastics","微塑料污染|微塑料颗粒|减少微塑料","Researchers found microplastics in the lake water.","研究人员在湖水中发现了微塑料。"),
        r("treatment","noun","a process that makes waste or polluted water safer","处理；净化","waste treatment|water treatment|treatment facility","废物处理|水处理|处理设施","The treatment facility cleans water before it reaches the river.","处理设施会在水流入河道前将其净化。")
      ],
      "action-policy":[
        r("environmentalist","noun","a person who works to protect the natural environment","环保人士","leading environmentalist|environmental campaigner|local environmentalist","知名环保人士|环保活动者|当地环保人士","Local environmentalists opposed the development plan.","当地环保人士反对这项开发计划。"),
        r("campaign","noun","a planned series of activities intended to achieve environmental change","运动；宣传活动","public campaign|launch a campaign|awareness campaign","公众运动|发起行动|宣传活动","The council launched a campaign to reduce food waste.","市政府发起了一场减少食物浪费的行动。"),
        r("legislation","noun","a law or group of laws made by a government","立法；法规","environmental legislation|introduce legislation|strict legislation","环境法规|出台法律|严格法规","New legislation limits the use of single-use plastics.","新法规限制使用一次性塑料。"),
        r("target","noun","a result that an organisation or government aims to achieve","目标","emissions target|meet a target|ambitious target","排放目标|达到目标|宏伟目标","The city met its recycling target two years early.","这座城市提前两年达到了回收目标。"),
        r("commitment","noun","a firm promise to do something","承诺；投入","firm commitment|commitment to sustainability|show commitment","坚定承诺|对可持续发展的承诺|表现出投入","The agreement shows a long-term commitment to conservation.","这项协议显示了对自然保护的长期承诺。"),
        r("monitor","verb","to regularly check a situation or measure change","监测；监督","monitor pollution|closely monitor|monitor progress","监测污染|密切监控|监督进展","Sensors monitor pollution levels throughout the day.","传感器全天监测污染水平。"),
        r("evidence","noun","facts or information showing whether a belief or claim is true","证据","scientific evidence|strong evidence|gather evidence","科学证据|有力证据|收集证据","Policy should be based on the best available evidence.","政策应以现有最佳证据为基础。"),
        r("policy","noun","an official plan used to guide decisions and action","政策","climate policy|public policy|implement a policy","气候政策|公共政策|实施政策","The new policy requires greener public transport.","新政策要求采用更环保的公共交通。"),
        r("accountability","noun","the duty to explain decisions and accept responsibility for them","问责；责任制","public accountability|ensure accountability|corporate accountability","公众问责|确保问责|企业责任","Transparent reporting improves corporate accountability.","透明报告可以提高企业问责。"),
        r("advocate","verb","to publicly support a particular environmental action or policy","倡导；主张","advocate change|strongly advocate|advocate for protection","倡导改变|强烈主张|倡导保护","Scientists advocate stronger protection for the wetland.","科学家主张加强对湿地的保护。")
      ]
    }
  });
})();
