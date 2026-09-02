(function(){
  const r=(display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa="")=>[display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa];
  CEFR_EXPAND_TOPIC("work",{
    sceneOrder:["teams-projects","conditions-performance","careers-growth","communication-meetings","leadership-challenges"],
    existingImages:{
      "teams-projects":"assets/images/work/teams-projects-v2.webp",
      "conditions-performance":"assets/images/work/conditions-performance-v2.webp",
      "careers-growth":"assets/images/work/careers-growth-v2.webp"
    },
    newScenes:[
      {id:"communication-meetings",title:"Communication & Meetings",titleZh:"沟通与会议",subtopic:"Business communication; Workplace",image:"assets/images/work/communication-meetings-v2.webp",description:"Present ideas, clarify information and reach agreement with colleagues."},
      {id:"leadership-challenges",title:"Leadership & Challenges",titleZh:"领导与挑战",subtopic:"Work, working and the workplace",image:"assets/images/work/leadership-challenges-v2.webp",description:"Lead through pressure, resolve difficulties and keep a team moving forward."}
    ],
    words:{
      "teams-projects":[
        r("milestone","noun","an important stage in the development of a project","里程碑；重要阶段","reach a milestone|major milestone|project milestone","达到里程碑|重大里程碑|项目节点","Completing the first prototype was a major milestone.","完成第一个原型是一项重大里程碑。"),
        r("priority","noun","something that is more important than other things and must be handled first","优先事项","top priority|set priorities|high priority","首要任务|设定优先级|高度优先","Customer safety remains our top priority.","客户安全仍然是我们的首要任务。"),
        r("coordinate","verb","to organise people or activities so they work together effectively","协调；统筹","coordinate a project|coordinate closely|coordinate activities","协调项目|密切协调|统筹活动","Mina coordinates the work of three regional teams.","米娜负责协调三个地区团队的工作。"),
        r("contribute","verb","to give ideas, time or effort to help achieve something","贡献；参与","contribute to a project|actively contribute|contribute ideas","为项目作贡献|积极参与|贡献想法","Everyone contributed ideas during the planning session.","每个人都在规划会议中贡献了想法。"),
        r("responsibility","noun","a duty that someone is expected to deal with","职责；责任","take responsibility|share responsibility|main responsibility","承担责任|共同负责|主要职责","Each team member has responsibility for one area.","每位团队成员负责一个领域。"),
        r("progress","noun","development toward a better or more complete state","进展；进步","make progress|track progress|steady progress","取得进展|跟踪进度|稳步进展","The weekly review helps us track progress.","每周复盘帮助我们跟踪进度。")
      ],
      "conditions-performance":[
        r("overtime","noun","time spent working beyond normal working hours","加班时间","work overtime|paid overtime|regular overtime","加班|有偿加班|经常加班","Staff worked overtime to finish the urgent order.","员工加班完成了紧急订单。"),
        r("work-life balance","noun","the relationship between time spent working and time available for personal life","工作与生活的平衡","healthy work-life balance|improve work-life balance|maintain a balance","健康的工作生活平衡|改善工作生活平衡|保持平衡","Flexible hours improved her work-life balance.","弹性工作时间改善了她的工作与生活平衡。"),
        r("efficient","adjective","working well without wasting time, energy or resources","高效的","highly efficient|efficient system|more efficient","非常高效|高效系统|更加高效","The new booking process is faster and more efficient.","新的预订流程更快、更高效。"),
        r("performance","noun","how well a person or organisation completes work","绩效；表现","job performance|improve performance|performance review","工作表现|提升绩效|绩效评估","Her performance improved after additional training.","接受额外培训后，她的工作表现有所提升。"),
        r("recognition","noun","official appreciation of someone's work or achievements","认可；表彰","gain recognition|professional recognition|recognition for work","获得认可|专业认可|工作得到认可","The design team gained international recognition.","设计团队获得了国际认可。"),
        r("remote","adjective","working away from the organisation's usual workplace","远程的","remote work|remote team|work remotely","远程工作|远程团队|远程办公","The company supports remote work two days a week.","公司支持每周两天远程办公。")
      ],
      "careers-growth":[
        r("candidate","noun","a person being considered for a job or position","候选人；求职者","strong candidate|successful candidate|interview a candidate","有力候选人|成功入选者|面试候选人","Three candidates were invited to the final interview.","三名候选人获邀参加最终面试。"),
        r("interview","noun","a formal meeting in which someone is assessed for a job","面试","job interview|attend an interview|interview panel","求职面试|参加面试|面试小组","She prepared several examples for the job interview.","她为求职面试准备了几个实例。"),
        r("experience","noun","knowledge or skill gained by doing a particular job or activity","经验","relevant experience|gain experience|extensive experience","相关经验|积累经验|丰富经验","The role requires relevant experience in sales.","这个职位要求有相关销售经验。"),
        r("competence","noun","the ability to do something successfully and effectively","能力；胜任","professional competence|demonstrate competence|technical competence","专业能力|证明能力|技术能力","The task allowed her to demonstrate technical competence.","这项任务让她展示了技术能力。"),
        r("training","noun","the process of learning the skills needed for a job","培训","receive training|staff training|training programme","接受培训|员工培训|培训项目","New employees receive two weeks of practical training.","新员工会接受两周的实践培训。"),
        r("mentor","noun","an experienced person who guides and advises someone less experienced","导师；指导者","career mentor|act as a mentor|experienced mentor","职业导师|担任导师|经验丰富的导师","A senior engineer became her career mentor.","一位高级工程师成为了她的职业导师。")
      ],
      "communication-meetings":[
        r("agenda","noun","a list of subjects to be discussed at a meeting","议程","meeting agenda|set the agenda|agenda item","会议议程|设定议程|议程事项","Budget planning is the first item on today's agenda.","预算规划是今天议程的第一项。"),
        r("presentation","noun","a talk that explains an idea or piece of work to an audience","演示；汇报","give a presentation|visual presentation|sales presentation","作演示|可视化演示|销售汇报","Leo gave a clear presentation of the research findings.","利奥清晰地汇报了研究结果。"),
        r("clarify","verb","to make something easier to understand by explaining it","澄清；说明","clarify a point|clarify expectations|seek to clarify","澄清观点|明确期望|力求澄清","Could you clarify what the client expects by Friday?","你能说明客户希望我们周五前完成什么吗？"),
        r("persuade","verb","to make someone agree to do or believe something","说服","persuade a client|persuade someone to|successfully persuade","说服客户|说服某人做|成功说服","The evidence persuaded the board to approve the plan.","这些证据说服董事会批准了计划。"),
        r("compromise","noun","an agreement in which each side accepts less than it originally wanted","妥协；折中方案","reach a compromise|reasonable compromise|compromise solution","达成妥协|合理折中|折中方案","Both departments reached a practical compromise.","两个部门达成了务实的折中方案。"),
        r("feedback","noun","comments that help someone improve work or performance","反馈","constructive feedback|give feedback|respond to feedback","建设性反馈|提供反馈|回应反馈","The editor gave constructive feedback on my report.","编辑对我的报告提出了建设性反馈。"),
        r("participate","verb","to take part in an activity or discussion","参与；参加","actively participate|participate in a meeting|encourage participation","积极参与|参加会议|鼓励参与","Remote staff can participate in the meeting online.","远程员工可以在线参加会议。"),
        r("consensus","noun","general agreement among a group of people","共识","reach a consensus|broad consensus|build consensus","达成共识|广泛共识|建立共识","The team reached a consensus after a long discussion.","经过长时间讨论，团队达成了共识。"),
        r("brief","verb","to give someone the information needed for a task","向……介绍情况；交代","brief the team|brief someone on|fully briefed","向团队交代|向某人介绍|充分了解情况","The manager briefed us on the client's concerns.","经理向我们介绍了客户的担忧。"),
        r("follow-up","noun","an action taken after a meeting or earlier activity","后续行动","follow-up meeting|follow-up email|require follow-up","后续会议|后续邮件|需要跟进","I sent a follow-up email summarising the decisions.","我发送了一封总结决定的后续邮件。")
      ],
      "leadership-challenges":[
        r("leadership","noun","the ability or activity of guiding a group or organisation","领导力；领导","strong leadership|leadership style|provide leadership","强有力的领导|领导风格|发挥领导作用","Strong leadership helped the team remain calm.","强有力的领导帮助团队保持冷静。"),
        r("motivate","verb","to make someone feel interested and willing to work hard","激励；调动积极性","motivate a team|highly motivated|motivate employees","激励团队|积极性很高|激励员工","Clear goals can motivate a team during difficult periods.","明确的目标能在困难时期激励团队。"),
        r("support","verb","to help someone emotionally or practically","支持；帮助","support colleagues|fully support|support a decision","支持同事|全力支持|支持决定","Experienced colleagues supported the new team leader.","有经验的同事支持了新任团队负责人。"),
        r("conflict","noun","serious disagreement between people or groups","冲突；分歧","resolve conflict|workplace conflict|source of conflict","解决冲突|职场冲突|冲突来源","Poor communication created conflict between the teams.","沟通不畅导致团队之间发生冲突。"),
        r("resolve","verb","to find a successful solution to a problem or disagreement","解决；化解","resolve an issue|resolve a dispute|quickly resolve","解决问题|化解争议|迅速解决","A private conversation helped resolve the disagreement.","一次私下交谈帮助化解了分歧。"),
        r("pressure","noun","a difficult situation that makes someone feel worried or hurried","压力","work under pressure|intense pressure|deal with pressure","在压力下工作|巨大压力|应对压力","She makes careful decisions even under pressure.","即使在压力下，她也会谨慎决策。"),
        r("adapt","verb","to change behaviour or plans to suit new conditions","适应；调整","adapt to change|quickly adapt|adapt a strategy","适应变化|迅速适应|调整策略","The team adapted quickly to the new schedule.","团队迅速适应了新日程。"),
        r("strategy","noun","a detailed plan for achieving a particular aim","策略；战略","business strategy|develop a strategy|long-term strategy","商业战略|制定策略|长期战略","The company developed a strategy for entering new markets.","公司制定了进入新市场的战略。"),
        r("decision","noun","a choice made after considering different possibilities","决定；决策","make a decision|informed decision|difficult decision","作出决定|知情决策|艰难决定","Managers need reliable data to make informed decisions.","管理者需要可靠数据来作出知情决策。"),
        r("accountable","adjective","responsible for decisions and expected to explain them","负有责任的；需作出解释的","hold accountable|accountable for results|publicly accountable","追究责任|对结果负责|向公众负责","Team leaders are accountable for the final result.","团队负责人要对最终结果负责。")
      ]
    }
  });
})();
