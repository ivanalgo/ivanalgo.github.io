(function(){
  const r=(display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa="")=>[display,pos,definition,zh,collocations,collocationsZh,example,exampleZh,ipa];
  CEFR_EXPAND_TOPIC("health",{
    sceneOrder:["symptoms-care","treatment-recovery","long-term-health","prevention-habits","prevention-services"],
    existingImages:{
      "symptoms-care":"assets/images/health/symptoms-diagnosis-v2.webp",
      "long-term-health":"assets/images/health/long-term-wellbeing-v2.webp",
      "prevention-services":"assets/images/health/services-support-v2.webp"
    },
    newScenes:[
      {id:"treatment-recovery",title:"Treatment & Recovery",titleZh:"治疗与康复",subtopic:"Medical treatment",image:"assets/images/health/treatment-recovery-v2.webp",description:"Understand treatment options, medicine, rehabilitation and the recovery process."},
      {id:"prevention-habits",title:"Prevention & Healthy Habits",titleZh:"预防与健康习惯",subtopic:"Health in general",image:"assets/images/health/prevention-habits-v2.webp",description:"Reduce health risks through everyday habits, exercise and preventive care."}
    ],
    words:{
      "symptoms-care":[
        r("fever","noun","a body temperature that is higher than normal, usually because of illness","发热；发烧","high fever|develop a fever|fever symptoms","高烧|开始发烧|发热症状","The child developed a high fever during the night.","孩子夜里发起了高烧。"),
        r("fatigue","noun","extreme physical or mental tiredness","疲劳；乏力","severe fatigue|chronic fatigue|experience fatigue","严重疲劳|慢性疲劳|感到疲劳","Persistent fatigue can have several different causes.","持续疲劳可能有多种不同原因。"),
        r("persistent","adjective","continuing for a long time or happening repeatedly","持续的；反复的","persistent cough|persistent pain|persistent symptom","持续咳嗽|持续疼痛|持续症状","You should seek advice about a persistent cough.","如果咳嗽持续不止，你应该寻求医疗建议。"),
        r("severe","adjective","very serious, painful or intense","严重的；剧烈的","severe pain|severe illness|severe symptoms","剧烈疼痛|严重疾病|严重症状","Call emergency services if the pain becomes severe.","如果疼痛变得剧烈，请呼叫急救服务。"),
        r("examine","verb","to look at a patient carefully in order to discover a health problem","检查；诊察","examine a patient|physically examine|carefully examine","检查患者|进行体检|仔细检查","The doctor examined my knee and asked about the injury.","医生检查了我的膝盖并询问受伤情况。"),
        r("test","noun","a medical procedure used to discover information about someone's health","检查；检测","blood test|diagnostic test|test result","血液检查|诊断检测|检查结果","The blood test ruled out a serious infection.","血液检查排除了严重感染。")
      ],
      "long-term-health":[
        r("condition","noun","an illness or health problem, especially one lasting a long time","疾病；健康状况","medical condition|long-term condition|manage a condition","健康问题|长期疾病|管理病情","She manages her condition with regular exercise and medicine.","她通过规律运动和药物管理病情。"),
        r("manage","verb","to control a health problem so that it has less effect on daily life","控制；管理","manage symptoms|manage pain|successfully manage","管理症状|控制疼痛|成功控制","The programme teaches patients how to manage pain.","这个项目教患者如何控制疼痛。"),
        r("lifestyle","noun","the way a person lives, including habits related to food, activity and work","生活方式","healthy lifestyle|active lifestyle|lifestyle change","健康生活方式|积极的生活方式|生活方式改变","Small lifestyle changes can improve heart health.","小的生活方式改变可以改善心脏健康。"),
        r("mental health","noun","a person's emotional and psychological wellbeing","心理健康","support mental health|mental health service|mental health problem","支持心理健康|心理健康服务|心理健康问题","The workplace introduced new mental health support.","这家单位推出了新的心理健康支持措施。"),
        r("stress","noun","worry or pressure caused by difficult situations","压力；紧张","reduce stress|work-related stress|manage stress","减轻压力|工作压力|管理压力","Regular breaks can reduce work-related stress.","规律休息可以减轻工作压力。"),
        r("vulnerable","adjective","more likely to be harmed or become ill","脆弱的；易受影响的","vulnerable patient|particularly vulnerable|vulnerable group","脆弱患者|尤其易受影响|弱势群体","The vaccine programme prioritised vulnerable patients.","疫苗接种计划优先照顾易受影响的患者。")
      ],
      "prevention-services":[
        r("healthcare","noun","services that maintain or improve people's health","医疗保健；医疗服务","healthcare system|access healthcare|healthcare professional","医疗体系|获得医疗服务|医疗专业人员","Rural communities often have less access to healthcare.","乡村社区获得医疗服务的机会往往较少。"),
        r("clinic","noun","a place where people receive medical advice or treatment without staying overnight","诊所；门诊部","local clinic|specialist clinic|attend a clinic","当地诊所|专科门诊|前往诊所","The local clinic offers free health checks.","当地诊所提供免费健康检查。"),
        r("pharmacist","noun","a qualified professional who prepares medicines and advises patients about them","药剂师","ask a pharmacist|community pharmacist|consult a pharmacist","咨询药剂师|社区药剂师|向药剂师咨询","Ask the pharmacist whether the medicine causes drowsiness.","请咨询药剂师这种药是否会引起嗜睡。"),
        r("screening","noun","medical testing of people who may not yet have symptoms","筛查","health screening|screening programme|routine screening","健康筛查|筛查计划|常规筛查","Routine screening can identify some diseases early.","常规筛查可以及早发现某些疾病。"),
        r("vaccination","noun","the process of giving a vaccine to protect against disease","疫苗接种","vaccination programme|receive a vaccination|routine vaccination","疫苗接种计划|接受接种|常规接种","The vaccination programme reduced hospital admissions.","疫苗接种计划减少了住院人数。"),
        r("emergency","noun","a serious and unexpected situation needing immediate medical action","紧急情况；急症","medical emergency|emergency care|in an emergency","医疗急症|急救护理|紧急情况下","In a medical emergency, call the local emergency number.","发生医疗急症时，请拨打当地急救电话。")
      ],
      "treatment-recovery":[
        r("therapy","noun","treatment intended to improve a physical or mental health problem","治疗；疗法","physical therapy|receive therapy|course of therapy","物理治疗|接受治疗|疗程","Physical therapy helped her regain movement in her shoulder.","物理治疗帮助她恢复了肩部活动能力。"),
        r("surgery","noun","medical treatment in which a doctor operates on a patient's body","外科手术","undergo surgery|minor surgery|recover from surgery","接受手术|小手术|术后恢复","He underwent surgery to repair the damaged joint.","他接受了修复受损关节的手术。"),
        r("medication","noun","medicine used to treat or control a health problem","药物；用药","take medication|prescribed medication|regular medication","服药|处方药物|常规用药","The nurse explained when to take the medication.","护士解释了何时服用这种药。"),
        r("dosage","noun","the amount of medicine that should be taken at one time or over a period","剂量；用量","recommended dosage|correct dosage|reduce the dosage","推荐剂量|正确剂量|减少剂量","Never increase the dosage without medical advice.","未经医疗建议，切勿增加剂量。"),
        r("painkiller","noun","a medicine used to reduce or remove physical pain","止痛药","take a painkiller|strong painkiller|prescribe painkillers","服用止痛药|强效止痛药|开止痛药","The doctor prescribed a mild painkiller after the procedure.","手术后，医生开了一种温和的止痛药。"),
        r("rehabilitation","noun","treatment and training that help someone recover abilities after illness or injury","康复治疗；复健","rehabilitation programme|cardiac rehabilitation|undergo rehabilitation","康复计划|心脏康复|接受复健","The rehabilitation programme lasted twelve weeks.","康复计划持续了十二周。"),
        r("heal","verb","to become healthy again or cause an injury to become healthy","愈合；治愈","heal completely|wound heals|help heal","完全愈合|伤口愈合|帮助康复","The wound should heal completely within two weeks.","伤口应该会在两周内完全愈合。"),
        r("recovery","noun","the process of becoming healthy again after illness or injury","康复；恢复","full recovery|speed recovery|recovery period","完全康复|加快康复|恢复期","Adequate sleep is important during the recovery period.","恢复期保证充足睡眠很重要。"),
        r("adverse reaction","noun","an unexpected harmful response to a medicine or treatment","不良反应","serious adverse reaction|report a reaction|adverse drug reaction","严重不良反应|报告反应|药物不良反应","The patient reported an adverse reaction to the medicine.","患者报告了对这种药物的不良反应。"),
        r("effective","adjective","successful in producing the intended medical result","有效的","effective treatment|clinically effective|highly effective","有效治疗|临床有效|非常有效","The treatment is highly effective when started early.","这种治疗在早期开始时非常有效。")
      ],
      "prevention-habits":[
        r("nutrition","noun","the process of obtaining food needed for health and growth","营养；营养摄取","good nutrition|nutrition advice|adequate nutrition","良好营养|营养建议|充足营养","Good nutrition supports both physical and mental health.","良好营养有助于身心健康。"),
        r("exercise","noun","physical activity done to improve health and fitness","锻炼；运动","regular exercise|gentle exercise|exercise routine","规律锻炼|轻度运动|运动计划","Regular exercise can lower the risk of heart disease.","规律锻炼可以降低心脏病风险。"),
        r("hygiene","noun","practices that keep people and places clean and prevent disease","卫生；卫生习惯","personal hygiene|good hygiene|hygiene practice","个人卫生|良好卫生|卫生习惯","Good hand hygiene reduces the spread of infection.","良好的手部卫生可以减少感染传播。"),
        r("immunity","noun","the body's ability to resist a particular disease","免疫力；免疫状态","build immunity|natural immunity|weakened immunity","建立免疫力|自然免疫|免疫力减弱","Vaccination helps the body build immunity safely.","接种疫苗帮助身体安全地建立免疫力。"),
        r("routine","noun","a regular pattern of activities or behaviour","日常规律；惯例","daily routine|healthy routine|establish a routine","日常作息|健康规律|建立习惯","A consistent sleep routine can improve concentration.","规律的睡眠习惯可以提高注意力。"),
        r("risk","noun","the possibility that something harmful may happen","风险","health risk|reduce the risk|high-risk group","健康风险|降低风险|高风险群体","Smoking significantly increases the risk of lung disease.","吸烟会显著增加肺病风险。"),
        r("avoid","verb","to prevent something harmful by staying away from it or not doing it","避免","avoid infection|avoid unnecessary risk|carefully avoid","避免感染|避免不必要风险|谨慎避免","Avoid close contact with others while you are infectious.","具有传染性期间应避免与他人密切接触。"),
        r("maintain","verb","to keep something at a healthy or satisfactory level","保持；维持","maintain fitness|maintain a healthy weight|maintain wellbeing","保持体能|保持健康体重|维持身心健康","Walking helps older adults maintain strength and balance.","步行帮助老年人保持力量和平衡。"),
        r("check-up","noun","a general medical examination, often done regularly","体检；健康检查","annual check-up|routine check-up|book a check-up","年度体检|常规检查|预约体检","She discovered the problem during a routine check-up.","她在一次常规体检中发现了这个问题。"),
        r("sedentary","adjective","involving too much sitting and not enough physical activity","久坐的；缺乏活动的","sedentary lifestyle|sedentary job|highly sedentary","久坐的生活方式|久坐工作|极少活动","A sedentary lifestyle can contribute to several health problems.","久坐的生活方式可能导致多种健康问题。")
      ]
    }
  });
})();
