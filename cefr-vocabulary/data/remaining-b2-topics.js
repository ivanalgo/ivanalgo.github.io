(function(){
  const positions=[[10,17],[30,16],[50,18],[70,16],[88,20],[13,49],[34,47],[56,49],[76,47],[89,72]];
  const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  const cap=value=>value.charAt(0).toUpperCase()+value.slice(1);
  function extraExamples(word,partOfSpeech,definitionZh,collocation,collocationZh){
    if(partOfSpeech.includes("verb"))return [
      [`The group decided to ${word} after considering the situation carefully.`,`小组认真考虑情况后，决定采取“${definitionZh}”这一行动。`],
      [`It is easier to ${word} when everyone understands the goal.`,`当每个人都理解目标时，就更容易做到“${definitionZh}”。`]
    ];
    if(partOfSpeech.includes("adjective"))return [
      [`The result was described as ${word} in the final report.`,`最终报告用“${definitionZh}”来描述这一结果。`],
      [`A more ${word} approach may produce a better outcome.`,`采用更符合“${definitionZh}”特点的方法，可能会取得更好的结果。`]
    ];
    return [
      [`${cap(collocation)} became an important part of the discussion.`,`“${collocationZh}”成为讨论中的一个重要部分。`],
      [`The class used a real example to understand the ${word}.`,`课堂用一个真实案例来理解“${definitionZh}”。`]
    ];
  }
  function build(config){
    const topic=window.CEFR_TOPICS.find(item=>item.id===config.id);
    const vocabulary=[];
    config.scenes.forEach((scene,sceneIndex)=>{
      const peerIds=scene.words.map(row=>`${config.id}-${slug(row[0])}`);
      scene.words.forEach((raw,index)=>{
        const [display,partOfSpeech,definition,definitionZh,collocations,collocationsZh,example,exampleZh,ipa=""]=raw;
        const collocationList=collocations.split("|");
        const collocationZhList=collocationsZh.split("|");
        const extra=extraExamples(display,partOfSpeech,definitionZh,collocationList[0],collocationZhList[0]);
        vocabulary.push({
          id:`${config.id}-${slug(display)}`,display,partOfSpeech,ipa,
          sense:{definition,definitionZh,cefr:"B2",cefrEvidence:{status:"inferred",reference:topic.taxonomyReferences[sceneIndex%topic.taxonomyReferences.length]}},
          collocations:collocationList,collocationsZh:collocationZhList,
          examples:[example,...extra.map(item=>item[0])],examplesZh:[exampleZh,...extra.map(item=>item[1])],
          relatedWords:[peerIds[(index+1)%peerIds.length],peerIds[(index+2)%peerIds.length]],
          topic:{category:topic.category,subtopic:scene.subtopic},scenes:[scene.id],tags:[config.id,scene.id,topic.titleZh]
        });
      });
    });
    const scenes=config.scenes.map(scene=>{
      const words=vocabulary.filter(item=>item.scenes.includes(scene.id));
      return {
        id:scene.id,title:scene.title,titleZh:scene.titleZh,subtopic:scene.subtopic,description:scene.description,
        image:`assets/images/${config.id}/${scene.id}-v2.webp`,accent:topic.accent,accent2:topic.accent2,
        labels:words.map((item,index)=>({id:item.id,x:positions[index][0],y:positions[index][1]})),
        visualCards:words.map(item=>({
          id:item.id,image:`assets/images/${config.id}/${scene.id}-cards/${item.id.replace(`${config.id}-`,"")}.webp`,
          alt:`Visual meaning of ${item.display}: ${item.sense.definition}`
        }))
      };
    });
    return {topic,vocabulary,scenes,idioms:config.idioms};
  }

  const configs=[
    {
      id:"society",
      scenes:[
        {id:"community-belonging",title:"Community & Belonging",titleZh:"社区与归属",subtopic:"Society: general words; Social groups",description:"Describe how people participate in local life and build a sense of belonging.",words:[
          ["resident","noun","a person who lives in a particular place","居民；住户","local resident|permanent resident|city resident","当地居民|永久居民|城市居民","Local residents helped redesign the public square.","当地居民协助重新设计了公共广场。"],
          ["neighbourhood","noun","an area of a town or city where people live","街区；社区","quiet neighbourhood|neighbourhood project|improve a neighbourhood","安静的街区|社区项目|改善街区","The neighbourhood project brought older and younger residents together.","这个社区项目让年长和年轻居民走到了一起。"],
          ["citizen","noun","a person who legally belongs to a country and has rights and responsibilities there","公民","responsible citizen|ordinary citizen|citizen participation","负责任的公民|普通公民|公民参与","Every citizen has a role in protecting public spaces.","每位公民都有责任保护公共空间。"],
          ["belonging","noun","the feeling of being accepted and comfortable in a group or place","归属感","sense of belonging|create belonging|social belonging","归属感|营造归属感|社会归属","Joining the choir gave her a strong sense of belonging.","加入合唱团让她有了强烈的归属感。"],
          ["participate","verb","to take part in an activity or event","参与；参加","participate actively|participate in society|encourage participation","积极参与|参与社会生活|鼓励参与","More young people are participating in local decision-making.","更多年轻人正在参与地方决策。"],
          ["volunteer","verb","to offer to do something without being paid or forced","自愿做；志愿服务","volunteer locally|volunteer to help|volunteer time","在本地做志愿服务|自愿帮忙|贡献志愿时间","Hundreds of people volunteered to deliver food during the flood.","洪水期间，数百人自愿运送食物。"],
          ["initiative","noun","a new plan intended to solve a problem or improve a situation","倡议；新计划","community initiative|launch an initiative|support an initiative","社区倡议|发起倡议|支持倡议","A community initiative turned the empty land into a garden.","一项社区倡议把空地变成了花园。"],
          ["mutual","adjective","felt or done equally by two or more people","相互的；共同的","mutual respect|mutual support|mutual benefit","相互尊重|相互支持|共同利益","Strong communities depend on mutual trust and support.","强大的社区依赖相互信任与支持。"],
          ["isolated","adjective","separated from other people or places and lacking contact","孤立的；与世隔绝的","feel isolated|socially isolated|isolated community","感到孤立|社会隔离的|偏远社区","The weekly club helps isolated residents make new friends.","每周的俱乐部活动帮助孤立的居民结交新朋友。"],
          ["grassroots","adjective","involving ordinary people in a community rather than powerful leaders","基层的；草根的","grassroots movement|grassroots organisation|grassroots support","草根运动|基层组织|基层支持","The campaign grew from a small grassroots movement.","这项活动由一个小型基层运动发展而来。"]
        ]},
        {id:"equality-opportunity",title:"Equality & Opportunity",titleZh:"平等与机会",subtopic:"Discrimination; Rights and opportunity",description:"Discuss fairness, barriers and access to opportunities in society.",words:[
          ["equality","noun","the state of having the same rights, opportunities and treatment","平等","promote equality|gender equality|greater equality","促进平等|性别平等|更大程度的平等","The policy aims to promote equality in the workplace.","这项政策旨在促进职场平等。"],
          ["inequality","noun","an unfair difference in wealth, opportunity or treatment","不平等","social inequality|reduce inequality|growing inequality","社会不平等|减少不平等|日益加剧的不平等","Affordable childcare can help reduce economic inequality.","可负担的托儿服务有助于减少经济不平等。"],
          ["discrimination","noun","unfair treatment of people because of who they are","歧视；区别对待","face discrimination|racial discrimination|prevent discrimination","面临歧视|种族歧视|防止歧视","The law protects employees from discrimination.","法律保护员工免受歧视。"],
          ["prejudice","noun","an unfair and unreasonable opinion formed without enough knowledge","偏见","challenge prejudice|racial prejudice|deep-rooted prejudice","挑战偏见|种族偏见|根深蒂固的偏见","Education can challenge prejudice and false assumptions.","教育可以挑战偏见和错误假设。"],
          ["privilege","noun","an advantage that only a particular person or group has","特权；特殊待遇","social privilege|enjoy a privilege|position of privilege","社会特权|享有特权|处于特权地位","Access to safe housing should be a right, not a privilege.","获得安全住房应是一项权利，而不是特权。"],
          ["opportunity","noun","a situation that makes it possible to do or achieve something","机会；机遇","equal opportunity|create opportunities|miss an opportunity","平等机会|创造机会|错过机会","The scholarship gives rural students an opportunity to study abroad.","这项奖学金给农村学生提供了出国学习的机会。"],
          ["accessible","adjective","easy for people to reach, use or understand, including people with disabilities","无障碍的；易获得的","fully accessible|accessible service|make accessible","完全无障碍|易获得的服务|使之易用","The new station is fully accessible to wheelchair users.","新车站对轮椅使用者完全无障碍。"],
          ["disadvantaged","adjective","having fewer social or economic opportunities than other people","处境不利的；弱势的","disadvantaged group|disadvantaged background|support disadvantaged people","弱势群体|弱势背景|支持弱势人群","The programme provides free tutoring for disadvantaged children.","该项目为弱势儿童提供免费辅导。"],
          ["inclusive","adjective","designed to include people with different needs, backgrounds and abilities","包容的；兼顾不同群体的","inclusive society|inclusive design|more inclusive","包容性社会|包容性设计|更加包容","An inclusive event should welcome people of all ages and abilities.","包容性的活动应欢迎不同年龄和能力的人。"],
          ["barrier","noun","something that prevents people from accessing an opportunity or making progress","障碍；壁垒","remove barriers|financial barrier|barrier to participation","消除障碍|经济障碍|参与障碍","High fees remain a barrier to higher education.","高昂费用仍是接受高等教育的一道障碍。"]
        ]},
        {id:"social-change",title:"Social Change",titleZh:"社会变迁",subtopic:"Society: general words",description:"Explain how campaigns, public attitudes and generations reshape society.",words:[
          ["reform","noun","a change intended to improve a system, law or institution","改革；改良","social reform|introduce reform|support reform","社会改革|推行改革|支持改革","The housing reform gave tenants stronger legal protection.","住房改革为租户提供了更有力的法律保护。"],
          ["campaign","noun","a planned series of activities intended to achieve social or political change","运动；活动","public campaign|launch a campaign|awareness campaign","公众活动|发起运动|宣传活动","The campaign persuaded the council to create safer cycle lanes.","这场运动促使议会修建更安全的自行车道。"],
          ["movement","noun","a group of people working together to support a shared social or political aim","社会运动；群体行动","social movement|join a movement|growing movement","社会运动|加入运动|不断壮大的运动","The movement began with students demanding cleaner air.","这场运动始于学生要求更清洁的空气。"],
          ["awareness","noun","knowledge and understanding of a situation or problem","意识；认识","raise awareness|public awareness|greater awareness","提高认识|公众意识|更强的认识","The exhibition raised awareness of hidden homelessness.","这场展览提高了人们对隐性无家可归问题的认识。"],
          ["advocate","verb","to publicly support a particular idea, policy or group","倡导；拥护","advocate change|strongly advocate|advocate for rights","倡导改变|强烈主张|倡导权利","Local doctors advocate better mental-health services.","当地医生倡导改善心理健康服务。"],
          ["transform","verb","to change something completely, usually in a positive way","彻底改变；转变","transform society|transform a neighbourhood|digitally transform","改变社会|改造社区|数字化转型","Reliable public transport transformed the outer neighbourhoods.","可靠的公共交通彻底改变了外围社区。"],
          ["progress","noun","development towards an improved or more advanced condition","进步；进展","social progress|make progress|measure progress","社会进步|取得进展|衡量进展","The report shows progress, although major gaps remain.","报告显示已经取得进展，但重大差距仍然存在。"],
          ["generation","noun","all the people born and living at about the same time","一代人；世代","younger generation|future generations|generation gap","年轻一代|后代|代沟","The younger generation expects more flexible ways of working.","年轻一代期待更灵活的工作方式。"],
          ["trend","noun","a general direction in which a situation is changing","趋势；趋向","social trend|growing trend|reverse a trend","社会趋势|增长趋势|扭转趋势","Remote work has accelerated the trend towards living outside cities.","远程工作加速了人们迁居城市以外的趋势。"],
          ["attitude","noun","a feeling or opinion about someone or something","态度；看法","public attitude|change attitudes|positive attitude","公众态度|改变态度|积极态度","Public attitudes towards disability have changed considerably.","公众对残障的态度已经发生了显著变化。"]
        ]},
        {id:"public-life",title:"Public Life & Responsibility",titleZh:"公共生活与责任",subtopic:"Public services; Organisations",description:"Use vocabulary for policy, services and organisations that support public life.",words:[
          ["welfare","noun","practical or financial support provided for people's health and basic needs","福利；社会保障","welfare system|child welfare|welfare support","福利制度|儿童福利|福利支持","The welfare system provides temporary help after job loss.","福利制度为失业后的人提供临时帮助。"],
          ["authority","noun","an official organisation that controls public services or a local area","主管机构；地方当局","local authority|public authority|authority decision","地方当局|公共机构|主管部门决定","The local authority approved a new community centre.","地方当局批准建设一个新的社区中心。"],
          ["policy","noun","an official plan or set of rules adopted by an organisation or government","政策；方针","public policy|develop a policy|policy decision","公共政策|制定政策|政策决定","The new policy limits rent increases in the city centre.","新政策限制市中心的租金涨幅。"],
          ["facility","noun","a building, service or piece of equipment provided for a particular purpose","设施；场所","public facility|sports facility|local facilities","公共设施|体育设施|当地设施","The town needs better childcare facilities.","这座城镇需要更好的托儿设施。"],
          ["responsibility","noun","a duty to deal with or take care of something","责任；职责","public responsibility|take responsibility|shared responsibility","公共责任|承担责任|共同责任","Protecting vulnerable residents is a shared responsibility.","保护弱势居民是共同责任。"],
          ["funding","noun","money provided for a particular purpose","资金；经费","public funding|secure funding|funding shortage","公共资金|获得资金|资金短缺","The library secured funding to remain open at weekends.","图书馆获得了资金，可以在周末继续开放。"],
          ["charity","noun","an organisation that gives help or raises money for people in need","慈善机构；慈善事业","local charity|support a charity|charity work","当地慈善机构|支持慈善机构|慈善工作","A local charity offers legal advice to refugees.","一家当地慈善机构为难民提供法律咨询。"],
          ["organisation","noun","a group of people working together for a shared purpose","组织；机构","voluntary organisation|non-profit organisation|join an organisation","志愿组织|非营利组织|加入组织","The organisation trains volunteers to support older people.","该组织培训志愿者帮助老年人。"],
          ["accountable","adjective","responsible for decisions and expected to explain them","负有责任的；须作出解释的","hold accountable|publicly accountable|accountable to voters","追究责任|向公众负责|对选民负责","Public bodies must be accountable for how they spend money.","公共机构必须对资金使用方式负责。"],
          ["allocate","verb","to officially give money, time or resources to a particular purpose","分配；拨给","allocate funding|allocate resources|fairly allocate","分配资金|配置资源|公平分配","The council allocated extra funding to youth services.","议会向青少年服务拨出了额外资金。"]
        ]},
        {id:"culture-identity",title:"Culture & Identity",titleZh:"文化与身份",subtopic:"Social groups; Identity",description:"Discuss shared values, diversity and how people maintain or negotiate identity.",words:[
          ["diversity","noun","the presence of many different types of people, ideas or cultures","多样性；多元化","cultural diversity|celebrate diversity|increase diversity","文化多样性|赞美多元|提高多样性","The festival celebrates the cultural diversity of the city.","这个节日庆祝城市的文化多样性。"],
          ["identity","noun","the qualities, beliefs and experiences that make a person or group who they are","身份认同；特性","cultural identity|sense of identity|shape identity","文化认同|身份感|塑造身份","Language is an important part of cultural identity.","语言是文化认同的重要组成部分。"],
          ["tradition","noun","a belief or custom passed from one generation to another","传统；习俗","local tradition|maintain a tradition|long tradition","当地传统|保持传统|悠久传统","Families maintain the tradition by teaching it to children.","家庭通过教给孩子来延续这一传统。"],
          ["values","noun","the principles and beliefs that guide a person or society","价值观；准则","shared values|traditional values|reflect values","共同价值观|传统价值观|体现价值观","The constitution reflects the country's shared values.","宪法体现了这个国家的共同价值观。"],
          ["minority","noun","a smaller group within a community, often with a distinct identity","少数群体；少数","ethnic minority|minority group|minority rights","少数族裔|少数群体|少数群体权利","The museum records the history of a local minority community.","博物馆记录了当地一个少数群体的历史。"],
          ["majority","noun","the larger number or part of a group","大多数；多数群体","vast majority|majority opinion|majority of residents","绝大多数|多数意见|大多数居民","The majority of residents supported the proposal.","大多数居民支持这项提议。"],
          ["integrate","verb","to become or make someone part of a group or society","融入；使融合","integrate into society|successfully integrate|integrate newcomers","融入社会|成功融入|帮助新来者融入","Community events help newcomers integrate into local life.","社区活动帮助新来者融入当地生活。"],
          ["multicultural","adjective","including people and traditions from several different cultures","多元文化的","multicultural society|multicultural city|multicultural education","多元文化社会|多元文化城市|多元文化教育","The school reflects the area's multicultural population.","这所学校反映了该地区多元文化的人口构成。"],
          ["stereotype","noun","a fixed and often unfair idea about a type of person or thing","刻板印象","negative stereotype|challenge a stereotype|cultural stereotype","负面刻板印象|挑战刻板印象|文化刻板印象","The documentary challenges stereotypes about older workers.","这部纪录片挑战了关于年长员工的刻板印象。"],
          ["social norm","noun","an accepted way of behaving in a particular group or society","社会规范；社会习俗","challenge a social norm|changing social norms|follow social norms","挑战社会规范|变化中的社会规范|遵循社会规范","Working from home has changed several social norms.","居家办公改变了若干社会规范。"]
        ]}
      ],
      idioms:[
        {phrase:"do your bit",meaning:"to make a useful contribution to a shared effort",meaningZh:"尽自己的一份力",examples:["Everyone can do their bit by checking on an elderly neighbour.","The shop is doing its bit to reduce food waste.","We all need to do our bit for the community."],examplesZh:["每个人都可以通过关心年长邻居来尽一份力。","这家商店正在为减少食物浪费尽一份力。","我们都需要为社区尽自己的一份力。"]},
        {phrase:"a level playing field",meaning:"a situation in which everyone has a fair and equal chance",meaningZh:"公平竞争的环境；人人机会均等",examples:["Transparent rules create a level playing field.","Small firms want a level playing field when bidding for contracts.","Good public schools help provide a level playing field."],examplesZh:["透明的规则可以创造公平竞争的环境。","小企业希望在竞标合同时拥有公平机会。","优质公立学校有助于创造机会均等的环境。"]},
        {phrase:"make a difference",meaning:"to have a useful or important effect",meaningZh:"发挥作用；带来改变",examples:["One patient volunteer can make a real difference.","The new bus route has made a difference to rural residents.","Small acts of kindness make a difference."],examplesZh:["一位有耐心的志愿者也能真正带来改变。","新公交线路给农村居民带来了改变。","小小的善举也能发挥作用。"]},
        {phrase:"the haves and have-nots",meaning:"people who are rich and advantaged compared with people who are poor",meaningZh:"富人与穷人；有资源者与无资源者",examples:["The housing crisis has widened the gap between the haves and have-nots.","Digital access must not divide society into haves and have-nots.","The tax debate focused on the haves and have-nots."],examplesZh:["住房危机扩大了富人与穷人之间的差距。","数字接入不应把社会分成有资源者与无资源者。","税收辩论聚焦于富人与穷人的差距。"]}
      ]
    },
    {
      id:"science",
      scenes:[
        {id:"research-evidence",title:"Research & Evidence",titleZh:"研究与证据",subtopic:"Scientific techniques",description:"Build explanations from questions, evidence and carefully interpreted data.",words:[
          ["hypothesis","noun","an idea proposed as a possible explanation that can be tested","假设；假说","test a hypothesis|support a hypothesis|working hypothesis","检验假设|支持假设|工作假设","The team designed an experiment to test its hypothesis.","团队设计了一项实验来检验假设。"],
          ["theory","noun","a well-developed explanation based on facts and repeated testing","理论；学说","scientific theory|develop a theory|theory explains","科学理论|提出理论|理论解释","The theory explains how the continents have moved over time.","该理论解释了大陆如何随时间移动。"],
          ["evidence","noun","facts or information that support or challenge an idea","证据；依据","strong evidence|gather evidence|evidence suggests","有力证据|收集证据|证据表明","The samples provided strong evidence of water pollution.","样本为水污染提供了有力证据。"],
          ["research","noun","a detailed study intended to discover new facts or reach new understanding","研究；调查","conduct research|scientific research|research findings","开展研究|科学研究|研究结果","Recent research links regular sleep with better memory.","近期研究表明规律睡眠与更好的记忆力有关。"],
          ["analyse","verb","to examine information carefully in order to understand it","分析；剖析","analyse data|analyse a sample|carefully analyse","分析数据|分析样本|仔细分析","Researchers analysed the samples under a microscope.","研究人员在显微镜下分析了样本。"],
          ["data","noun","facts, measurements or observations collected for study","数据；资料","collect data|reliable data|analyse data","收集数据|可靠数据|分析数据","Sensors collect data on air quality every minute.","传感器每分钟收集空气质量数据。"],
          ["conclusion","noun","a judgement reached after considering evidence","结论；推论","reach a conclusion|draw a conclusion|scientific conclusion","得出结论|作出推论|科学结论","The researchers reached no firm conclusion from the small sample.","研究人员无法从这个小样本中得出明确结论。"],
          ["reliable","adjective","likely to be accurate and able to be trusted","可靠的；可信的","reliable result|reliable source|statistically reliable","可靠结果|可靠来源|统计上可靠","Repeated measurements made the result more reliable.","重复测量使结果更加可靠。"],
          ["objective","adjective","based on facts rather than personal feelings or opinions","客观的","objective evidence|objective assessment|remain objective","客观证据|客观评估|保持客观","Scientists use blind testing to make the assessment more objective.","科学家使用盲测来使评估更加客观。"],
          ["peer review","noun","evaluation of research by other experts in the same field","同行评审","undergo peer review|peer-review process|independent peer review","接受同行评审|同行评审流程|独立同行评审","The paper underwent peer review before publication.","论文在发表前接受了同行评审。"]
        ]},
        {id:"experiments-measurement",title:"Experiments & Measurement",titleZh:"实验与测量",subtopic:"Scientific techniques; Equipment",description:"Describe controlled tests, observation and the quality of measurements.",words:[
          ["experiment","noun","a scientific test performed to discover whether an idea is correct","实验；试验","conduct an experiment|controlled experiment|experiment shows","进行实验|对照实验|实验表明","Students conducted an experiment on plant growth.","学生们进行了一项关于植物生长的实验。"],
          ["variable","noun","a factor that can change and affect the result of an experiment","变量；可变因素","control a variable|independent variable|single variable","控制变量|自变量|单一变量","The amount of light was the only variable in the test.","光照量是实验中唯一的变量。"],
          ["control","noun","a standard condition used for comparison in an experiment","对照；控制条件","control group|experimental control|use a control","对照组|实验控制|使用对照","The untreated plants served as the control group.","未处理的植物作为对照组。"],
          ["sample","noun","a small amount or group taken from a larger whole for testing","样本；样品","soil sample|representative sample|collect a sample","土壤样本|代表性样本|采集样本","The scientist collected a water sample downstream.","科学家在下游采集了水样。"],
          ["observe","verb","to watch something carefully, especially for scientific study","观察；观测","observe closely|observe behaviour|directly observe","密切观察|观察行为|直接观测","The team observed how the birds responded to noise.","团队观察了鸟类对噪声的反应。"],
          ["measure","verb","to discover the exact size, amount or degree of something","测量；衡量","measure accurately|measure temperature|measure the effect","准确测量|测量温度|衡量效果","The device measures temperature to a tenth of a degree.","该设备可将温度测量到十分之一度。"],
          ["accurate","adjective","correct and exact, with very few mistakes","准确的；精确的","accurate measurement|highly accurate|accurate result","准确测量|高度准确|准确结果","The digital scale gives a more accurate measurement.","电子秤能给出更准确的测量结果。"],
          ["method","noun","a particular way of doing or studying something","方法；方式","scientific method|research method|testing method","科学方法|研究方法|测试方法","The team compared two methods of measuring rainfall.","团队比较了两种测量降雨量的方法。"],
          ["procedure","noun","an established series of actions used to perform a test","步骤；程序","follow a procedure|standard procedure|laboratory procedure","遵循步骤|标准程序|实验室程序","Everyone followed the same procedure to reduce errors.","每个人都遵循相同程序以减少误差。"],
          ["reproduce","verb","to repeat a scientific result by using the same method","复现实验结果；重复产生","reproduce a result|successfully reproduce|difficult to reproduce","复现结果|成功复现|难以复现","A second laboratory was able to reproduce the result.","第二个实验室成功复现了该结果。"]
        ]},
        {id:"discovery-innovation",title:"Discovery & Innovation",titleZh:"发现与创新",subtopic:"Inventing, designing and innovation",description:"Talk about scientific advances from early investigation to practical application.",words:[
          ["discovery","noun","the act of finding something important that was not previously known","发现；新发现","scientific discovery|major discovery|lead to a discovery","科学发现|重大发现|促成发现","The discovery may change how doctors treat the disease.","这一发现可能改变医生治疗该疾病的方式。"],
          ["breakthrough","noun","an important discovery or development that solves a difficult problem","重大突破","scientific breakthrough|major breakthrough|achieve a breakthrough","科学突破|重大突破|取得突破","The new battery represents a major breakthrough in energy storage.","这种新电池代表着储能领域的重大突破。"],
          ["invent","verb","to design or create something that has not existed before","发明；创造","invent a device|newly invented|invent a process","发明设备|新发明的|发明流程","Engineers invented a filter that removes tiny plastic particles.","工程师发明了一种能去除微小塑料颗粒的过滤器。"],
          ["innovation","noun","a new idea, method or product that improves how something is done","创新；革新","technological innovation|encourage innovation|major innovation","技术创新|鼓励创新|重大创新","Public funding encouraged innovation in clean energy.","公共资金推动了清洁能源创新。"],
          ["develop","verb","to create or improve a product, idea or technique over time","开发；发展","develop a treatment|develop technology|further develop","开发治疗方法|开发技术|进一步发展","Scientists are developing a faster diagnostic test.","科学家正在开发一种更快的诊断检测。"],
          ["prototype","noun","the first working model of a new product used for testing","原型；样机","build a prototype|working prototype|test a prototype","制作原型|可运行原型|测试原型","The first prototype was light but not strong enough.","第一个原型很轻，但不够坚固。"],
          ["researcher","noun","a person whose job is to study a subject and discover new information","研究人员","lead researcher|medical researcher|team of researchers","首席研究员|医学研究人员|研究团队","A marine researcher recorded a previously unknown sound.","一名海洋研究人员记录到一种此前未知的声音。"],
          ["application","noun","a practical use for a scientific discovery or method","应用；实际用途","practical application|medical application|potential application","实际应用|医学应用|潜在用途","The material has a practical application in low-cost housing.","这种材料可实际应用于低成本住房。"],
          ["advance","noun","an important improvement in knowledge, technology or ability","进展；进步","scientific advance|major advance|medical advance","科学进展|重大进步|医学进展","Imaging technology has led to major advances in diagnosis.","成像技术推动了诊断领域的重大进展。"],
          ["laboratory","noun","a room or building equipped for scientific experiments and research","实验室","research laboratory|laboratory test|laboratory equipment","研究实验室|实验室检测|实验室设备","The sample was sent to a laboratory for further testing.","样本被送往实验室作进一步检测。"]
        ]},
        {id:"life-natural-science",title:"Life & Natural Science",titleZh:"生命与自然科学",subtopic:"Biology; Chemistry and physics",description:"Describe living systems and the basic processes that shape the natural world.",words:[
          ["organism","noun","a single living thing such as an animal, plant or bacterium","生物；有机体","living organism|tiny organism|marine organism","生物体|微小生物|海洋生物","The organism survives in extremely salty water.","这种生物能在盐度极高的水中生存。"],
          ["cell","noun","the smallest basic unit of a living organism","细胞","human cell|cell division|damage a cell","人体细胞|细胞分裂|损伤细胞","Each cell contains instructions for making proteins.","每个细胞都含有制造蛋白质的指令。"],
          ["genetic","adjective","connected with genes and the qualities inherited from parents","遗传的；基因的","genetic variation|genetic condition|genetic information","遗传变异|遗传性疾病|遗传信息","Genetic variation helps a population adapt to change.","遗传变异帮助种群适应变化。"],
          ["evolution","noun","the gradual change of living things over many generations","进化；演变","human evolution|theory of evolution|evolution over time","人类进化|进化论|随时间演变","Fossils provide evidence of evolution over millions of years.","化石提供了数百万年进化的证据。"],
          ["adaptation","noun","a feature or process that helps a living thing survive in its environment","适应；适应性特征","physical adaptation|adaptation to climate|successful adaptation","身体适应|适应气候|成功适应","Thick fur is an adaptation to cold conditions.","厚毛皮是适应寒冷环境的一种特征。"],
          ["species","noun","a group of living things that share features and can reproduce","物种","endangered species|new species|native species","濒危物种|新物种|本土物种","Researchers identified a new species of frog.","研究人员鉴定出一种新的青蛙物种。"],
          ["chemical","noun","a substance with a particular molecular composition","化学物质","harmful chemical|chemical reaction|industrial chemical","有害化学物质|化学反应|工业化学品","The reaction produces a chemical that changes colour in sunlight.","该反应产生一种在阳光下变色的化学物质。"],
          ["matter","noun","the physical substance that everything in the universe is made of","物质","state of matter|organic matter|matter and energy","物质状态|有机物|物质与能量","Heating can change matter from a solid into a liquid.","加热可以使物质从固态变成液态。"],
          ["energy","noun","the ability of matter or a system to do work or cause change","能量；能源","release energy|renewable energy|energy transfer","释放能量|可再生能源|能量传递","The reaction releases enough energy to produce heat.","该反应释放出足以产生热量的能量。"],
          ["process","noun","a connected series of natural or scientific changes","过程；进程","natural process|biological process|complex process","自然过程|生物过程|复杂过程","Photosynthesis is the process plants use to store energy.","光合作用是植物储存能量的过程。"]
        ]},
        {id:"science-society",title:"Science in Society",titleZh:"科学与社会",subtopic:"Scientific debate and responsibility",description:"Evaluate benefits, risks and uncertainty when science affects public decisions.",words:[
          ["ethical","adjective","connected with principles about what is right and wrong","伦理的；道德的","ethical issue|ethical concern|ethical research","伦理问题|伦理担忧|合乎伦理的研究","The trial raised ethical questions about the use of personal data.","这项试验引发了关于个人数据使用的伦理问题。"],
          ["risk","noun","the possibility that something harmful or unwanted may happen","风险；危险","assess risk|potential risk|reduce the risk","评估风险|潜在风险|降低风险","Scientists assessed the risk before releasing the organism.","科学家在释放该生物前评估了风险。"],
          ["benefit","noun","a helpful or positive effect","好处；益处","potential benefit|public benefit|outweigh the risk","潜在益处|公共利益|收益大于风险","The potential benefits must be compared with the risks.","必须将潜在收益与风险进行比较。"],
          ["expertise","noun","a high level of knowledge or skill in a particular area","专业知识；专长","scientific expertise|technical expertise|draw on expertise","科学专长|技术专长|借助专业知识","The committee drew on expertise from several fields.","委员会借助了多个领域的专业知识。"],
          ["uncertainty","noun","a situation in which something is not known or cannot be predicted confidently","不确定性","scientific uncertainty|reduce uncertainty|degree of uncertainty","科学不确定性|减少不确定性|不确定程度","The forecast includes a degree of uncertainty.","这一预测包含一定程度的不确定性。"],
          ["predict","verb","to say what is likely to happen based on evidence or patterns","预测；预言","predict accurately|predict an outcome|difficult to predict","准确预测|预测结果|难以预测","The model predicts how sea levels may change.","该模型预测海平面可能如何变化。"],
          ["debate","noun","a serious discussion in which different views are expressed","辩论；讨论","public debate|scientific debate|stimulate debate","公众辩论|科学争论|引发讨论","The discovery started a public debate about gene editing.","这一发现引发了关于基因编辑的公众辩论。"],
          ["regulate","verb","to control an activity through official rules","监管；规范","strictly regulate|regulate research|regulate an industry","严格监管|规范研究|监管行业","Governments regulate how medical trials are conducted.","政府监管医学试验的开展方式。"],
          ["impact","noun","a strong effect on a person, system or environment","影响；作用","scientific impact|environmental impact|assess the impact","科学影响|环境影响|评估影响","The study assessed the environmental impact of the new material.","这项研究评估了新材料的环境影响。"],
          ["transparent","adjective","open and clear about methods, decisions and possible interests","透明的；公开清楚的","transparent process|fully transparent|transparent reporting","透明流程|完全公开|透明报告","A transparent process helps the public trust scientific advice.","透明的流程有助于公众信任科学建议。"]
        ]}
      ],
      idioms:[
        {phrase:"back to the drawing board",meaning:"to start planning again because an attempt failed",meaningZh:"回到起点重新设计；从头再来",examples:["The first trial failed, so it was back to the drawing board.","A safety problem sent the engineers back to the drawing board.","If the prototype leaks, we will go back to the drawing board."],examplesZh:["第一次试验失败了，所以只好从头再来。","一个安全问题让工程师们回到起点重新设计。","如果原型漏水，我们就得从头再来。"]},
        {phrase:"not rocket science",meaning:"not very difficult to understand or do",meaningZh:"并不难懂；不是高深学问",examples:["Reading the thermometer is not rocket science.","The procedure looks complex, but it is not rocket science.","Saving the file correctly is not rocket science."],examplesZh:["读取温度计并不难。","这个流程看起来复杂，但并不是高深学问。","正确保存文件并不是什么难事。"]},
        {phrase:"trial and error",meaning:"learning by trying different methods until one works",meaningZh:"反复试验；摸索",examples:["The team improved the design through trial and error.","Early discoveries often involved trial and error.","We found the right temperature by trial and error."],examplesZh:["团队通过反复试验改进了设计。","早期发现往往涉及不断摸索。","我们通过反复试验找到了合适温度。"]},
        {phrase:"a light-bulb moment",meaning:"a sudden moment of understanding or inspiration",meaningZh:"灵光一现；顿悟时刻",examples:["She had a light-bulb moment while studying the graph.","The classroom question produced a light-bulb moment.","His light-bulb moment led to a simpler experiment."],examplesZh:["她研究图表时突然灵光一现。","课堂上的问题带来了顿悟时刻。","他的灵光一现促成了一项更简单的实验。"]}
      ]
    },
    {
      id:"education",
      scenes:[
        {id:"classes-coursework",title:"Classes & Coursework",titleZh:"课程与课业",subtopic:"Classes, courses and coursework",description:"Navigate the main structures, activities and requirements of a course.",words:[
          ["curriculum","noun","the subjects and learning experiences included in a course or school programme","课程体系；全部课程","school curriculum|national curriculum|broaden the curriculum","学校课程|国家课程|拓宽课程体系","Climate education is now part of the school curriculum.","气候教育现在已成为学校课程的一部分。"],
          ["syllabus","noun","an official list of topics and work covered in a particular course","教学大纲；课程提纲","course syllabus|follow the syllabus|syllabus content","课程大纲|按大纲学习|大纲内容","The syllabus explains what students will study each week.","教学大纲说明了学生每周要学习的内容。"],
          ["seminar","noun","a class in which a small group discusses a subject with a teacher","研讨课；专题讨论课","attend a seminar|seminar discussion|weekly seminar","参加研讨课|研讨课讨论|每周研讨课","Students presented their arguments during the seminar.","学生们在研讨课上陈述了自己的论点。"],
          ["tutorial","noun","a lesson with a teacher for one student or a small group","辅导课；小班教学","weekly tutorial|online tutorial|tutorial group","每周辅导课|在线教程|辅导小组","The weekly tutorial gave us time to ask detailed questions.","每周辅导课让我们有时间提出详细问题。"],
          ["coursework","noun","written or practical work completed during a course and often included in the final mark","课程作业；平时作业","submit coursework|coursework assignment|assessed coursework","提交课程作业|课程作业任务|计分课程作业","Half of the final grade comes from assessed coursework.","期末成绩的一半来自计分课程作业。"],
          ["assignment","noun","a piece of work given to a student as part of a course","作业；任务","complete an assignment|written assignment|assignment deadline","完成作业|书面作业|作业截止时间","The assignment asks students to compare two solutions.","这项作业要求学生比较两种解决方案。"],
          ["lecture","noun","a formal talk given to teach a large group, especially at university","讲座；大学课堂讲授","attend a lecture|give a lecture|lecture theatre","听讲座|作讲座|阶梯教室","The lecture introduced several theories of language learning.","这堂讲座介绍了几种语言学习理论。"],
          ["workshop","noun","an interactive class where people learn by discussion and practical activity","工作坊；实践课","practical workshop|attend a workshop|writing workshop","实践工作坊|参加工作坊|写作工作坊","The writing workshop focused on organising an argument.","写作工作坊重点练习如何组织论点。"],
          ["module","noun","one of the separate units that make up a course","课程单元；模块","core module|optional module|complete a module","核心模块|选修模块|完成课程单元","Students choose one optional module in the second term.","学生在第二学期选择一个选修模块。"],
          ["subject","noun","an area of knowledge studied at school, college or university","学科；科目","academic subject|school subject|study a subject","学术科目|学校科目|学习一门学科","History was the subject she enjoyed most at school.","历史是她在学校最喜欢的科目。"]
        ]},
        {id:"learning-study-skills",title:"Learning & Study Skills",titleZh:"学习与学习技能",subtopic:"Learning and studying",description:"Use purposeful strategies to understand, remember and manage independent study.",words:[
          ["revise","verb","to study material again in order to prepare for an examination","复习；温习","revise for an exam|revise thoroughly|revision session","为考试复习|全面复习|复习时段","She revised her notes for thirty minutes each evening.","她每天晚上复习笔记三十分钟。"],
          ["concentrate","verb","to direct all your attention towards a particular activity","集中注意力","concentrate fully|concentrate on a task|find it hard to concentrate","全神贯注|专注任务|难以集中","Short breaks help me concentrate on difficult reading.","短暂休息有助于我专注于有难度的阅读。"],
          ["memorise","verb","to learn something so that you can remember it exactly","记住；背诵","memorise vocabulary|memorise a formula|easier to memorise","记忆词汇|背公式|更容易记忆","Drawing a diagram helped him memorise the process.","画图帮助他记住了这个过程。"],
          ["take notes","verb","to write down important information while listening or reading","记笔记","take clear notes|take notes by hand|effective note-taking","记清楚的笔记|手写笔记|有效记笔记","Students took notes while watching the demonstration.","学生们观看演示时做了笔记。"],
          ["independent","adjective","able to work and make decisions without continuous help","独立的；自主的","independent learner|independent study|work independently","自主学习者|自主学习|独立完成","The project encourages students to become independent learners.","该项目鼓励学生成为自主学习者。"],
          ["critical thinking","noun","the ability to judge information and arguments carefully rather than accept them immediately","批判性思维","develop critical thinking|critical-thinking skills|use critical thinking","培养批判性思维|批判性思维技能|运用批判性思维","Comparing sources develops critical-thinking skills.","比较不同来源可以培养批判性思维技能。"],
          ["resource","noun","a book, website, person or tool that helps someone learn","学习资源；资料","online resource|learning resource|use a resource","在线资源|学习资源|使用资料","The library provides free online resources for language learners.","图书馆为语言学习者提供免费的在线资源。"],
          ["strategy","noun","a planned method for achieving a learning goal","策略；方法","learning strategy|effective strategy|develop a strategy","学习策略|有效策略|制定策略","Her reading strategy begins with predicting the main idea.","她的阅读策略从预测主旨开始。"],
          ["self-discipline","noun","the ability to make yourself work consistently even when you do not feel like it","自律","develop self-discipline|require self-discipline|strong self-discipline","培养自律|需要自律|很强的自律性","Online study requires self-discipline and a clear routine.","在线学习需要自律和清晰的日程安排。"],
          ["reflect","verb","to think carefully about an experience in order to learn from it","反思；认真思考","reflect on learning|reflect critically|time to reflect","反思学习|批判性反思|留时间思考","After the presentation, students reflected on what went well.","演讲结束后，学生反思了哪些地方做得好。"]
        ]},
        {id:"assessment-achievement",title:"Assessment & Achievement",titleZh:"评估与成就",subtopic:"Exams, tests and assessment",description:"Talk precisely about evaluation, feedback, results and academic progress.",words:[
          ["assessment","noun","a process used to judge someone's knowledge, skill or progress","评估；考核","formal assessment|continuous assessment|assessment criteria","正式评估|持续性评估|评估标准","The course uses continuous assessment instead of one final exam.","这门课程采用持续性评估，而不是一次期末考试。"],
          ["examination","noun","a formal test of knowledge or ability","考试；考查","sit an examination|final examination|examination result","参加考试|期末考试|考试成绩","Candidates may use a dictionary during the examination.","考生在考试期间可以使用词典。"],
          ["grade","noun","a mark or level showing the quality of a student's work","成绩；等级","achieve a grade|final grade|improve a grade","取得成绩|最终成绩|提高成绩","Detailed feedback helped him improve his final grade.","详细反馈帮助他提高了最终成绩。"],
          ["feedback","noun","comments that explain how well someone has performed and how to improve","反馈；评语","constructive feedback|receive feedback|act on feedback","建设性反馈|收到反馈|根据反馈改进","The tutor gave constructive feedback on the first draft.","导师对初稿给出了建设性反馈。"],
          ["achievement","noun","something successful that required effort or skill","成就；成绩","academic achievement|major achievement|sense of achievement","学业成就|重大成就|成就感","Completing the research project was a major achievement.","完成研究项目是一项重大成就。"],
          ["pass","verb","to succeed in an examination or course","通过；及格","pass an exam|just pass|pass with a high mark","通过考试|勉强及格|高分通过","She passed the entrance exam on her first attempt.","她第一次参加入学考试就通过了。"],
          ["fail","verb","to be unsuccessful in an examination or not reach the required standard","未通过；不及格","fail an exam|fail to meet the standard|fear of failing","考试不及格|未达标准|害怕失败","One weak result does not mean a student has failed to learn.","一次不理想的成绩并不意味着学生没有学会。"],
          ["resit","verb","to take an examination again after failing or wanting a better mark","重考；补考","resit an exam|resit in June|opportunity to resit","重考|六月补考|重考机会","Students can resit the exam in June.","学生可以在六月补考。"],
          ["evaluate","verb","to judge quality or effectiveness using clear criteria","评价；评估","evaluate performance|critically evaluate|evaluate progress","评估表现|批判性评价|评估进展","Learners evaluated their own speaking performance.","学习者评估了自己的口语表现。"],
          ["progress","noun","improvement or development towards a learning goal","进步；进展","make progress|steady progress|monitor progress","取得进步|稳步进展|监测进展","Weekly practice led to steady progress in pronunciation.","每周练习使发音取得了稳步进步。"]
        ]},
        {id:"higher-education",title:"Higher Education & Qualifications",titleZh:"高等教育与资格",subtopic:"University and college education",description:"Describe entry, study pathways, qualifications and university life.",words:[
          ["admission","noun","permission to enter a university, course or institution","录取；准入","university admission|admission requirement|gain admission","大学录取|入学要求|获得录取","Work experience is part of the admission requirement.","工作经验是入学要求的一部分。"],
          ["degree","noun","a qualification awarded after completing a university course","学位","university degree|degree course|earn a degree","大学学位|学位课程|获得学位","She is studying for a degree in environmental science.","她正在攻读环境科学学位。"],
          ["qualification","noun","an official record showing that someone has completed training or passed an exam","资格；学历证书","professional qualification|formal qualification|gain a qualification","专业资格|正式学历|取得资格","The course leads to a recognised teaching qualification.","这门课程可获得受认可的教师资格。"],
          ["campus","noun","the buildings and land belonging to a university or college","校园","university campus|on campus|campus facilities","大学校园|在校园内|校园设施","Most first-year students live on campus.","大多数一年级学生住在校园里。"],
          ["graduate","noun","a person who has completed a university degree","大学毕业生","recent graduate|graduate employment|university graduate","应届毕业生|毕业生就业|大学毕业生","The programme connects recent graduates with local employers.","该项目把应届毕业生与当地雇主联系起来。"],
          ["undergraduate","noun","a student studying for their first university degree","本科生","undergraduate student|undergraduate course|undergraduate degree","本科生|本科课程|本科学位","Undergraduates can apply for a summer research placement.","本科生可以申请暑期研究实习。"],
          ["scholarship","noun","money given to support a student's education because of ability or need","奖学金","win a scholarship|full scholarship|scholarship programme","获得奖学金|全额奖学金|奖学金项目","He won a scholarship that covered tuition and accommodation.","他获得了一项涵盖学费和住宿费的奖学金。"],
          ["tuition fees","noun","money paid for teaching at a college or university","学费","pay tuition fees|high tuition fees|cover tuition fees","支付学费|高额学费|承担学费","Part-time work helps her pay the tuition fees.","兼职工作帮助她支付学费。"],
          ["academic","adjective","connected with education, study and intellectual work","学术的；学业的","academic year|academic performance|academic research","学年|学业表现|学术研究","The adviser supports students with academic and personal problems.","顾问帮助学生处理学业和个人问题。"],
          ["vocational","adjective","providing practical skills for a particular job","职业的；职业教育的","vocational training|vocational course|vocational qualification","职业培训|职业课程|职业资格","The college offers vocational training in engineering and design.","这所学院提供工程和设计方面的职业培训。"]
        ]},
        {id:"teaching-support",title:"Teaching & Support",titleZh:"教学与支持",subtopic:"Teaching in general",description:"Describe how teachers explain, motivate and support different learners.",words:[
          ["educator","noun","a person whose work is teaching or improving education","教育工作者；教师","experienced educator|teacher educator|educator training","资深教育工作者|教师培训者|教育者培训","Experienced educators helped design the new literacy programme.","资深教育工作者协助设计了新的读写项目。"],
          ["instruct","verb","to teach someone how to do something or give clear directions","指导；教授","instruct students|carefully instruct|instruct someone to do","指导学生|认真指导|指示某人做","The tutor instructed students to compare their results.","导师指导学生比较各自的结果。"],
          ["demonstrate","verb","to show clearly how something works or is done","演示；示范","demonstrate a technique|clearly demonstrate|demonstrate how","演示技巧|清楚展示|示范如何做","The teacher demonstrated the technique before students tried it.","老师先演示了技巧，然后让学生尝试。"],
          ["motivate","verb","to make someone willing and interested in working towards a goal","激励；促进","motivate learners|highly motivated|motivate someone to learn","激励学习者|积极性很高|激励某人学习","Real-world projects can motivate learners to read more widely.","真实项目可以激励学习者进行更广泛的阅读。"],
          ["learner","noun","a person who is learning a subject or skill","学习者","language learner|adult learner|independent learner","语言学习者|成年学习者|自主学习者","Each learner receives a plan suited to their goals.","每位学习者都会得到一份适合自身目标的计划。"],
          ["guidance","noun","advice or information that helps someone decide what to do","指导；引导","career guidance|clear guidance|seek guidance","职业指导|明确指导|寻求指导","Students received guidance on choosing their next course.","学生获得了关于选择下一门课程的指导。"],
          ["supportive","adjective","giving encouragement and practical help","给予支持的；鼓励性的","supportive teacher|supportive environment|highly supportive","支持型教师|支持性环境|非常支持","A supportive classroom makes it safer to make mistakes.","支持性的课堂让学生更敢于犯错。"],
          ["engage","verb","to interest someone and keep their attention or participation","吸引；使投入","engage learners|actively engage|engage with a topic","吸引学习者|积极参与|投入某主题","The opening question engaged even the quietest students.","开场问题连最安静的学生也吸引住了。"],
          ["differentiate","verb","to adapt teaching so that learners with different needs can succeed","分层教学；因材施教","differentiate instruction|differentiate tasks|effectively differentiate","分层指导|区分任务难度|有效因材施教","The teacher differentiated the task by offering three levels of support.","教师通过提供三个支持等级来实施分层任务。"],
          ["learning difficulty","noun","a condition or challenge that makes some aspects of learning harder","学习困难；学习障碍","specific learning difficulty|identify a learning difficulty|support learning difficulties","特定学习困难|识别学习困难|支持学习障碍","Early support can reduce the impact of a learning difficulty.","早期支持可以减轻学习困难的影响。"]
        ]}
      ],
      idioms:[
        {phrase:"hit the books",meaning:"to begin studying seriously",meaningZh:"开始认真学习；用功读书",examples:["I need to hit the books before Friday's exam.","After dinner, she hit the books for two hours.","The library is full of students hitting the books."],examplesZh:["我得在周五考试前认真学习。","晚饭后，她用功学习了两个小时。","图书馆里满是埋头学习的学生。"]},
        {phrase:"learn the ropes",meaning:"to learn how a task, job or system works",meaningZh:"熟悉门道；掌握基本做法",examples:["The mentor helped new students learn the ropes.","It took me a month to learn the ropes in the laboratory.","You will learn the ropes during the first workshop."],examplesZh:["导师帮助新生熟悉门道。","我花了一个月才熟悉实验室的工作方式。","你会在第一次工作坊中掌握基本做法。"]},
        {phrase:"pass with flying colours",meaning:"to pass a test very successfully",meaningZh:"以优异成绩通过",examples:["She passed the language exam with flying colours.","Careful revision helped him pass with flying colours.","The class passed the practical assessment with flying colours."],examplesZh:["她以优异成绩通过了语言考试。","认真复习帮助他以优异成绩通过。","全班以优异成绩通过了实践考核。"]},
        {phrase:"a steep learning curve",meaning:"a situation in which someone must learn a lot in a short time",meaningZh:"陡峭的学习曲线；短期内要学很多",examples:["The first term involved a steep learning curve.","Using the new software was a steep learning curve.","New teachers often face a steep learning curve."],examplesZh:["第一学期需要在短时间内学习很多东西。","学习使用新软件的过程很有挑战。","新教师常常面临陡峭的学习曲线。"]}
      ]
    },
    {
      id:"communication",
      scenes:[
        {id:"expressing-ideas",title:"Expressing Ideas",titleZh:"表达想法",subtopic:"Saying and uttering; Meaning and significance",description:"Choose precise language, tone and emphasis to make ideas clear.",words:[
          ["articulate","verb","to express an idea or feeling clearly and effectively","清楚表达；明确说明","articulate an idea|clearly articulate|articulate a concern","表达想法|清楚说明|表达担忧","She articulated the problem without blaming anyone.","她清楚说明了问题，同时没有责怪任何人。"],
          ["express","verb","to communicate a thought, opinion or feeling in words or actions","表达；传达","express an opinion|express concern|clearly express","表达意见|表达担忧|清楚表达","Several residents expressed concern about the proposal.","几位居民表达了对该提案的担忧。"],
          ["clarify","verb","to make something easier to understand by explaining it more clearly","澄清；说明清楚","clarify a point|clarify the meaning|ask someone to clarify","澄清要点|阐明含义|请某人说明","The chair asked the speaker to clarify her final point.","主持人请发言者把最后一点说明清楚。"],
          ["emphasise","verb","to show that something is especially important","强调；着重指出","emphasise the importance|strongly emphasise|emphasise a point","强调重要性|强烈强调|着重说明一点","The report emphasises the need for early action.","报告强调了及早采取行动的必要性。"],
          ["phrase","verb","to express something in a particular choice of words","措辞；用某种方式表达","carefully phrase|phrase a question|politely phrased","谨慎措辞|组织问题措辞|措辞礼貌","She phrased the criticism as a helpful suggestion.","她把批评措辞成了一条有帮助的建议。"],
          ["tone","noun","the attitude or feeling shown by the way someone speaks or writes","语气；口吻","friendly tone|formal tone|change your tone","友好语气|正式语气|改变语气","His calm tone prevented the discussion from becoming hostile.","他平静的语气避免了讨论变得敌对。"],
          ["imply","verb","to communicate an idea indirectly without stating it openly","暗示；意味着","seem to imply|strongly imply|imply criticism","似乎暗示|强烈暗示|暗含批评","Her reply implied that the deadline might change.","她的回答暗示截止日期可能会改变。"],
          ["mention","verb","to speak or write about something briefly","提及；说到","briefly mention|mention a problem|fail to mention","简要提到|提到问题|未提及","He mentioned the budget but did not discuss it in detail.","他提到了预算，但没有详细讨论。"],
          ["describe","verb","to say or write what someone or something is like","描述；说明","accurately describe|describe a situation|describe in detail","准确描述|描述情况|详细说明","Witnesses described the event from different viewpoints.","目击者从不同角度描述了这件事。"],
          ["explanation","noun","a statement that makes something clear by giving reasons or details","解释；说明","clear explanation|offer an explanation|detailed explanation","清楚解释|作出解释|详细说明","The diagram provides a clear explanation of the process.","这张图对该过程作出了清晰说明。"]
        ]},
        {id:"listening-understanding",title:"Listening & Understanding",titleZh:"倾听与理解",subtopic:"Meaning and significance",description:"Interpret meaning, confirm understanding and notice signals beyond individual words.",words:[
          ["interpret","verb","to decide what someone's words or behaviour mean","理解；解读","interpret a message|correctly interpret|open to interpretation","解读信息|正确理解|可有不同理解","Listeners interpreted the speaker's pause as uncertainty.","听众把发言者的停顿理解为不确定。"],
          ["misunderstand","verb","to understand someone's words or intentions incorrectly","误解；误会","completely misunderstand|easy to misunderstand|misunderstand a question","完全误解|容易误解|误解问题","I misunderstood the question and answered a different point.","我误解了问题，回答了另一个要点。"],
          ["confirm","verb","to state or show that something is correct or definite","确认；证实","confirm understanding|confirm the details|officially confirm","确认理解|确认细节|正式证实","She repeated the date to confirm that she had understood.","她重复了日期，以确认自己理解正确。"],
          ["respond","verb","to answer someone or react to something that has been said","回应；回答","respond politely|respond to a question|quickly respond","礼貌回应|回答问题|迅速回应","The interviewer gave him time to respond fully.","采访者给了他充分回答的时间。"],
          ["attentive","adjective","listening or watching carefully and showing interest","专心的；留意的","attentive listener|remain attentive|attentive audience","专心的听众|保持专注|认真倾听的观众","An attentive listener notices both words and tone.","专心的听者会同时注意措辞和语气。"],
          ["meaning","noun","the idea or message expressed by words, actions or signs","含义；意思","precise meaning|hidden meaning|understand the meaning","确切含义|隐藏含义|理解意思","Context helped us understand the precise meaning of the phrase.","语境帮助我们理解了这个短语的确切含义。"],
          ["context","noun","the situation and surrounding information needed to understand something","语境；背景","in context|cultural context|provide context","在语境中|文化背景|提供背景","The comment sounds less critical when heard in context.","把这句话放在语境中听，就没那么像批评。"],
          ["signal","noun","an action, sound or sign that communicates information","信号；暗示","clear signal|non-verbal signal|send a signal","明确信号|非语言信号|发出信号","A raised hand gave the chair a clear signal to pause.","举手给主持人发出了暂停的明确信号。"],
          ["non-verbal","adjective","communicated without spoken or written words","非语言的","non-verbal communication|non-verbal cue|non-verbal response","非语言沟通|非语言提示|非语言回应","Eye contact is an important form of non-verbal communication.","眼神交流是非语言沟通的重要形式。"],
          ["assumption","noun","something accepted as true without proof or enough information","假设；想当然的看法","make an assumption|false assumption|challenge an assumption","作出假设|错误假设|质疑假设","Asking a follow-up question prevented a false assumption.","追问一个问题避免了错误假设。"]
        ]},
        {id:"discussion-interaction",title:"Discussion & Interaction",titleZh:"讨论与互动",subtopic:"Discussion and agreement",description:"Manage turn-taking, different viewpoints and cooperative decisions.",words:[
          ["discussion","noun","a conversation in which people exchange ideas about a subject","讨论；商谈","open discussion|group discussion|lead a discussion","公开讨论|小组讨论|主持讨论","The group discussion produced three practical suggestions.","小组讨论提出了三条切实建议。"],
          ["debate","verb","to discuss a subject formally by presenting different arguments","辩论；讨论","publicly debate|debate an issue|widely debated","公开辩论|辩论议题|广泛讨论","Students debated whether cities should limit private cars.","学生们辩论城市是否应限制私家车。"],
          ["interrupt","verb","to speak while someone else is speaking, preventing them from finishing","打断；插话","politely interrupt|constantly interrupt|sorry to interrupt","礼貌插话|不断打断|抱歉打断","She waited for a pause rather than interrupting the speaker.","她等到停顿时才开口，没有打断发言者。"],
          ["contribute","verb","to add an idea, comment or effort to a shared activity","贡献；参与发言","contribute an idea|actively contribute|contribute to a discussion","贡献想法|积极参与|参与讨论","Everyone contributed at least one idea to the discussion.","每个人都为讨论贡献了至少一个想法。"],
          ["agreement","noun","a situation in which people share the same opinion or accept a plan","一致；协议","reach agreement|broad agreement|agreement on a plan","达成一致|广泛共识|就计划达成一致","After several changes, the committee reached agreement.","经过几次修改，委员会达成了一致。"],
          ["disagreement","noun","a situation in which people have different opinions","分歧；意见不一致","serious disagreement|express disagreement|resolve a disagreement","严重分歧|表达异议|解决分歧","A disagreement about cost delayed the final decision.","关于成本的分歧推迟了最终决定。"],
          ["negotiate","verb","to discuss different needs in order to reach an agreement","协商；谈判","negotiate a solution|negotiate terms|successfully negotiate","协商解决方案|协商条件|成功谈判","The two groups negotiated a solution that both could accept.","两个小组协商出了双方都能接受的解决方案。"],
          ["compromise","noun","an agreement in which each side accepts less than it originally wanted","妥协；折中方案","reach a compromise|reasonable compromise|willing to compromise","达成妥协|合理折中|愿意妥协","The final timetable was a reasonable compromise.","最终时间表是一个合理的折中方案。"],
          ["viewpoint","noun","a particular way of thinking about a subject","观点；看法","different viewpoint|consider a viewpoint|express a viewpoint","不同观点|考虑一种看法|表达观点","The moderator asked the panel to consider another viewpoint.","主持人请嘉宾考虑另一种观点。"],
          ["exchange","noun","an occasion when people share ideas, information or opinions","交流；交换","exchange of ideas|open exchange|cultural exchange","思想交流|开放交流|文化交流","The workshop encouraged an open exchange of ideas.","工作坊鼓励开放地交流想法。"]
        ]},
        {id:"writing-summarising",title:"Writing & Summarising",titleZh:"写作与概括",subtopic:"Summaries and summarising",description:"Organise written information so that it is concise, coherent and easy to follow.",words:[
          ["summarise","verb","to give the main points of something without all the detail","概括；总结","briefly summarise|summarise an argument|summarise findings","简要概括|总结论点|概括研究发现","The final paragraph summarises the report's main findings.","最后一段概括了报告的主要发现。"],
          ["outline","verb","to describe the main facts or ideas without giving every detail","概述；勾勒","outline a proposal|briefly outline|outline the reasons","概述提案|简要说明|概述原因","The introduction outlines the reasons for the policy change.","引言概述了政策变化的原因。"],
          ["draft","noun","a first version of a piece of writing that will be revised","草稿；初稿","first draft|write a draft|revise a draft","初稿|写草稿|修改草稿","Her first draft contained strong ideas but needed a clearer structure.","她的初稿观点有力，但结构需要更清晰。"],
          ["edit","verb","to improve a text by correcting, removing or rearranging parts","编辑；修改","carefully edit|edit a document|edit for clarity","认真修改|编辑文档|为提高清晰度而修改","He edited the email to make its tone less formal.","他修改了邮件，让语气不那么正式。"],
          ["concise","adjective","giving necessary information clearly in few words","简洁的；简明的","clear and concise|concise summary|remain concise","清晰简洁|简明摘要|保持简洁","The executive summary should be concise and specific.","执行摘要应当简洁而具体。"],
          ["coherent","adjective","clear and logical, with all parts connected","连贯的；条理清楚的","coherent argument|coherent structure|fully coherent","连贯论证|清晰结构|完全连贯","Linking phrases made the argument more coherent.","连接短语使论证更加连贯。"],
          ["paragraph","noun","a section of writing about one main idea","段落","opening paragraph|short paragraph|organise paragraphs","开头段|短段落|组织段落","Each paragraph begins with a clear topic sentence.","每个段落都以清晰的主题句开头。"],
          ["report","noun","a formal written account of facts, findings or recommendations","报告；汇报","write a report|research report|report findings","撰写报告|研究报告|报告结果","The report recommends three changes to the service.","报告建议对该服务作出三项改变。"],
          ["correspondence","noun","letters or emails exchanged between people or organisations","通信；往来信件","business correspondence|email correspondence|formal correspondence","商务通信|邮件往来|正式函件","All correspondence with applicants is stored securely.","与申请人的所有通信都被安全保存。"],
          ["proofread","verb","to check written work carefully for errors before it is published or submitted","校对；审校","carefully proofread|proofread a document|proofread before submitting","认真校对|校对文档|提交前校对","Always proofread your application before submitting it.","提交申请前一定要认真校对。"]
        ]},
        {id:"persuasion-public-messages",title:"Persuasion & Public Messages",titleZh:"说服与公众信息",subtopic:"Suggestions and proposals; Public communication",description:"Build arguments and shape messages for audiences in public or media settings.",words:[
          ["persuade","verb","to make someone agree to do or believe something by giving reasons","说服；劝服","persuade an audience|successfully persuade|persuade someone to act","说服听众|成功说服|劝某人行动","The campaign persuaded many commuters to try cycling.","这项活动说服了许多通勤者尝试骑车。"],
          ["convince","verb","to make someone believe that something is true or right","使信服；说服","convince the public|fully convince|convince someone that","使公众信服|完全说服|使某人相信","The evidence convinced the panel that the plan was safe.","证据使评审小组相信该计划是安全的。"],
          ["proposal","noun","a formal suggestion or plan for people to consider","提案；建议","submit a proposal|detailed proposal|support a proposal","提交提案|详细方案|支持提案","The council invited comments on the transport proposal.","议会邀请公众对交通提案发表评论。"],
          ["argument","noun","a set of reasons used to support an idea or opinion","论点；论证","strong argument|present an argument|counter an argument","有力论点|提出论证|反驳论点","She supported her argument with recent data.","她用最新数据支持自己的论点。"],
          ["claim","noun","a statement that something is true, although it may need evidence","声称；主张","make a claim|support a claim|question a claim","提出主张|支持论断|质疑说法","The advertisement makes a claim that the study does not support.","这则广告提出了一项研究并不支持的说法。"],
          ["audience","noun","the people who receive, watch or listen to a message or performance","受众；听众","target audience|reach an audience|audience response","目标受众|触达受众|受众反应","The speaker adapted her examples for a younger audience.","发言者为更年轻的听众调整了例子。"],
          ["announce","verb","to make information known publicly or officially","宣布；公布","officially announce|announce a decision|announce publicly","正式宣布|宣布决定|公开宣布","The mayor announced the decision at a press conference.","市长在新闻发布会上宣布了这一决定。"],
          ["broadcast","verb","to send a programme or message by television, radio or the internet","广播；播送","broadcast live|nationally broadcast|broadcast a message","直播|全国播出|传播信息","The debate was broadcast live on public radio.","这场辩论在公共广播电台直播。"],
          ["publicity","noun","public attention or information intended to make something widely known","宣传；公众关注","gain publicity|publicity campaign|negative publicity","获得关注|宣传活动|负面报道","The charity gained publicity through a short online film.","这家慈善机构通过一部网络短片获得了公众关注。"],
          ["credible","adjective","believable and deserving to be trusted","可信的；可靠的","credible source|credible argument|appear credible","可靠来源|可信论点|显得可信","Specific evidence makes a public message more credible.","具体证据会让公众信息更加可信。"]
        ]}
      ],
      idioms:[
        {phrase:"get the message across",meaning:"to communicate an idea successfully so that people understand it",meaningZh:"把意思说明白；成功传达信息",examples:["A simple diagram helped get the message across.","She changed her example to get the message across.","Short sentences often get the message across more clearly."],examplesZh:["一张简单图表帮助把意思说明白。","她换了一个例子来成功传达信息。","短句往往能更清楚地把信息传达出去。"]},
        {phrase:"read between the lines",meaning:"to understand a meaning that is suggested but not stated directly",meaningZh:"读懂言外之意",examples:["Reading between the lines, I think the proposal will be delayed.","You need to read between the lines of the polite reply.","She read between the lines and noticed his concern."],examplesZh:["从言外之意看，我认为提案会被推迟。","你需要读懂这封礼貌回复的言外之意。","她读出了言外之意，注意到他的担忧。"]},
        {phrase:"on the same wavelength",meaning:"thinking in a similar way and understanding each other easily",meaningZh:"想法一致；很合拍",examples:["The two designers were immediately on the same wavelength.","A short discussion confirmed that we were on the same wavelength.","Teams work faster when members are on the same wavelength."],examplesZh:["两位设计师马上就很合拍。","一次简短讨论确认了我们想法一致。","成员想法一致时，团队工作得更快。"]},
        {phrase:"get straight to the point",meaning:"to say the most important thing directly without unnecessary detail",meaningZh:"直入主题；开门见山",examples:["Please get straight to the point in the opening paragraph.","He got straight to the point and explained the risk.","Busy audiences appreciate speakers who get straight to the point."],examplesZh:["请在开头一段直接进入主题。","他开门见山地解释了风险。","忙碌的听众喜欢直入主题的发言者。"]}
      ]
    }
  ];

  configs.forEach(config=>{window.CEFR_ADDITIONAL_TOPIC_PACKS[config.id]=build(config);});
})();
