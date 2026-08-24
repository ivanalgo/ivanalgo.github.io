(function(){
  const positions=[[17,23],[76,23],[22,72],[78,70]];
  const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  const parseExamples=value=>value.split("~").map(pair=>pair.split("¦"));
  function build(config){
    const topic=window.CEFR_TOPICS.find(item=>item.id===config.id);
    const vocabulary=[];
    config.scenes.forEach((scene,sceneIndex)=>{
      scene.words.forEach((raw,index)=>{
        const [display,partOfSpeech,ipa,definition,definitionZh,collocations,collocationsZh,exampleText]=raw;
        const examples=parseExamples(exampleText);
        vocabulary.push({
          id:`${config.id}-${slug(display)}`,display,partOfSpeech,ipa,
          sense:{definition,definitionZh,cefr:"B2",cefrEvidence:{status:"inferred",reference:topic.taxonomyReferences[sceneIndex%topic.taxonomyReferences.length]}},
          collocations:collocations.split("|"),collocationsZh:collocationsZh.split("|"),
          examples:examples.map(item=>item[0]),examplesZh:examples.map(item=>item[1]),
          relatedWords:[],topic:{category:topic.category,subtopic:scene.subtopic},scenes:[scene.id],tags:[config.id,scene.id,topic.titleZh]
        });
      });
    });
    vocabulary.forEach(item=>{const peers=vocabulary.filter(peer=>peer.scenes[0]===item.scenes[0]&&peer.id!==item.id);item.relatedWords=peers.slice(0,2).map(peer=>peer.id);});
    const scenes=config.scenes.map((scene,sceneIndex)=>({
      id:scene.id,title:scene.title,titleZh:scene.titleZh,subtopic:scene.subtopic,description:scene.description,
      icon:scene.icon,accent:topic.accent,accent2:topic.accent2,
      labels:scene.words.map((raw,index)=>({id:`${config.id}-${slug(raw[0])}`,x:positions[index][0],y:positions[index][1]}))
    }));
    return {topic,vocabulary,scenes,idioms:config.idioms};
  }

  const configs=[
    {
      id:"travel",
      scenes:[
        {id:"planning-booking",title:"Planning & Booking",titleZh:"规划与预订",subtopic:"Tourism and holidays",icon:"🧭",description:"Build a practical plan and choose where to stay and what to do.",words:[
          ["itinerary","noun","/aɪˈtɪn.ər.ər.i/","a detailed plan showing the route and activities of a journey","详细行程；旅行计划","detailed itinerary|follow an itinerary|change the itinerary","详细行程|按行程行动|更改行程","Our itinerary includes two days in Kyoto.¦我们的行程包括在京都停留两天。~We changed the itinerary because of the storm.¦由于暴风雨，我们更改了行程。~A flexible itinerary leaves time for unexpected discoveries.¦灵活的行程能为意外发现留出时间。"],
          ["destination","noun","/ˌdes.tɪˈneɪ.ʃən/","the place that someone is travelling to","目的地","final destination|popular destination|reach a destination","最终目的地|热门目的地|到达目的地","Lisbon has become a popular winter destination.¦里斯本已经成为热门的冬季旅行目的地。~We reached our destination shortly before sunset.¦我们在日落前不久到达了目的地。~The app suggests destinations based on your interests.¦这个应用会根据你的兴趣推荐目的地。"],
          ["accommodation","noun","/əˌkɒm.əˈdeɪ.ʃən/","a place where travellers can stay","住宿；住处","book accommodation|affordable accommodation|provide accommodation","预订住宿|价格合适的住宿|提供住宿","We booked accommodation close to the old town.¦我们预订了老城区附近的住宿。~Affordable accommodation is limited during the festival.¦节日期间价格合适的住宿很有限。~The course fee includes meals and accommodation.¦课程费用包括餐饮和住宿。"],
          ["excursion","noun","/ɪkˈskɜː.ʃən/","a short organised trip made for pleasure or education","短途旅行；游览","day excursion|guided excursion|go on an excursion","一日游|有导游的游览|参加短途旅行","We went on a guided excursion to the ancient ruins.¦我们参加了前往古遗址的导览游。~The hotel organises a day excursion to the island.¦酒店组织前往该岛的一日游。~The museum excursion gave students useful context.¦博物馆之行让学生获得了有用的背景知识。"]
        ]},
        {id:"on-the-move",title:"On the Move",titleZh:"在旅途中",subtopic:"Travelling; Journeys",icon:"🚆",description:"Handle connections, timetable changes and the practical stages of a journey.",words:[
          ["stopover","noun","/ˈstɒpˌəʊ.vər/","a short stay between two parts of a long journey","中途停留","brief stopover|overnight stopover|stopover in Dubai","短暂停留|过夜中转|在迪拜中转","We had a six-hour stopover in Singapore.¦我们在新加坡中转了六个小时。~An overnight stopover made the journey less tiring.¦过夜中转让旅程没那么疲惫。~The airline offers a free hotel during long stopovers.¦航空公司为长时间中转提供免费酒店。"],
          ["transfer","noun","/ˈtræns.fɜːr/","the act of moving from one vehicle, service or place to another","换乘；转移","airport transfer|make a transfer|transfer time","机场接送|进行换乘|换乘时间","The airport transfer takes about forty minutes.¦机场接送大约需要四十分钟。~Allow enough time to make the transfer.¦要为换乘留出足够时间。~Our luggage was lost during the transfer.¦我们的行李在转运过程中丢失了。"],
          ["departure","noun","/dɪˈpɑː.tʃər/","the act or time of leaving a place","出发；离开","departure time|departure lounge|delay a departure","出发时间|候机厅|推迟出发","Please check the screen for the departure time.¦请查看屏幕上的出发时间。~We waited in the departure lounge near the gate.¦我们在登机口附近的候机厅等候。~Heavy snow delayed our departure by two hours.¦大雪使我们的出发推迟了两个小时。"],
          ["delayed","adjective","/dɪˈleɪd/","happening later than planned or expected","延误的；推迟的","delayed flight|severely delayed|delayed by weather","延误的航班|严重延误|因天气延误","Our flight was delayed because of thick fog.¦我们的航班因浓雾而延误。~The train is expected to be severely delayed.¦这趟列车预计会严重晚点。~Passengers received updates about the delayed service.¦乘客收到了关于班次延误的最新消息。"]
        ]},
        {id:"exploring-places",title:"Exploring Places",titleZh:"探索地方",subtopic:"Tourism and holidays",icon:"🏞",description:"Describe places, local culture and the experience of discovering somewhere new.",words:[
          ["scenic","adjective","/ˈsiː.nɪk/","having attractive natural views","风景优美的","scenic route|scenic view|scenic coastline","风景优美的路线|优美景色|风景秀丽的海岸线","We took the scenic route through the mountains.¦我们选择了穿越山区的景观路线。~The room has a scenic view of the bay.¦房间可以欣赏海湾美景。~A railway follows the scenic coastline.¦一条铁路沿着风景秀丽的海岸线延伸。"],
          ["remote","adjective","/rɪˈməʊt/","far away from towns and places where most people live","偏远的","remote region|remote village|relatively remote","偏远地区|偏远村庄|相对偏远","The research station lies in a remote region.¦这个研究站位于偏远地区。~We stayed in a remote village without mobile service.¦我们住在一个没有手机信号的偏远村庄。~The beach is beautiful but relatively remote.¦这个海滩很美，但相对偏远。"],
          ["explore","verb","/ɪkˈsplɔːr/","to travel around a place to learn about it","探索；探访","explore the area|explore on foot|fully explore","探索该地区|步行探索|充分探索","We spent the afternoon exploring the old harbour.¦我们用了一下午探索老港口。~The city centre is easy to explore on foot.¦市中心很适合步行探索。~One weekend is not enough to fully explore the region.¦一个周末不足以充分探索这个地区。"],
          ["cultural","adjective","/ˈkʌl.tʃər.əl/","connected with the traditions, arts and way of life of a society","文化的","cultural heritage|cultural exchange|cultural attraction","文化遗产|文化交流|文化景点","The temple is an important cultural attraction.¦这座寺庙是一处重要的文化景点。~Travel can encourage genuine cultural exchange.¦旅行可以促进真正的文化交流。~Local guides explained the island's cultural heritage.¦当地导游讲解了这座岛的文化遗产。"]
        ]}
      ],
      idioms:[
        {phrase:"off the beaten track",meaning:"away from places that many tourists visit",meaningZh:"远离热门旅游路线；人迹罕至",examples:["We found a quiet village off the beaten track.","The guide specialises in places off the beaten track.","Travelling off the beaten track requires careful planning."],examplesZh:["我们发现了一个远离热门路线的安静村庄。","这位导游专门介绍人迹罕至的地方。","前往人迹罕至的地方需要认真规划。"]},
        {phrase:"travel light",meaning:"to take very little luggage",meaningZh:"轻装旅行",examples:["I travel light when I take short trips.","You can move faster if you travel light.","She travelled light with one small backpack."],examplesZh:["短途旅行时我会轻装出行。","轻装旅行可以让你行动更快。","她只带了一个小背包轻装出行。"]},
        {phrase:"hit the road",meaning:"to begin a journey",meaningZh:"出发；上路",examples:["We should hit the road before traffic builds up.","They hit the road just after sunrise.","After breakfast, the group was ready to hit the road."],examplesZh:["我们应该在交通拥堵前出发。","他们日出后不久就上路了。","早餐后，全队准备出发。"]},
        {phrase:"a change of scenery",meaning:"a move to a different place that feels refreshing",meaningZh:"换个环境；换换景色",examples:["A weekend by the sea gave us a change of scenery.","I work in a café when I need a change of scenery.","The family wanted a complete change of scenery."],examplesZh:["海边周末让我们换了个环境。","需要换个环境时，我会去咖啡馆工作。","这家人想彻底换个环境。"]}
      ]
    },
    {
      id:"work",
      scenes:[
        {id:"teams-projects",title:"Teams & Projects",titleZh:"团队与项目",subtopic:"Work, working and the workplace",icon:"👥",description:"Organise tasks, share responsibility and deliver work together.",words:[
          ["workload","noun","/ˈwɜːk.ləʊd/","the amount of work a person is expected to do","工作量","heavy workload|manage a workload|reduce the workload","繁重的工作量|管理工作量|减少工作量","The team has a heavy workload this month.¦团队这个月工作量很大。~Good planning helps us manage the workload.¦良好的规划有助于我们管理工作量。~Automation reduced the administrative workload.¦自动化减少了行政工作量。"],
          ["deadline","noun","/ˈded.laɪn/","the latest time by which work must be completed","截止期限","meet a deadline|tight deadline|extend a deadline","按时完成|紧迫的期限|延长截止期限","We worked efficiently to meet the deadline.¦我们高效工作，以便按时完成。~The design team is facing a tight deadline.¦设计团队正面临紧迫的截止期限。~The client agreed to extend the deadline.¦客户同意延长截止期限。"],
          ["collaborate","verb","/kəˈlæb.ə.reɪt/","to work with other people to achieve something","合作；协作","collaborate closely|collaborate on a project|collaborate with partners","密切合作|在项目上合作|与合作伙伴协作","Two departments collaborated on the new service.¦两个部门合作开发了这项新服务。~We collaborate closely with teams in Europe.¦我们与欧洲的团队密切合作。~Researchers and designers need to collaborate effectively.¦研究人员和设计师需要有效协作。"],
          ["delegate","verb","/ˈdel.ɪ.ɡeɪt/","to give part of your work or authority to someone else","委派；授权","delegate responsibility|delegate a task|delegate effectively","委派责任|分派任务|有效授权","A good manager knows when to delegate a task.¦优秀的管理者知道何时分派任务。~She delegated responsibility for the event to me.¦她把活动责任委派给了我。~Leaders must delegate effectively during busy periods.¦领导者在繁忙时期必须有效授权。"]
        ]},
        {id:"conditions-performance",title:"Conditions & Performance",titleZh:"条件与绩效",subtopic:"Working hours; Workplace",icon:"📊",description:"Discuss working arrangements, results and recognition.",words:[
          ["negotiate","verb","/nɪˈɡəʊ.ʃi.eɪt/","to discuss something formally in order to reach an agreement","谈判；协商","negotiate a contract|negotiate terms|successfully negotiate","谈合同|协商条件|成功协商","She negotiated a flexible working arrangement.¦她协商出了一套灵活工作安排。~Both sides are negotiating the contract terms.¦双方正在协商合同条款。~We successfully negotiated a later delivery date.¦我们成功协商了更晚的交付日期。"],
          ["flexible","adjective","/ˈflek.sə.bəl/","able to change or be changed according to circumstances","灵活的","flexible hours|flexible approach|remain flexible","弹性工作时间|灵活的方法|保持灵活","Flexible hours help parents manage childcare.¦弹性工作时间有助于父母安排托儿。~We need a flexible approach to the problem.¦我们需要用灵活的方法处理这个问题。~The schedule may change, so please remain flexible.¦日程可能改变，请保持灵活。"],
          ["productive","adjective","/prəˈdʌk.tɪv/","achieving useful results in a reasonable amount of time","富有成效的；高效的","productive meeting|highly productive|remain productive","富有成效的会议|非常高效|保持高效","We had a productive meeting with the client.¦我们和客户开了一场富有成效的会议。~Quiet mornings are my most productive time.¦安静的早晨是我效率最高的时候。~Short breaks help employees remain productive.¦短暂休息有助于员工保持高效。"],
          ["promotion","noun","/prəˈməʊ.ʃən/","a move to a more important job or higher rank","晋升；升职","earn a promotion|promotion opportunity|apply for promotion","获得晋升|晋升机会|申请晋升","She earned a promotion after leading the project.¦她领导项目后获得了晋升。~The company offers clear promotion opportunities.¦公司提供明确的晋升机会。~He plans to apply for promotion next year.¦他计划明年申请晋升。"]
        ]},
        {id:"careers-growth",title:"Careers & Growth",titleZh:"职业与成长",subtopic:"Workers in general; Employment",icon:"🚀",description:"Move through recruitment, career decisions and professional development.",words:[
          ["recruit","verb","/rɪˈkruːt/","to find and employ new people for an organisation","招聘；招募","recruit staff|actively recruit|recruit graduates","招聘员工|积极招聘|招聘毕业生","The company plans to recruit twenty engineers.¦公司计划招聘二十名工程师。~We actively recruit people from different backgrounds.¦我们积极招聘不同背景的人才。~Several banks recruit graduates through this programme.¦几家银行通过这个项目招聘毕业生。"],
          ["resign","verb","/rɪˈzaɪn/","to officially leave a job or position","辞职；辞去职务","resign from a job|resign as director|unexpectedly resign","从工作中辞职|辞去董事职务|意外辞职","She resigned from her job to study abroad.¦她辞职去国外学习。~He resigned as director after ten years.¦十年后，他辞去了董事职务。~Two senior managers unexpectedly resigned.¦两名高级经理意外辞职。"],
          ["qualification","noun","/ˌkwɒl.ɪ.fɪˈkeɪ.ʃən/","a skill, quality or official record that makes someone suitable for a job","资格；资历；学历","professional qualification|gain a qualification|required qualification","专业资格|取得资格|必备资历","A teaching qualification is required for the role.¦这个职位要求具备教师资格。~She gained a professional qualification online.¦她通过在线学习取得了专业资格。~Experience can be as valuable as a formal qualification.¦经验可能和正式资历同样宝贵。"],
          ["initiative","noun","/ɪˈnɪʃ.ə.tɪv/","the ability to act and make decisions without being told what to do","主动性；进取心","show initiative|use your initiative|take the initiative","表现出主动性|发挥主动性|采取主动","He showed initiative by solving the issue early.¦他提前解决问题，表现出了主动性。~Employees are encouraged to use their initiative.¦公司鼓励员工发挥主动性。~Maya took the initiative and organised the workshop.¦玛雅主动组织了研讨会。"]
        ]}
      ],
      idioms:[
        {phrase:"learn the ropes",meaning:"to learn how a job or activity is done",meaningZh:"熟悉工作门道",examples:["It took me a month to learn the ropes.","A mentor helped the new recruits learn the ropes.","Give her time to learn the ropes."],examplesZh:["我花了一个月熟悉工作门道。","一位导师帮助新员工熟悉工作。","给她一点时间熟悉业务。"]},
        {phrase:"pull your weight",meaning:"to do your fair share of work",meaningZh:"尽好自己的本分",examples:["Everyone must pull their weight on this project.","He is reliable and always pulls his weight.","The team struggled because two members did not pull their weight."],examplesZh:["每个人都必须在这个项目中尽好本分。","他很可靠，总会完成自己该做的部分。","两名成员没有尽责，团队因此很吃力。"]},
        {phrase:"get the ball rolling",meaning:"to start an activity or process",meaningZh:"启动某事；带头开始",examples:["Let's get the ball rolling with a short introduction.","One email was enough to get the ball rolling.","The manager got the ball rolling on the new project."],examplesZh:["我们先做个简短介绍，把事情启动起来。","一封邮件就足以推动事情开始。","经理启动了新项目。"]},
        {phrase:"back to the drawing board",meaning:"used when a plan has failed and must be redesigned",meaningZh:"从头再来；重新规划",examples:["The prototype failed, so it was back to the drawing board.","We may need to go back to the drawing board.","Customer feedback sent the team back to the drawing board."],examplesZh:["原型失败了，所以只能重新设计。","我们可能需要从头规划。","客户反馈让团队重新开始设计。"]}
      ]
    },
    {
      id:"technology",
      scenes:[
        {id:"systems-software",title:"Systems & Software",titleZh:"系统与软件",subtopic:"Computer concepts; Software",icon:"💻",description:"Explain how software works and solve common technical problems.",words:[
          ["algorithm","noun","/ˈæl.ɡə.rɪ.ðəm/","a set of rules or steps used to solve a problem","算法","search algorithm|recommendation algorithm|design an algorithm","搜索算法|推荐算法|设计算法","The recommendation algorithm learns from viewing habits.¦推荐算法会从观看习惯中学习。~Engineers designed an algorithm to detect fraud.¦工程师设计了一种检测欺诈的算法。~A small change made the search algorithm faster.¦一个小改动让搜索算法更快了。"],
          ["interface","noun","/ˈɪn.tə.feɪs/","the way a user controls or communicates with a computer system","界面；接口","user interface|simple interface|redesign the interface","用户界面|简洁界面|重新设计界面","The app has a clean user interface.¦这个应用拥有简洁的用户界面。~We redesigned the interface for smaller screens.¦我们为小屏幕重新设计了界面。~A simple interface makes the tool easier to learn.¦简洁的界面让工具更容易学习。"],
          ["compatible","adjective","/kəmˈpæt.ə.bəl/","able to work successfully with another device or system","兼容的","fully compatible|compatible with|backward-compatible","完全兼容|与……兼容|向后兼容的","The keyboard is compatible with most tablets.¦这款键盘兼容大多数平板电脑。~The new file format is not fully compatible.¦新文件格式并非完全兼容。~Backward-compatible software supports older devices.¦向后兼容的软件支持较旧设备。"],
          ["troubleshoot","verb","/ˈtrʌb.əl.ʃuːt/","to find and solve problems in a system or machine","排查并解决故障","troubleshoot a problem|troubleshoot remotely|troubleshooting guide","排查问题|远程排障|故障排查指南","The technician helped us troubleshoot the connection.¦技术人员帮助我们排查连接问题。~Most issues can be troubleshot remotely.¦大多数问题可以远程排查。~Follow the troubleshooting guide before calling support.¦联系支持人员前，请先查看故障排查指南。"]
        ]},
        {id:"data-security",title:"Data & Security",titleZh:"数据与安全",subtopic:"Computer concepts; Internet terminology",icon:"🔐",description:"Protect information, maintain systems and control digital access.",words:[
          ["update","verb","/ʌpˈdeɪt/","to make software or information more recent","更新","update software|regularly update|security update","更新软件|定期更新|安全更新","Remember to update the software regularly.¦记得定期更新软件。~The security update fixes several weaknesses.¦这次安全更新修复了几个漏洞。~We updated the database with the latest figures.¦我们用最新数据更新了数据库。"],
          ["backup","noun","/ˈbæk.ʌp/","a copy of information kept in case the original is lost","备份","create a backup|automatic backup|restore from backup","创建备份|自动备份|从备份恢复","Create a backup before changing the system.¦更改系统前请创建备份。~Automatic backups run every night.¦自动备份每晚运行。~We restored the files from a recent backup.¦我们从最近的备份中恢复了文件。"],
          ["privacy","noun","/ˈprɪv.ə.si/","the right to keep personal information and activities private","隐私；私密权","protect privacy|privacy settings|privacy concern","保护隐私|隐私设置|隐私担忧","Users can change their privacy settings.¦用户可以更改隐私设置。~The company introduced new measures to protect privacy.¦公司采取了保护隐私的新措施。~Location tracking raises serious privacy concerns.¦位置追踪引发了严重的隐私担忧。"],
          ["secure","adjective","/sɪˈkjʊər/","protected against attack, loss or unauthorised access","安全的；受保护的","secure connection|keep data secure|secure system","安全连接|保障数据安全|安全系统","Use a secure connection when making payments.¦付款时请使用安全连接。~Encryption helps keep customer data secure.¦加密有助于保障客户数据安全。~The team is building a more secure system.¦团队正在构建一个更安全的系统。"]
        ]},
        {id:"digital-change",title:"Digital Change",titleZh:"数字化变革",subtopic:"Computer concepts; Innovation",icon:"🤖",description:"Discuss access, automation and the wider effect of new technology.",words:[
          ["access","noun","/ˈæk.ses/","the opportunity or right to use or obtain something","使用权；获取机会","internet access|gain access|limit access","互联网接入|获得访问权|限制访问","Remote villages still lack reliable internet access.¦偏远村庄仍缺少可靠的互联网接入。~Staff need permission to gain access to the system.¦员工需要获得许可才能进入系统。~The administrator can limit access to sensitive files.¦管理员可以限制对敏感文件的访问。"],
          ["automated","adjective","/ˈɔː.tə.meɪ.tɪd/","operated by machines or software with little human control","自动化的","automated system|fully automated|automated process","自动化系统|完全自动化|自动化流程","An automated system checks every payment.¦自动化系统会检查每笔付款。~The warehouse is now almost fully automated.¦这座仓库现在几乎完全自动化。~The automated process saves several hours a week.¦自动化流程每周能节省几个小时。"],
          ["innovation","noun","/ˌɪn.əˈveɪ.ʃən/","a new idea, method or product, or the development of these","创新；革新","technological innovation|encourage innovation|major innovation","技术创新|鼓励创新|重大创新","Technological innovation has changed medical care.¦技术创新改变了医疗服务。~Small teams often encourage innovation.¦小团队往往能鼓励创新。~The battery design was a major innovation.¦这种电池设计是一项重大创新。"],
          ["digital","adjective","/ˈdɪdʒ.ɪ.təl/","using computer technology or electronic information","数字化的","digital service|digital skills|digital divide","数字服务|数字技能|数字鸿沟","The bank is expanding its digital services.¦银行正在扩展数字服务。~Digital skills are essential in many jobs.¦数字技能在许多工作中都很重要。~Public libraries can help reduce the digital divide.¦公共图书馆可以帮助缩小数字鸿沟。"]
        ]}
      ],
      idioms:[
        {phrase:"at the push of a button",meaning:"very easily, by using a simple control",meaningZh:"只需按一下按钮；轻松完成",examples:["You can translate the page at the push of a button.","The lights adjust at the push of a button.","Reports are available at the push of a button."],examplesZh:["只需按一下按钮就能翻译页面。","灯光可以一键调节。","报告可以一键获取。"]},
        {phrase:"not rocket science",meaning:"not very difficult to understand",meaningZh:"并不复杂；并非高深学问",examples:["Installing the update is not rocket science.","Good password security is not rocket science.","The interface should make the task feel like it is not rocket science."],examplesZh:["安装更新并不复杂。","做好密码安全并不是什么高深学问。","这个界面应该让任务显得简单易懂。"]},
        {phrase:"ahead of the curve",meaning:"more advanced than other people or organisations",meaningZh:"走在前沿；领先一步",examples:["The company stayed ahead of the curve by investing in AI.","Regular training keeps the team ahead of the curve.","Their privacy design is ahead of the curve."],examplesZh:["公司通过投资人工智能保持领先。","定期培训让团队走在前沿。","他们的隐私设计领先一步。"]},
        {phrase:"pull the plug",meaning:"to stop an activity or end support for it",meaningZh:"终止；停止支持",examples:["The company pulled the plug on the old app.","They may pull the plug if testing fails.","Funding problems forced the team to pull the plug."],examplesZh:["公司停止了旧应用。","如果测试失败，他们可能会终止项目。","资金问题迫使团队叫停项目。"]}
      ]
    },
    {
      id:"environment",
      scenes:[
        {id:"climate-energy",title:"Climate & Energy",titleZh:"气候与能源",subtopic:"Environmental issues",icon:"🌍",description:"Discuss emissions, conservation and the transition to cleaner energy.",words:[
          ["emission","noun","/ɪˈmɪʃ.ən/","a gas or other substance released into the air","排放物；排放","carbon emissions|reduce emissions|vehicle emissions","碳排放|减少排放|车辆排放","The city aims to reduce carbon emissions by 40 percent.¦该市计划将碳排放减少百分之四十。~Vehicle emissions affect air quality.¦车辆排放会影响空气质量。~New rules require companies to report their emissions.¦新规要求企业报告排放量。"],
          ["conservation","noun","/ˌkɒn.səˈveɪ.ʃən/","the protection of nature and careful use of resources","保护；节约","wildlife conservation|conservation project|energy conservation","野生动物保护|保护项目|节约能源","The island supports several wildlife conservation projects.¦这座岛支持多个野生动物保护项目。~Energy conservation can lower household bills.¦节约能源可以降低家庭账单。~Local communities play a key role in forest conservation.¦当地社区在森林保护中发挥关键作用。"],
          ["sustainable","adjective","/səˈsteɪ.nə.bəl/","able to continue without causing serious environmental damage","可持续的","sustainable development|sustainable transport|environmentally sustainable","可持续发展|可持续交通|环境上可持续","The city is investing in sustainable transport.¦这座城市正在投资可持续交通。~Farmers are testing more sustainable methods.¦农民正在测试更可持续的方法。~Economic growth must be environmentally sustainable.¦经济增长必须在环境上可持续。"],
          ["renewable","adjective","/rɪˈnjuː.ə.bəl/","produced from a source that does not run out, such as wind or sunlight","可再生的","renewable energy|renewable source|fully renewable","可再生能源|可再生来源|完全可再生","Wind supplies a growing share of renewable energy.¦风能在可再生能源中的占比不断增加。~The factory plans to use fully renewable electricity.¦工厂计划使用完全可再生的电力。~Solar power is a widely available renewable source.¦太阳能是一种广泛可用的可再生能源。"]
        ]},
        {id:"nature-resources",title:"Nature & Resources",titleZh:"自然与资源",subtopic:"Environmental issues; The natural world",icon:"🦋",description:"Explain how species and habitats are affected by human activity.",words:[
          ["biodiversity","noun","/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/","the variety of plant and animal life in a place","生物多样性","protect biodiversity|loss of biodiversity|rich biodiversity","保护生物多样性|生物多样性丧失|丰富的生物多样性","The wetland supports rich biodiversity.¦这片湿地拥有丰富的生物多样性。~Intensive farming can cause a loss of biodiversity.¦集约化农业可能导致生物多样性丧失。~The plan includes measures to protect biodiversity.¦该计划包括保护生物多样性的措施。"],
          ["habitat","noun","/ˈhæb.ɪ.tæt/","the natural environment where an animal or plant normally lives","栖息地","natural habitat|destroy a habitat|habitat loss","自然栖息地|破坏栖息地|栖息地丧失","Road building has damaged the animals' natural habitat.¦道路建设破坏了这些动物的自然栖息地。~Habitat loss is a major threat to the species.¦栖息地丧失是这个物种面临的主要威胁。~The project will restore damaged coastal habitats.¦该项目将修复受损的沿海栖息地。"],
          ["pollution","noun","/pəˈluː.ʃən/","damage caused by harmful substances entering the environment","污染","air pollution|plastic pollution|tackle pollution","空气污染|塑料污染|治理污染","Air pollution remains a serious health risk.¦空气污染仍然是严重的健康风险。~Volunteers collected data on plastic pollution.¦志愿者收集了塑料污染的数据。~Stronger laws are needed to tackle pollution.¦需要更严格的法律来治理污染。"],
          ["recycle","verb","/ˌriːˈsaɪ.kəl/","to process used materials so that they can be used again","回收利用","recycle waste|widely recycled|recycle properly","回收废物|被广泛回收|正确回收","The centre recycles electronic waste safely.¦该中心安全回收电子废物。~Glass can be recycled many times.¦玻璃可以多次回收利用。~Clear labels help people recycle properly.¦清晰的标签帮助人们正确回收。"]
        ]},
        {id:"everyday-impact",title:"Everyday Impact",titleZh:"日常影响",subtopic:"Environmental issues",icon:"♻",description:"Connect daily choices with climate pressure and the survival of species.",words:[
          ["biodegradable","adjective","/ˌbaɪ.əʊ.dɪˈɡreɪ.də.bəl/","able to decay naturally without harming the environment","可生物降解的","biodegradable packaging|fully biodegradable|biodegradable material","可降解包装|完全可降解|可降解材料","The café uses biodegradable packaging.¦这家咖啡馆使用可生物降解的包装。~The new material is fully biodegradable.¦这种新材料可以完全生物降解。~Biodegradable bags still need suitable conditions to break down.¦可降解袋仍需要合适条件才能分解。"],
          ["climate","noun","/ˈklaɪ.mət/","the usual weather conditions in a region over a long period","气候","changing climate|climate policy|tropical climate","变化的气候|气候政策|热带气候","Farmers are adapting to a changing climate.¦农民正在适应不断变化的气候。~The government announced a new climate policy.¦政府宣布了一项新的气候政策。~The region has a warm tropical climate.¦该地区属于温暖的热带气候。"],
          ["footprint","noun","/ˈfʊt.prɪnt/","the amount of environmental impact caused by a person, activity or product","环境足迹；碳足迹","carbon footprint|reduce your footprint|environmental footprint","碳足迹|减少个人足迹|环境足迹","Taking the train can reduce your carbon footprint.¦乘火车可以减少你的碳足迹。~The company measured the environmental footprint of its products.¦公司测量了产品的环境足迹。~Eating less food shipped by air may reduce your footprint.¦少吃空运食品可能会降低你的环境足迹。"],
          ["endangered","adjective","/ɪnˈdeɪn.dʒəd/","at serious risk of disappearing forever","濒危的","endangered species|critically endangered|protect endangered animals","濒危物种|极度濒危|保护濒危动物","The reserve protects several endangered species.¦保护区保护着几个濒危物种。~This turtle is now critically endangered.¦这种海龟目前已极度濒危。~Tourism income can help protect endangered animals.¦旅游收入可以帮助保护濒危动物。"]
        ]}
      ],
      idioms:[
        {phrase:"a drop in the ocean",meaning:"an amount too small to have much effect",meaningZh:"沧海一粟；杯水车薪",examples:["One small donation may feel like a drop in the ocean.","The new trees are a drop in the ocean compared with those lost.","Individual action is not merely a drop in the ocean when millions join in."],examplesZh:["一笔小额捐款可能显得杯水车薪。","与损失的树木相比，新种的树只是沧海一粟。","当数百万人参与时，个人行动并非杯水车薪。"]},
        {phrase:"go green",meaning:"to adopt a way of living or working that causes less environmental harm",meaningZh:"采取环保方式；走向绿色",examples:["The hotel is trying to go green.","Small businesses can go green without huge costs.","Our office went green by cutting energy use."],examplesZh:["这家酒店正努力转向环保经营。","小企业无需巨额成本也能走向绿色。","我们办公室通过减少能耗实现了绿色转型。"]},
        {phrase:"the tip of the iceberg",meaning:"a small visible part of a much larger problem",meaningZh:"冰山一角",examples:["The waste on the beach is only the tip of the iceberg.","These figures may be the tip of the iceberg.","Visible pollution is just the tip of the iceberg."],examplesZh:["海滩上的垃圾只是问题的冰山一角。","这些数字可能只是冰山一角。","看得见的污染只是冰山一角。"]},
        {phrase:"weather the storm",meaning:"to survive a difficult period",meaningZh:"渡过难关",examples:["The forest may not weather the storm without protection.","Small farms need support to weather the storm.","The community worked together to weather the storm."],examplesZh:["如果没有保护，这片森林可能无法渡过难关。","小农场需要支持来渡过难关。","社区齐心协力度过了困难时期。"]}
      ]
    },
    {
      id:"health",
      scenes:[
        {id:"symptoms-care",title:"Symptoms & Care",titleZh:"症状与诊疗",subtopic:"Symptoms and diagnosis of medical problems",icon:"🩺",description:"Describe a health problem and understand the stages of medical care.",words:[
          ["symptom","noun","/ˈsɪmp.təm/","a physical or mental change that may show an illness","症状","common symptom|develop symptoms|relieve a symptom","常见症状|出现症状|缓解症状","A persistent cough can be a symptom of infection.¦持续咳嗽可能是感染的症状。~Contact a doctor if you develop serious symptoms.¦如果出现严重症状，请联系医生。~The medicine relieved the worst symptom.¦这种药缓解了最严重的症状。"],
          ["diagnosis","noun","/ˌdaɪ.əɡˈnəʊ.sɪs/","a medical judgement about what illness someone has","诊断","accurate diagnosis|early diagnosis|confirm a diagnosis","准确诊断|早期诊断|确认诊断","An accurate diagnosis may require several tests.¦准确诊断可能需要多项检查。~Early diagnosis greatly improves the outcome.¦早期诊断能显著改善治疗结果。~The scan helped doctors confirm the diagnosis.¦扫描帮助医生确认了诊断。"],
          ["treatment","noun","/ˈtriːt.mənt/","medical care given to improve an illness or injury","治疗；疗法","receive treatment|effective treatment|course of treatment","接受治疗|有效治疗|疗程","She received treatment for a shoulder injury.¦她接受了肩伤治疗。~Researchers are testing a more effective treatment.¦研究人员正在测试一种更有效的疗法。~He completed a six-week course of treatment.¦他完成了为期六周的疗程。"],
          ["recover","verb","/rɪˈkʌv.ər/","to become well again after illness or injury","康复；恢复","recover fully|recover from surgery|slowly recover","完全康复|术后恢复|逐渐恢复","Most patients recover fully within a month.¦大多数患者会在一个月内完全康复。~She is recovering from minor surgery.¦她正在从一个小手术中恢复。~His strength slowly recovered after the illness.¦患病后，他的体力逐渐恢复。"]
        ]},
        {id:"long-term-health",title:"Long-term Health",titleZh:"长期健康",subtopic:"Health in general; Not fit and healthy",icon:"❤️",description:"Talk about ongoing conditions, immunity and habits that support wellbeing.",words:[
          ["chronic","adjective","/ˈkrɒn.ɪk/","continuing for a long time and often difficult to cure","慢性的；长期的","chronic condition|chronic pain|chronic illness","慢性病|慢性疼痛|慢性疾病","The clinic supports people with chronic conditions.¦这家诊所为慢性病患者提供支持。~Regular exercise may reduce chronic pain.¦规律运动可能减轻慢性疼痛。~Managing a chronic illness can be demanding.¦管理慢性疾病可能很辛苦。"],
          ["immune","adjective","/ɪˈmjuːn/","connected with the body's ability to protect itself from disease","免疫的","immune system|immune response|weakened immune system","免疫系统|免疫反应|免疫系统减弱","Sleep plays an important role in the immune system.¦睡眠对免疫系统很重要。~The vaccine produces a strong immune response.¦这种疫苗会产生强烈的免疫反应。~Stress may affect a weakened immune system.¦压力可能会影响已经减弱的免疫系统。"],
          ["wellbeing","noun","/ˌwelˈbiː.ɪŋ/","the state of feeling healthy, comfortable and satisfied","身心健康；幸福感","mental wellbeing|support wellbeing|overall wellbeing","心理健康|支持身心健康|整体健康","Time outdoors can improve mental wellbeing.¦户外活动可以改善心理健康。~The programme supports staff wellbeing.¦这个项目支持员工的身心健康。~Social connection contributes to overall wellbeing.¦社会联系有助于整体幸福感。"],
          ["balanced","adjective","/ˈbæl.ənst/","including the right amounts of different things","均衡的；平衡的","balanced diet|balanced lifestyle|well-balanced meal","均衡饮食|平衡的生活方式|营养均衡的一餐","A balanced diet provides a range of nutrients.¦均衡饮食能提供多种营养。~She tries to maintain a balanced lifestyle.¦她努力保持平衡的生活方式。~The school provides a well-balanced meal.¦学校提供营养均衡的一餐。"]
        ]},
        {id:"prevention-services",title:"Prevention & Services",titleZh:"预防与医疗服务",subtopic:"Health in general; Medical treatment",icon:"🏥",description:"Use health services confidently and discuss risks, medicine and prevention.",words:[
          ["prevent","verb","/prɪˈvent/","to stop something harmful from happening","预防；阻止","prevent disease|help prevent|prevent an injury","预防疾病|帮助预防|防止受伤","Vaccination can help prevent serious disease.¦接种疫苗可以帮助预防严重疾病。~Warm-up exercises may prevent an injury.¦热身运动可能有助于防止受伤。~Clean water prevents many common infections.¦清洁用水可以预防许多常见感染。"],
          ["prescription","noun","/prɪˈskrɪp.ʃən/","an official instruction from a doctor for a particular medicine","处方","get a prescription|prescription medicine|repeat prescription","取得处方|处方药|续方","You need a prescription for this medicine.¦这种药需要医生处方。~The doctor sent the prescription to the pharmacy.¦医生把处方发给了药房。~She requested a repeat prescription online.¦她在网上申请了续方。"],
          ["side effect","noun","/ˈsaɪd ɪˌfekt/","an unwanted effect caused by a medicine or treatment","副作用","common side effect|experience side effects|serious side effect","常见副作用|出现副作用|严重副作用","Drowsiness is a common side effect of the medicine.¦嗜睡是这种药的常见副作用。~Contact the clinic if you experience side effects.¦如果出现副作用，请联系诊所。~The treatment rarely causes serious side effects.¦这种治疗很少引起严重副作用。"],
          ["appointment","noun","/əˈpɔɪnt.mənt/","an arranged time to meet a health professional","预约；约诊","book an appointment|medical appointment|cancel an appointment","预约|医疗预约|取消预约","I booked an appointment with my dentist.¦我预约了牙医。~The medical appointment lasted about twenty minutes.¦这次医疗问诊持续了大约二十分钟。~Please call if you need to cancel the appointment.¦如果需要取消预约，请打电话。"]
        ]}
      ],
      idioms:[
        {phrase:"back on your feet",meaning:"healthy and active again after illness",meaningZh:"恢复健康；重新振作",examples:["She was back on her feet within a week.","Rest will help you get back on your feet.","The treatment got him back on his feet."],examplesZh:["她一周内就恢复了健康。","休息会帮助你恢复。","治疗使他恢复了健康。"]},
        {phrase:"under the weather",meaning:"feeling slightly ill",meaningZh:"身体不适",examples:["I am feeling a little under the weather today.","He stayed home because he was under the weather.","You look under the weather; get some rest."],examplesZh:["我今天感觉有点不舒服。","他因为身体不适留在家里。","你看起来不舒服，休息一下吧。"]},
        {phrase:"a clean bill of health",meaning:"a statement that someone or something is healthy or in good condition",meaningZh:"健康证明；状况良好",examples:["The doctor gave her a clean bill of health.","The building received a clean bill of health after inspection.","Tests gave the athlete a clean bill of health."],examplesZh:["医生确认她身体健康。","检查后，这栋楼被确认状况良好。","检测确认这名运动员健康状况良好。"]},
        {phrase:"on the road to recovery",meaning:"gradually becoming healthy again",meaningZh:"正在康复中",examples:["He is finally on the road to recovery.","Regular therapy put her on the road to recovery.","The patient remains on the road to recovery."],examplesZh:["他终于开始康复了。","规律治疗让她走上康复之路。","患者仍在逐步康复。"]}
      ]
    }
  ];

  window.CEFR_ADDITIONAL_TOPIC_PACKS=Object.fromEntries(configs.map(config=>[config.id,build(config)]));
})();
