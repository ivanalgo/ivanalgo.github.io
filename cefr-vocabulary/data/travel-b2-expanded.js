(function(){
  const r=(display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa="")=>[display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa];
  CEFR_EXPAND_TOPIC("travel",{
    sceneOrder:["planning-booking","on-the-move","exploring-places","accommodation-services","culture-responsible-tourism"],
    existingImages:{
      "planning-booking":"assets/images/travel/planning-booking-v2.webp",
      "on-the-move":"assets/images/travel/on-the-move-v2.webp",
      "exploring-places":"assets/images/travel/exploring-places-v2.webp"
    },
    newScenes:[
      {id:"accommodation-services",title:"Accommodation & Services",titleZh:"住宿与服务",subtopic:"Tourism and holidays",image:"assets/images/travel/accommodation-services-v2.webp",description:"Book a stay, use hotel services and solve common accommodation problems."},
      {id:"culture-responsible-tourism",title:"Culture & Responsible Tourism",titleZh:"文化与责任旅行",subtopic:"Tourism and holidays; Travelling",image:"assets/images/travel/culture-responsible-tourism-v2.webp",description:"Engage respectfully with local culture and consider tourism's wider impact."}
    ],
    words:{
      "planning-booking":[
        r("reservation","noun","an arrangement to keep a room, seat or service for someone","预订；预约","make a reservation|confirm a reservation|cancel a reservation","进行预订|确认预订|取消预订","I made a reservation at a small hotel near the station.","我在车站附近的一家小酒店进行了预订。"),
        r("availability","noun","the fact that something can be obtained or used","可用情况；空余","check availability|limited availability|room availability","查询可用情况|名额有限|房间空余情况","Please check room availability before booking your flight.","订机票前请先查询房间空余情况。"),
        r("package","noun","a holiday sold for one price that includes several services","旅游套餐","holiday package|all-inclusive package|package deal","度假套餐|全包套餐|套餐优惠","The holiday package includes flights and breakfast.","这个度假套餐包括机票和早餐。"),
        r("budget","noun","the amount of money available for a particular purpose","预算","travel budget|stay within budget|limited budget","旅行预算|不超预算|有限预算","We chose the guesthouse because it suited our budget.","我们选择这家旅馆是因为它符合预算。"),
        r("visa","noun","an official document allowing someone to enter or stay in a country","签证","apply for a visa|valid visa|visa requirement","申请签证|有效签证|签证要求","She applied for a visa three months before departure.","她在出发前三个月申请了签证。"),
        r("insurance","noun","an agreement that provides financial protection against loss or damage","保险","travel insurance|insurance policy|insurance cover","旅行保险|保险单|保险保障","Travel insurance covered the cost of the cancelled flight.","旅行保险承担了航班取消的费用。")
      ],
      "on-the-move":[
        r("connection","noun","a transport service that allows a journey to continue","联程；转乘","miss a connection|connecting flight|make a connection","错过转乘|转机航班|赶上转乘","The delay meant that we missed our connection.","延误导致我们错过了转乘。"),
        r("luggage","noun","bags and cases taken on a journey","行李","hand luggage|lost luggage|luggage allowance","手提行李|遗失行李|行李额度","My luggage arrived on a later flight.","我的行李由后一班航班运到。"),
        r("customs","noun","the place where officials check goods entering a country","海关","go through customs|customs officer|customs declaration","通过海关|海关人员|海关申报","We went through customs in less than twenty minutes.","我们不到二十分钟就通过了海关。"),
        r("boarding","noun","the process of getting onto an aircraft, ship or train","登机；登船；上车","boarding pass|boarding gate|begin boarding","登机牌|登机口|开始登机","Boarding begins forty minutes before the flight.","航班起飞前四十分钟开始登机。"),
        r("disruption","noun","a problem that interrupts a journey or service","交通中断；扰乱","travel disruption|major disruption|cause disruption","出行中断|严重中断|造成中断","Storms caused major disruption across the rail network.","暴风雨导致铁路网络严重中断。"),
        r("commute","verb","to travel regularly between home and work","通勤","daily commute|commute by train|long commute","日常通勤|乘火车通勤|长距离通勤","Many residents commute by train to the capital.","许多居民乘火车到首都通勤。")
      ],
      "exploring-places":[
        r("landmark","noun","a building or place that is easily recognised and often historically important","地标","famous landmark|historic landmark|local landmark","著名地标|历史地标|当地地标","The bridge is the city's best-known landmark.","这座桥是该市最著名的地标。"),
        r("breathtaking","adjective","extremely beautiful or impressive","令人惊叹的","breathtaking view|breathtaking scenery|absolutely breathtaking","令人惊叹的景色|壮丽风光|绝对震撼","The view from the mountain was breathtaking.","山顶的景色令人惊叹。"),
        r("hospitality","noun","friendly and generous treatment of guests or visitors","热情款待；好客","warm hospitality|local hospitality|hospitality industry","热情款待|当地人的好客|酒店旅游业","We were touched by the family's warm hospitality.","这家人的热情款待令我们感动。"),
        r("authentic","adjective","real and true to local tradition rather than made for tourists","真实的；地道的","authentic experience|authentic cuisine|genuinely authentic","真实体验|地道美食|真正地道","A local guide helped us find authentic regional food.","当地导游帮助我们找到了地道的地方美食。"),
        r("wander","verb","to walk around slowly without a fixed route","漫步；闲逛","wander through|wander around|wander freely","漫步穿过|四处闲逛|自由漫步","We wandered through the narrow streets after dinner.","晚饭后，我们漫步穿过狭窄的街道。"),
        r("local","noun","a person who lives in a particular area","当地人","ask a local|friendly locals|meet local people","询问当地人|友好的当地人|结识当地人","A local showed us a quieter path to the waterfall.","一位当地人给我们指了一条通往瀑布的安静小路。")
      ],
      "accommodation-services":[
        r("check-in","noun","the process of registering when arriving at a hotel or airport","办理入住；值机","online check-in|check-in desk|early check-in","网上值机|值机柜台|提前入住","Online check-in saved us time at the airport.","网上值机为我们节省了机场等候时间。"),
        r("vacancy","noun","an available room in a hotel","空房","have a vacancy|no vacancies|last-minute vacancy","有空房|没有空房|临时空房","The hotel had one vacancy left for the weekend.","这家酒店周末只剩一个空房。"),
        r("facility","noun","a building, room or service provided for a particular purpose","设施","hotel facilities|leisure facility|excellent facilities","酒店设施|休闲设施|优良设施","Guests can use all the leisure facilities without charge.","客人可以免费使用所有休闲设施。"),
        r("complimentary","adjective","provided free of charge","免费的；赠送的","complimentary breakfast|complimentary drink|complimentary service","免费早餐|赠饮|免费服务","The room includes complimentary breakfast and Wi-Fi.","房间包含免费早餐和无线网络。"),
        r("reception","noun","the hotel area where guests arrive and ask for help","酒店前台；接待处","hotel reception|ask at reception|reception desk","酒店前台|到前台询问|接待柜台","Please leave your key at reception when you go out.","外出时请把钥匙留在前台。"),
        r("complaint","noun","a statement that something is wrong or unsatisfactory","投诉；抱怨","make a complaint|formal complaint|handle a complaint","提出投诉|正式投诉|处理投诉","The manager handled our complaint professionally.","经理专业地处理了我们的投诉。"),
        r("refund","noun","money returned because a service was not provided or accepted","退款","full refund|request a refund|receive a refund","全额退款|申请退款|收到退款","We received a full refund for the cancelled tour.","取消行程后，我们收到了全额退款。"),
        r("upgrade","noun","a move to a better room, seat or level of service","升级","free upgrade|room upgrade|upgrade to business class","免费升级|房型升级|升级到商务舱","The airline offered us a free upgrade.","航空公司为我们提供了免费升级。"),
        r("self-catering","adjective","providing cooking facilities so guests can prepare their own meals","自炊式的","self-catering apartment|self-catering holiday|self-catering accommodation","自炊式公寓|自炊式度假|自炊式住宿","We rented a self-catering apartment near the beach.","我们在海滩附近租了一套自炊式公寓。"),
        r("resort","noun","a place where many people go for holidays and recreation","度假胜地；度假村","beach resort|luxury resort|popular resort","海滨度假村|豪华度假村|热门度假地","The former fishing village is now a popular resort.","这个昔日的渔村如今是热门度假地。")
      ],
      "culture-responsible-tourism":[
        r("heritage","noun","traditions, buildings and culture passed down from the past","文化遗产；传统","cultural heritage|protect heritage|heritage site","文化遗产|保护遗产|遗产地","Tourism income helps maintain the town's cultural heritage.","旅游收入有助于维护这座城镇的文化遗产。"),
        r("custom","noun","a traditional way of behaving in a particular society","习俗","local custom|traditional custom|respect a custom","当地习俗|传统习俗|尊重习俗","Visitors should learn about local customs before arriving.","游客抵达前应了解当地习俗。"),
        r("respectful","adjective","showing consideration for people, culture or places","尊重的；有礼的","respectful behaviour|remain respectful|respectful visitor","尊重的行为|保持尊重|有礼的访客","Photography is allowed if visitors remain respectful.","只要游客保持尊重，就可以拍照。"),
        r("responsible tourism","noun","travel that reduces harm and benefits local people and places","责任旅游","promote responsible tourism|responsible tourism policy|support responsible tourism","推广责任旅游|责任旅游政策|支持责任旅游","The project promotes responsible tourism in rural communities.","该项目在乡村社区推广责任旅游。"),
        r("overcrowding","noun","a situation in which too many people are in one place","过度拥挤","tourist overcrowding|reduce overcrowding|seasonal overcrowding","游客过度拥挤|减少拥挤|季节性拥挤","Timed tickets have reduced overcrowding at the museum.","分时段门票减少了博物馆的过度拥挤。"),
        r("preserve","verb","to protect something and keep it in good condition","保护；保存","preserve a tradition|preserve wildlife|carefully preserve","保护传统|保护野生动物|悉心保存","The community works to preserve its traditional crafts.","社区努力保护传统手工艺。"),
        r("community","noun","people living in one area or sharing a common interest","社区；群体","local community|support a community|community project","当地社区|支持社区|社区项目","The tour is managed by the local community.","这项旅游活动由当地社区管理。"),
        r("impact","noun","a strong effect that an activity has on people or places","影响","environmental impact|positive impact|assess the impact","环境影响|积极影响|评估影响","Visitors should consider the environmental impact of their trip.","游客应考虑旅行对环境的影响。"),
        r("volunteer","verb","to offer to do something without being paid","志愿服务；自愿做","volunteer abroad|volunteer locally|volunteer project","海外志愿服务|本地志愿服务|志愿项目","She volunteered at a coastal conservation project.","她在一个海岸保护项目中做志愿者。"),
        r("awareness","noun","knowledge and understanding of a subject or problem","意识；了解","cultural awareness|raise awareness|environmental awareness","文化意识|提高认识|环保意识","Good guides encourage cultural awareness among visitors.","优秀导游会增强游客的文化意识。")
      ]
    }
  });
})();
