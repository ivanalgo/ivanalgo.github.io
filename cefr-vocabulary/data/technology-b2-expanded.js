(function(){
  const r=(display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa="")=>[display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa];
  CEFR_EXPAND_TOPIC("technology",{
    sceneOrder:["systems-software","data-security","digital-change","online-information","technology-society"],
    existingImages:{
      "systems-software":"assets/images/technology/systems-software-v2.webp",
      "data-security":"assets/images/technology/data-security-v2.webp",
      "digital-change":"assets/images/technology/digital-innovation-v2.webp"
    },
    newScenes:[
      {id:"online-information",title:"Online Communication & Information",titleZh:"在线沟通与信息",subtopic:"Internet terminology and conventions",image:"assets/images/technology/online-information-v2.webp",description:"Share information online, judge sources and manage digital communication."},
      {id:"technology-society",title:"Technology in Society",titleZh:"科技与社会",subtopic:"Computer concepts; Technology",image:"assets/images/technology/technology-society-v2.webp",description:"Evaluate the benefits, risks and social consequences of technological change."}
    ],
    words:{
      "systems-software":[
        r("database","noun","an organised collection of information stored electronically","数据库","online database|search a database|database system","在线数据库|搜索数据库|数据库系统","The hospital stores patient records in a secure database.","医院把患者记录保存在安全数据库中。"),
        r("network","noun","a group of connected computers or devices","网络","computer network|network connection|secure network","计算机网络|网络连接|安全网络","All office printers are connected to the same network.","办公室所有打印机都连接到同一个网络。"),
        r("device","noun","a piece of electronic equipment designed for a particular purpose","设备；装置","mobile device|electronic device|connect a device","移动设备|电子设备|连接设备","The app works on almost any mobile device.","这款应用几乎能在任何移动设备上运行。"),
        r("software","noun","programs used to operate a computer or perform tasks","软件","install software|software package|software developer","安装软件|软件包|软件开发者","The company developed software for managing deliveries.","公司开发了用于管理配送的软件。"),
        r("bug","noun","an error in a computer program that causes it to behave incorrectly","程序错误；漏洞","software bug|fix a bug|serious bug","软件错误|修复程序错误|严重漏洞","A small bug caused the app to close unexpectedly.","一个小程序错误导致应用意外关闭。"),
        r("install","verb","to put software onto a computer so that it can be used","安装","install an app|install correctly|installation process","安装应用|正确安装|安装过程","You need administrator access to install the update.","你需要管理员权限才能安装更新。")
      ],
      "data-security":[
        r("password","noun","a secret group of characters used to enter an account or system","密码","strong password|reset a password|password manager","强密码|重置密码|密码管理器","Use a different strong password for each account.","每个账户都应使用不同的强密码。"),
        r("encryption","noun","the process of changing data into a form that unauthorised people cannot read","加密","data encryption|end-to-end encryption|use encryption","数据加密|端到端加密|使用加密","The messaging service uses end-to-end encryption.","这项消息服务使用端到端加密。"),
        r("breach","noun","an incident in which protected information is accessed without permission","数据泄露；安全漏洞","data breach|security breach|report a breach","数据泄露|安全漏洞|报告泄露事件","The company informed customers about the data breach.","公司向客户通报了数据泄露事件。"),
        r("permission","noun","the right given to a user or program to access something","权限；许可","grant permission|access permission|request permission","授予权限|访问权限|请求许可","The app requests permission to use your camera.","这款应用请求获得使用摄像头的权限。"),
        r("authentication","noun","the process of proving that a user really is who they claim to be","身份验证","two-factor authentication|user authentication|authentication method","双重身份验证|用户认证|认证方式","Two-factor authentication provides extra protection.","双重身份验证提供额外保护。"),
        r("storage","noun","the space or system used to keep electronic information","存储；存储空间","cloud storage|storage capacity|data storage","云存储|存储容量|数据存储","The plan includes one terabyte of cloud storage.","这个方案包含一太字节的云存储空间。")
      ],
      "digital-change":[
        r("artificial intelligence","noun","computer technology that performs tasks usually requiring human intelligence","人工智能","AI system|develop artificial intelligence|generative AI","人工智能系统|开发人工智能|生成式人工智能","Artificial intelligence helps doctors analyse medical images.","人工智能帮助医生分析医学影像。"),
        r("machine learning","noun","technology that allows computers to improve through data and experience","机器学习","machine-learning model|use machine learning|machine-learning system","机器学习模型|使用机器学习|机器学习系统","The service uses machine learning to detect unusual activity.","这项服务使用机器学习检测异常活动。"),
        r("platform","noun","a digital service on which applications, content or business activities operate","平台","online platform|digital platform|platform provider","在线平台|数字平台|平台提供商","Independent teachers sell courses through the platform.","独立教师通过这个平台销售课程。"),
        r("integrate","verb","to combine one system or technology with another so they work together","整合；集成","integrate a system|fully integrated|integrate with","整合系统|完全整合|与……集成","The payment tool integrates with our accounting software.","支付工具与我们的会计软件集成。"),
        r("digital literacy","noun","the ability to use digital technology confidently and critically","数字素养","improve digital literacy|digital literacy skills|basic digital literacy","提高数字素养|数字素养技能|基本数字素养","Libraries offer courses that improve digital literacy.","图书馆开设提高数字素养的课程。"),
        r("accessible","adjective","designed so that people with different abilities can use it","无障碍的；易使用的","accessible design|fully accessible|make accessible","无障碍设计|完全无障碍|使易于使用","Captions make online videos more accessible.","字幕让在线视频更易于不同人群使用。")
      ],
      "online-information":[
        r("upload","verb","to copy data from a device to an online service","上传","upload a file|upload securely|upload content","上传文件|安全上传|上传内容","Students upload their assignments through the portal.","学生通过门户网站上传作业。"),
        r("download","verb","to copy data from the internet to a device","下载","download a file|digital download|download safely","下载文件|数字下载|安全下载","You can download the report as a PDF.","你可以把报告下载为 PDF 文件。"),
        r("stream","verb","to play video or audio directly from the internet without first saving it","流式播放；在线观看","stream a video|live stream|streaming service","在线播放视频|直播|流媒体服务","Millions of viewers streamed the concert live.","数百万观众在线观看了音乐会直播。"),
        r("verify","verb","to check that information is true, accurate or genuine","核实；验证","verify information|verify an account|independently verify","核实信息|验证账户|独立核实","Journalists verified the image before publishing it.","记者在发布图片前对其进行了核实。"),
        r("source","noun","a person, document or place from which information comes","信息来源；出处","reliable source|original source|check a source","可靠来源|原始来源|核查出处","Always check the original source of a surprising claim.","看到令人惊讶的说法时，务必核查原始来源。"),
        r("misleading","adjective","causing someone to believe something that is not true or complete","误导性的","misleading information|highly misleading|misleading headline","误导性信息|极具误导性|误导性标题","The headline was accurate but slightly misleading.","这个标题虽然没有错，却有些误导。"),
        r("notification","noun","a message sent by an app or system to attract a user's attention","通知；提醒","push notification|receive a notification|notification settings","推送通知|收到通知|通知设置","I turned off notifications during the meeting.","会议期间我关闭了通知。"),
        r("viral","adjective","spreading very quickly and widely online","在网络上迅速传播的；爆红的","go viral|viral video|viral content","走红|爆红视频|病毒式内容","A short educational video went viral overnight.","一段教育短视频一夜之间走红。"),
        r("content","noun","information, images, audio or video made available online","内容","digital content|create content|user-generated content","数字内容|创作内容|用户生成内容","The museum creates digital content for schools.","博物馆为学校制作数字内容。"),
        r("subscribe","verb","to arrange to receive a service or regular online material","订阅","subscribe to a channel|paid subscription|subscribe online","订阅频道|付费订阅|在线订阅","More than ten thousand people subscribe to the newsletter.","超过一万人订阅了这份简报。")
      ],
      "technology-society":[
        r("ethical","adjective","morally acceptable and fair","合乎道德的；伦理的","ethical issue|ethical use|ethical concern","伦理问题|合乎道德的使用|伦理担忧","The committee discussed the ethical use of facial recognition.","委员会讨论了人脸识别技术的伦理使用问题。"),
        r("bias","noun","an unfair tendency to favour one person, group or idea","偏见；偏差","algorithmic bias|reduce bias|unconscious bias","算法偏差|减少偏见|无意识偏见","Poor training data can introduce bias into a system.","质量较差的训练数据可能给系统带来偏差。"),
        r("dependence","noun","a situation in which someone relies heavily on something","依赖","dependence on technology|growing dependence|reduce dependence","对科技的依赖|日益增加的依赖|减少依赖","Our dependence on online services creates new risks.","我们对在线服务的依赖带来了新的风险。"),
        r("inequality","noun","an unfair difference in opportunities, resources or treatment","不平等","digital inequality|reduce inequality|social inequality","数字不平等|减少不平等|社会不平等","Affordable internet access can reduce digital inequality.","价格可承受的互联网接入可以减少数字不平等。"),
        r("regulation","noun","an official rule controlling how an activity or industry operates","监管规定；规章","data regulation|strict regulation|introduce regulation","数据监管|严格监管|出台规定","New regulation requires clearer privacy notices.","新规要求提供更清晰的隐私说明。"),
        r("surveillance","noun","careful watching of people or places, often using technology","监控；监视","digital surveillance|mass surveillance|surveillance camera","数字监控|大规模监控|监控摄像头","Citizens raised concerns about digital surveillance.","市民对数字监控表达了担忧。"),
        r("impact","noun","a strong effect that technology has on people or society","影响","social impact|long-term impact|assess the impact","社会影响|长期影响|评估影响","Researchers are studying the social impact of automation.","研究人员正在研究自动化的社会影响。"),
        r("efficient","adjective","achieving results without wasting time, energy or resources","高效的","energy-efficient|highly efficient|efficient process","节能的|非常高效|高效流程","Smart controls make the building more energy-efficient.","智能控制让建筑更加节能。"),
        r("replace","verb","to take the place of someone or something","取代；替换","replace a system|gradually replace|replace manual work","替换系统|逐渐取代|取代人工工作","Digital tickets have largely replaced paper ones.","电子票已经在很大程度上取代了纸质票。"),
        r("advance","noun","a new development or improvement","进步；进展","technological advance|major advance|rapid advances","技术进步|重大进展|快速发展","Recent advances have made batteries safer and cheaper.","近期进展使电池更安全、更便宜。")
      ]
    }
  });
})();
