import fs from "node:fs";

const ROOT = new URL("../", import.meta.url);
const FEATURED_PATH = new URL("data/featured-articles.json", ROOT);
const OUTPUT_PATH = new URL("data/articles.json", ROOT);

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const CATEGORIES = ["Stories", "Science", "Art & Design", "Ideas & Society"];

const levelFocus = {
  A1: "very common words, short sentences, and concrete meaning",
  A2: "everyday description, sequence, and simple cause and effect",
  B1: "connected paragraphs, clear reasons, and familiar abstract ideas",
  B2: "detailed explanation, contrast, and implied meaning",
  C1: "nuanced argument, flexible syntax, and precise abstract language",
};

const vocabulary = {
  A1: [
    ["careful", "careful", "/ˈkeəfəl/", "adjective", "giving attention so that you avoid mistakes", "小心的；仔细的", "常用于 be careful 或 careful + 名词。", "Be careful when you cross the road.", "{actorCap} is careful before making a choice."],
    ["notice", "notice", "/ˈnəʊtɪs/", "verb", "to see or become aware of something", "注意到", "后面可接名词，或 notice that + 句子。", "Did you notice the blue door?", "{actorCap} can notice a small change."],
    ["pattern", "pattern", "/ˈpætən/", "noun", "a regular way in which something happens or is arranged", "模式；规律；图案", "常与 see, follow, repeat 搭配。", "The leaves make a simple pattern.", "A clear pattern appears in {subject}."],
    ["slowly", "slowly", "/ˈsləʊli/", "adverb", "at a low speed", "缓慢地", "通常放在动词之后，说明动作速度。", "The boat moved slowly.", "{subjectCap} changes slowly over time."],
    ["result", "result", "/rɪˈzʌlt/", "noun", "what happens because of an action", "结果", "常见搭配是 the result of 和 as a result。", "The result of the test was clear.", "The result is easy to see."],
    ["useful", "useful", "/ˈjuːsfəl/", "adjective", "helping you do or understand something", "有用的", "常用 useful for + 名词或 useful to + 人。", "This map is useful for visitors.", "This is a useful part of {subject}."],
    ["compare", "compare", "/kəmˈpeə/", "verb", "to look at two things to see how they are similar or different", "比较", "compare A with B 表示比较两者。", "Compare the two pictures.", "People compare one part of {subject} with another."],
    ["reason", "reason", "/ˈriːzən/", "noun", "a cause or explanation for something", "原因；理由", "常用 the reason for 或 the reason why。", "There is a reason for the change.", "There is a simple reason for this."],
    ["often", "often", "/ˈɒfən/", "adverb", "many times or regularly", "经常", "放在一般动词前、be 动词后。", "We often walk after dinner.", "People often see this in {subject}."],
    ["problem", "problem", "/ˈprɒbləm/", "noun", "something difficult that needs an answer", "问题；难题", "常与 solve, face, cause 搭配。", "We worked together to solve the problem.", "One problem can change what happens next."]
  ],
  A2: [
    ["patient", "patient", "/ˈpeɪʃənt/", "adjective", "able to wait without becoming angry", "有耐心的", "常见搭配 be patient with + 人或事。", "Be patient with yourself.", "{actorCap} remains patient when progress is slow."],
    ["discover", "discover", "/dɪˈskʌvə/", "verb", "to find or learn something for the first time", "发现", "后面可接名词或 discover that + 句子。", "They discovered a path through the trees.", "People discover something new about {subject}."],
    ["detail", "detail", "/ˈdiːteɪl/", "noun", "a small fact or part of something", "细节", "常见搭配 important detail, in detail。", "One detail changed the story.", "A small detail helps explain the change."],
    ["gradually", "gradually", "/ˈɡrædʒuəli/", "adverb", "slowly over a period of time", "逐渐地", "用于描述并非突然发生的变化。", "The sky gradually became darker.", "{subjectCap} gradually takes a new form."],
    ["effect", "effect", "/ɪˈfekt/", "noun", "a change caused by something else", "影响；效果", "have an effect on 表示“对……有影响”。", "Rain has an effect on the soil.", "The effect becomes clear after some time."],
    ["prepare", "prepare", "/prɪˈpeə/", "verb", "to make something ready", "准备", "prepare for + 名词；prepare to + 动词。", "We prepared for the long journey.", "{actorCap} must prepare before the next step."],
    ["ordinary", "ordinary", "/ˈɔːdənəri/", "adjective", "normal and not unusual", "普通的；平常的", "可放在名词前描述日常事物。", "It looked like an ordinary box.", "An ordinary part of {subject} can become important."],
    ["solution", "solution", "/səˈluːʃən/", "noun", "an answer to a problem", "解决办法", "solution to a problem 是常见搭配。", "The group found a practical solution.", "The solution depends on close attention."],
    ["instead", "instead", "/ɪnˈsted/", "adverb", "in place of another action or thing", "反而；代替", "可单独使用，也可用 instead of + 名词或 -ing。", "We walked instead of taking the bus.", "{actorCap} chooses a different way instead."],
    ["possible", "possible", "/ˈpɒsəbəl/", "adjective", "able to happen or be done", "可能的；可行的", "it is possible to do 是常见句型。", "Is it possible to finish today?", "More than one answer is possible."]
  ],
  B1: [
    ["observe", "observe", "/əbˈzɜːv/", "verb", "to watch or examine something carefully", "观察", "可接名词，也可用 observe how/that 引出观察结果。", "Scientists observe how the material changes.", "A reader can observe a change in {subject}."],
    ["evidence", "evidence", "/ˈevɪdəns/", "noun", "facts or signs that support an idea", "证据", "不可数名词；常用 evidence of/for。", "The marks provide evidence of use.", "The evidence appears in several small details."],
    ["response", "response", "/rɪˈspɒns/", "noun", "an answer or reaction to something", "回应；反应", "response to + 事件或问题。", "Her response surprised the group.", "{subjectCap} produces a clear response."],
    ["gradually", "gradually", "/ˈɡrædʒuəli/", "adverb", "slowly and by small amounts", "逐渐地", "适合描述过程、趋势和人物变化。", "The town gradually changed.", "The situation develops gradually rather than at once."],
    ["effective", "effective", "/ɪˈfektɪv/", "adjective", "successful in producing the intended result", "有效的", "effective way/method/solution 是常见搭配。", "This is an effective way to save water.", "The final approach proves effective."],
    ["require", "require", "/rɪˈkwaɪə/", "verb", "to need something in order to happen or work", "需要；要求", "可用 require + 名词或 require someone to do。", "The task requires careful planning.", "Understanding {subject} can require time."],
    ["influence", "influence", "/ˈɪnfluəns/", "verb", "to affect how something develops or behaves", "影响", "influence + 人/决定/结果，不需要介词 on。", "Weather can influence the result.", "Several conditions influence what happens."],
    ["approach", "approach", "/əˈprəʊtʃ/", "noun", "a way of dealing with a task or problem", "方法；思路", "an approach to + 名词或 -ing。", "We tried a different approach to the problem.", "A better approach begins with observation."],
    ["consequence", "consequence", "/ˈkɒnsɪkwəns/", "noun", "a result, especially one caused by an action", "后果；结果", "常用 consequence of，语气通常比 result 更强。", "Every choice has a consequence.", "The decision has an unexpected consequence."],
    ["reliable", "reliable", "/rɪˈlaɪəbəl/", "adjective", "able to be trusted or depended on", "可靠的", "常修饰 source, method, person, result。", "Use a reliable source of information.", "The method becomes more reliable with repeated checks."]
  ],
  B2: [
    ["significant", "significant", "/sɪɡˈnɪfɪkənt/", "adjective", "important or large enough to be noticed", "重要的；显著的", "常修饰 change, difference, effect。", "The policy produced a significant change.", "A small action can have a significant effect on {subject}."],
    ["interpret", "interpret", "/ɪnˈtɜːprɪt/", "verb", "to explain or understand the meaning of something", "解释；理解", "interpret A as B 表示“把 A 理解为 B”。", "Readers may interpret the ending differently.", "People interpret the same detail in different ways."],
    ["assumption", "assumption", "/əˈsʌmpʃən/", "noun", "something accepted as true without proof", "假设；想当然的看法", "常见搭配 make/challenge an assumption。", "The experiment challenged an old assumption.", "One assumption shapes the first explanation."],
    ["ultimately", "ultimately", "/ˈʌltɪmətli/", "adverb", "finally, after considering everything", "最终；归根结底", "常放句首或主要结论之前。", "Ultimately, the choice belongs to the community.", "Ultimately, the outcome depends on several connected choices."],
    ["adapt", "adapt", "/əˈdæpt/", "verb", "to change in order to suit new conditions", "适应；调整", "adapt to + 环境；adapt something for + 用途。", "Plants adapt to dry conditions.", "{actorCap} must adapt when the conditions change."],
    ["constraint", "constraint", "/kənˈstreɪnt/", "noun", "a limit that controls what can be done", "限制条件", "常与 time, cost, space 等搭配。", "Cost was the main constraint.", "Every solution must work within a constraint."],
    ["reinforce", "reinforce", "/ˌriːɪnˈfɔːs/", "verb", "to make an idea, structure, or feeling stronger", "加强；强化", "reinforce an idea/pattern/message。", "Repeated images reinforce the main idea.", "Several details reinforce the same conclusion."],
    ["perspective", "perspective", "/pəˈspektɪv/", "noun", "a particular way of viewing a situation", "视角；观点", "from a ... perspective 表示“从某种角度”。", "The decision looks different from her perspective.", "A wider perspective changes how we understand {subject}."],
    ["consequence", "consequence", "/ˈkɒnsɪkwəns/", "noun", "a result that follows from an action or condition", "后果", "可用 unintended consequence 表示“意外后果”。", "The rule had an unintended consequence.", "The wider consequence may not appear immediately."],
    ["subtle", "subtle", "/ˈsʌtəl/", "adjective", "not obvious and therefore difficult to notice", "细微的；不易察觉的", "常修饰 difference, effect, change, signal。", "There is a subtle difference between the colors.", "A subtle change can alter the whole experience."]
  ],
  C1: [
    ["nuance", "nuance", "/ˈnjuːɑːns/", "noun", "a slight but important difference in meaning or feeling", "细微差别；微妙之处", "常用 capture/lose a nuance 或 a nuance of。", "The translation loses an important nuance.", "A closer reading reveals a further nuance."],
    ["scrutinize", "scrutinize", "/ˈskruːtənaɪz/", "verb", "to examine something very carefully", "仔细审视", "常用于 scrutinize evidence, data, proposal。", "The committee scrutinized the evidence.", "We need to scrutinize the conditions surrounding {subject}."],
    ["ambiguous", "ambiguous", "/æmˈbɪɡjuəs/", "adjective", "having more than one possible meaning", "含糊的；有多种解释的", "常修饰 language, message, ending, evidence。", "The final sentence is deliberately ambiguous.", "The first signal remains ambiguous."],
    ["cumulatively", "cumulatively", "/ˈkjuːmjələtɪvli/", "adverb", "in a way that grows as effects are added over time", "累积地", "适合描述长期叠加的影响。", "Small losses matter cumulatively.", "These minor choices matter cumulatively."],
    ["implication", "implication", "/ˌɪmplɪˈkeɪʃən/", "noun", "a likely effect or meaning that is not stated directly", "潜在影响；含义", "常见搭配 implication for/of。", "The finding has an implication for public policy.", "The broader implication reaches beyond the immediate example."],
    ["mediate", "mediate", "/ˈmiːdieɪt/", "verb", "to influence or connect two things indirectly", "调节；作为中介", "在学术表达中常指某因素改变两者关系。", "Technology mediates how people experience distance.", "Context can mediate the effect of {subject}."],
    ["contingent", "contingent", "/kənˈtɪndʒənt/", "adjective", "dependent on particular conditions", "取决于条件的", "be contingent on/upon 是固定搭配。", "Success is contingent on public trust.", "The outcome is contingent on conditions that may change."],
    ["reconcile", "reconcile", "/ˈrekənsaɪl/", "verb", "to find a way for opposing needs or ideas to exist together", "调和；使一致", "reconcile A with B 表示调和两者。", "The plan must reconcile speed with safety.", "A strong solution must reconcile competing needs."],
    ["underlying", "underlying", "/ˌʌndəˈlaɪɪŋ/", "adjective", "important but not immediately visible", "潜在的；根本的", "常修饰 cause, assumption, pattern, principle。", "The debate revealed an underlying conflict.", "An underlying pattern connects the visible details."],
    ["counterintuitive", "counterintuitive", "/ˌkaʊntərɪnˈtjuːɪtɪv/", "adjective", "opposite to what people naturally expect", "反直觉的", "常用于 a counterintuitive result/finding。", "The research produced a counterintuitive result.", "The final result may seem counterintuitive at first."]
  ],
};

const phraseByLevel = {
  A1: ["at first", "in the end", "one by one", "next to", "because of"],
  A2: ["find out", "take care of", "as soon as", "in this way", "instead of"],
  B1: ["take into account", "play a role in", "as a result", "deal with", "in response to"],
  B2: ["in contrast", "give rise to", "draw attention to", "to some extent", "in the long run"],
  C1: ["at the expense of", "give rise to", "be contingent on", "call into question", "in light of"],
};

const phraseMeaning = {
  "at first": ["at the beginning", "起初", "常放在句首，与 later 或 in the end 形成时间对比。"],
  "in the end": ["finally, after a period of time", "最终", "表示经过一段过程后的结果。"],
  "one by one": ["separately, in order", "一个接一个地", "描述人或事物依次发生。"],
  "next to": ["beside or very close to", "在……旁边", "后面直接接地点或事物。"],
  "because of": ["as a result of", "因为", "后接名词；because 后接完整句子。"],
  "find out": ["to discover information", "查明；发现", "可接 about，也可接疑问词从句。"],
  "take care of": ["to look after or deal with", "照顾；处理", "后接人、动物、事物或任务。"],
  "as soon as": ["immediately when", "一……就……", "连接两个有先后关系的动作。"],
  "in this way": ["by using this method", "用这种方式", "用于总结前面的方法及其结果。"],
  "instead of": ["in place of", "代替；而不是", "后接名词、代词或动名词。"],
  "take into account": ["to consider a fact when deciding", "把……考虑在内", "account 前通常使用 take；后接需要考虑的因素。"],
  "play a role in": ["to influence or be involved in", "在……中发挥作用", "in 后接名词或动名词。"],
  "as a result": ["because of what happened before", "因此；结果", "通常放句首，连接原因和结果。"],
  "deal with": ["to take action about a problem", "处理；应对", "后接问题、情况或主题。"],
  "in response to": ["as a reaction to", "作为对……的回应", "to 后接名词或动名词。"],
  "in contrast": ["used to introduce a clear difference", "相比之下", "可单独放句首，也可用 in contrast to。"],
  "give rise to": ["to cause something to happen", "引起；导致", "通常用于正式说明原因和结果。"],
  "draw attention to": ["to make someone notice something", "使人注意到", "attention 后用 to，不用 on。"],
  "to some extent": ["partly but not completely", "在某种程度上", "用于限定观点，避免表达过于绝对。"],
  "in the long run": ["over a long period of time", "从长远来看", "用于讨论长期影响。"],
  "at the expense of": ["with harm or loss to something else", "以牺牲……为代价", "用于说明一种收益伴随另一种损失。"],
  "be contingent on": ["to depend on particular conditions", "取决于", "正式表达，on 后接决定结果的条件。"],
  "call into question": ["to create doubt about something", "使……受到质疑", "常用于证据动摇旧观点。"],
  "in light of": ["after considering new information", "鉴于；考虑到", "用于说明观点因新证据而调整。"],
};

const stories = [
  ["young baker", "Mina", "a busy market town", "deliver warm bread", "kindness"],
  ["curious fox", "Rowan", "a green forest", "find a hidden spring", "honesty"],
  ["shy musician", "Leo", "a hill village", "play a song for the festival", "courage"],
  ["patient gardener", "Amara", "a dry valley", "protect young trees", "persistence"],
  ["clever tailor", "Niko", "a crowded city", "finish a coat for a traveler", "resourcefulness"],
  ["lighthouse keeper", "Elin", "a rocky coast", "guide ships through fog", "responsibility"],
  ["small sparrow", "Pip", "an old orchard", "build a safe nest", "cooperation"],
  ["mapmaker's apprentice", "Tomas", "a windy harbor", "draw an accurate coast", "accuracy"],
  ["old potter", "Sana", "a riverside village", "fire a beautiful bowl", "humility"],
  ["traveling healer", "Iris", "a snowy mountain region", "reach a distant family", "compassion"]
].map(([role, name, setting, goal, value]) => ({ role, name, setting, goal, value }));

const storyChallenges = [
  ["The Broken Bridge", "a night storm broke the wooden bridge", "cross the river before sunset", "a patient ferryman", "work with the river rather than fight it"],
  ["The Lost Purse", "a heavy purse lay beside the road", "find its owner before leaving town", "a child selling apples", "ask careful questions before deciding"],
  ["The Silver Contest", "a judge offered a silver prize", "complete the task without taking an unfair shortcut", "a quiet rival", "value honest work more than applause"],
  ["The Stranger in the Rain", "a stranger asked for shelter during a storm", "decide whether to open the door", "an elderly neighbor", "balance caution with kindness"],
  ["The Difficult Promise", "an easier path appeared after a promise was made", "keep the promise despite the delay", "a friend carrying a lantern", "understand that trust grows through action"],
  ["The Abandoned Garden", "an untended garden was drying behind a locked gate", "save the plants without damaging the property", "a retired groundskeeper", "care for a place while respecting who is responsible for it"],
  ["The False Rumor", "a frightening story about a neighbor spread through the town", "discover what had actually happened", "a shopkeeper who had seen the event", "check evidence before repeating a claim"],
  ["The Stopped Clock", "the town clock stopped before an important meeting", "help people arrive at the right time", "a watchmaker with poor eyesight", "combine practical knowledge with clear communication"],
  ["The Shared Well", "the only working well began to run low", "divide water fairly during a dry week", "a farmer with a measuring jar", "make fairness visible through a rule everyone can understand"],
  ["The Hidden Path", "a narrow path appeared after heavy rain", "decide whether the unknown route was safe", "a shepherd familiar with the hills", "let curiosity ask questions before it takes risks"]
].map(([title, event, goal, helper, resolution]) => ({ title, event, goal, helper, resolution }));

const scienceLenses = [
  ["How {title} Work", "process"],
  ["Signals in {title}", "signals"],
  ["How {title} Meet Change", "adaptation"],
  ["Measuring {title}", "measurement"],
  ["Why {title} Matter", "connections"]
].map(([title, lens]) => ({ title, lens }));

const artLenses = [
  ["Materials of {title}", "material"],
  ["Light and Color in {title}", "light"],
  ["Movement and Rhythm in {title}", "movement"],
  ["How {title} Builds a Composition", "composition"],
  ["{title} and Its Audience", "context"]
].map(([title, lens]) => ({ title, lens }));

const scienceSources = {
  earth: ["NOAA and USGS education resources", "https://www.noaa.gov/education"],
  life: ["Smithsonian science education resources", "https://naturalhistory.si.edu/education"],
  health: ["National Institutes of Health education resources", "https://www.nih.gov/health-information"],
  space: ["NASA Science", "https://science.nasa.gov/"],
  technology: ["National Institute of Standards and Technology", "https://www.nist.gov/education"],
};

const uniqueScienceTopics = [
  ["A1", "Why Shadows Move", "shadows", "where sunlight meets solid objects", "light travels in straight lines and an object blocks part of it", "a dark shape appears on the other side", "shadows help people notice the position of a light", "clouds and several lights can change the shape", "earth"],
  ["A1", "From Seed to Young Plant", "seed growth", "inside moist soil", "water wakes the seed and a root begins to grow", "a shoot reaches upward toward light", "a small seed becomes an independent plant", "too little water or warmth can stop growth", "life"],
  ["A1", "Why Some Things Float", "floating objects", "where objects meet water", "water pushes upward while gravity pulls downward", "some objects stay at the surface and others sink", "shape and material work together", "adding weight can change the result", "earth"],
  ["A1", "How Magnets Pull", "magnets", "near iron and other magnetic materials", "an invisible magnetic field produces a push or pull", "objects can move without direct contact", "magnets are useful in simple machines", "distance makes the pull weaker", "technology"],
  ["A1", "Where Sound Begins", "sound", "around moving and vibrating objects", "a vibration moves through air as a wave", "ears receive the movement as sound", "different vibrations create different sounds", "soft materials can absorb part of the wave", "technology"],
  ["A1", "How Clouds Form", "clouds", "high in cooling air", "water vapor cools and gathers around tiny particles", "many small drops become visible together", "clouds are part of the movement of water", "wind and temperature keep changing them", "earth"],
  ["A1", "Why Teeth Need Cleaning", "healthy teeth", "inside the mouth after meals", "bacteria use food left on teeth and produce acids", "cleaning removes material before it causes damage", "daily habits protect teeth over time", "hard-to-reach places can keep food longer", "health"],
  ["A1", "A Butterfly's Four Stages", "butterfly development", "on plants and in the air", "an egg becomes a caterpillar, pupa, and adult", "one animal takes several very different forms", "each stage has a different job", "weather and food affect survival", "life"],
  ["A1", "Why Day Follows Night", "day and night", "on a rotating Earth", "Earth turns while one side faces the sun", "places move into light and then into darkness", "rotation creates a daily pattern", "seasons change the length of daylight", "space"],
  ["A1", "How Rain Makes a Puddle", "rainwater", "on roofs, soil, and streets", "falling water collects where the ground is low", "a shallow body of water forms", "surface shape controls where water travels", "sun and wind later remove the water", "earth"],
  ["A2", "How Birds Find Their Way", "bird migration", "between seasonal feeding and nesting areas", "birds combine body signals with the sun, stars, and landmarks", "they travel long routes at useful times of year", "migration links distant habitats", "storms and bright city lights can disturb the route", "life"],
  ["A2", "Why Ocean Water Rises and Falls", "ocean tides", "along coastlines", "the gravity of the moon and sun pulls on ocean water", "water levels rise and fall in a regular cycle", "tides affect coastal animals and boats", "coast shape changes local timing", "earth"],
  ["A2", "What Happens Inside a Volcano", "volcanoes", "above moving rock beneath Earth's surface", "pressure pushes magma through cracks in the crust", "lava, ash, and gas may reach the surface", "volcanoes create hazards and new land", "trapped gas can make an eruption stronger", "earth"],
  ["A2", "How Fungi Clean a Forest", "forest fungi", "in soil, dead wood, and living roots", "fine threads absorb material and break it into smaller parts", "nutrients return to the ecosystem", "decomposition supports new growth", "dryness and pollution can interrupt the network", "life"],
  ["A2", "How City Trees Cool a Street", "city trees", "beside roads and buildings", "leaves provide shade and release water into the air", "nearby surfaces and people become cooler", "tree cover connects climate and public health", "limited soil makes urban growth difficult", "earth"],
  ["A2", "How Glaciers Move", "glaciers", "in cold mountains and polar regions", "years of snow become heavy ice that flows slowly downhill", "ice reshapes valleys and stores fresh water", "glacier change affects rivers and sea level", "warming can make melting faster than new snowfall", "earth"],
  ["A2", "How Animals Hide in Plain Sight", "animal camouflage", "in forests, grasslands, deserts, and oceans", "color, shape, and behavior reduce visible contrast", "an animal becomes harder to find", "camouflage can protect hunters and prey", "a changing background can reveal the animal", "life"],
  ["A2", "Why the Moon Changes Shape", "moon phases", "in the night sky across a month", "the moon moves around Earth while sunlight reaches half of it", "people see different portions of the bright half", "the phases create a predictable calendar", "clouds can hide the view but not change the phase", "space"],
  ["A2", "How Ants Build a Trail", "ant trails", "between a nest and a food source", "ants leave chemical signals that other ants can follow", "a busy route forms without a leader drawing it", "simple actions create group coordination", "rain or a moved food source can break the trail", "life"],
  ["A2", "Why Metal Rusts", "rust", "where iron meets water and oxygen", "a chemical reaction slowly changes the metal surface", "a reddish, weaker material forms", "coatings can slow the reaction", "salt and moisture often make rust develop faster", "technology"],
  ["B1", "How Plants Turn Light Into Food", "photosynthesis", "inside the green parts of plants", "cells use light energy to combine water and carbon dioxide", "sugars store energy and oxygen is released", "the process supports most food webs", "light, water, and temperature limit the rate", "life"],
  ["B1", "Why Continents Move", "plate tectonics", "across Earth's outer shell", "large plates move slowly over hotter material below", "continents shift and mountains, trenches, and faults form", "plate boundaries explain many earthquakes and volcanoes", "the movement is too slow to observe directly in daily life", "earth"],
  ["B1", "How the Immune System Recognizes Danger", "immune recognition", "throughout the human body", "cells detect patterns linked to damage or infection", "different defenses remove threats and remember some of them", "immune memory can improve a later response", "the system must avoid attacking healthy tissue", "health"],
  ["B1", "How Weather Forecasts Are Made", "weather forecasting", "across the atmosphere and computer models", "instruments measure air while models calculate possible changes", "forecasters estimate future conditions and uncertainty", "forecasts help people prepare for risk", "small measurement errors can grow over time", "earth"],
  ["B1", "The Ocean Currents That Move Heat", "ocean circulation", "through connected ocean basins", "wind, temperature, salinity, and Earth's rotation move water", "heat and nutrients travel across great distances", "currents influence regional climate and marine life", "warming and melting ice can alter circulation", "earth"],
  ["B1", "How DNA Stores Instructions", "DNA", "inside the cells of living organisms", "sequences of chemical bases carry information used to build molecules", "cells copy and read instructions for growth and repair", "shared code connects all known life", "copying changes can alter an instruction", "life"],
  ["B1", "How Rivers Shape the Land", "river erosion", "from steep headwaters to broad valleys", "moving water lifts, carries, and deposits rock and soil", "channels, bends, floodplains, and deltas develop", "landscapes record long histories of water flow", "dams and extreme rain can change the pattern", "earth"],
  ["B1", "How an Electricity Grid Balances Power", "electricity grids", "between generators, wires, storage, and users", "operators match production with changing demand", "electrical energy reaches homes and businesses reliably", "balance matters because large mismatches can cause failure", "variable wind and solar power require flexible control", "technology"],
  ["B1", "Why Antibiotics Do Not Kill Viruses", "antibiotics", "where medicines meet different kinds of infection", "antibiotics target structures or processes found in bacteria", "many bacterial infections can be controlled", "viruses use host cells and lack the same targets", "unnecessary use can also favor resistant bacteria", "health"],
  ["B1", "How Food Webs Hold an Ecosystem Together", "food webs", "among producers, consumers, and decomposers", "energy and material move through many connected feeding relationships", "changes in one population affect several others", "a web shows more reality than a single food chain", "the loss of a key species can reorganize connections", "life"],
  ["B2", "How Vaccines Train Immune Memory", "vaccination", "where a safe biological signal meets the immune system", "the body practices recognizing a specific threat", "memory cells support a faster later response", "individual protection can also reduce community spread", "immune responses vary and protection can change over time", "health"],
  ["B2", "How Astronomers Find Exoplanets", "exoplanet detection", "in tiny changes within light from distant stars", "telescopes measure dimming or stellar motion caused by an orbiting planet", "researchers infer worlds that cannot usually be seen directly", "multiple methods reveal size, orbit, and sometimes atmosphere", "noise and other stellar activity can imitate a signal", "space"],
  ["B2", "How We Observe a Black Hole", "black-hole observation", "around matter and light near an invisible object", "scientists measure radiation, orbital motion, and gravitational effects", "evidence reveals mass concentrated in a very small region", "indirect observation can test extreme physics", "different explanations must be compared carefully", "space"],
  ["B2", "What CRISPR Changes in a Cell", "CRISPR gene editing", "inside selected regions of DNA", "a guide molecule directs a protein to cut a chosen sequence", "cell repair can disable or alter genetic information", "the tool supports research and possible treatments", "unintended edits and ethical choices require scrutiny", "life"],
  ["B2", "Where Ocean Microplastics Travel", "microplastics", "from rivers and coasts into ocean currents and food webs", "small plastic particles move, sink, break apart, and enter organisms", "pollution spreads far from its original source", "size and chemistry affect biological risk", "measurement remains difficult across environments", "earth"],
  ["B2", "Why Renewable Energy Needs Storage", "energy storage", "between variable electricity production and demand", "batteries and other systems hold energy for later use", "supply can remain stable when wind or sunlight changes", "different storage times require different technologies", "cost, materials, safety, and efficiency create trade-offs", "technology"],
  ["B2", "How Algorithms Learn Patterns", "machine learning", "inside systems trained on many examples", "an algorithm adjusts internal values to reduce prediction errors", "the model can classify or estimate new cases", "performance depends on data and evaluation choices", "biased examples can produce unreliable results", "technology"],
  ["B2", "Life Without Sunlight at Deep-Sea Vents", "deep-sea vent ecosystems", "around hot mineral-rich water on the ocean floor", "microbes use chemical energy instead of sunlight", "dense communities survive in complete darkness", "chemosynthesis expands the known foundations of food webs", "vents are unstable and widely separated", "life"],
  ["B2", "How Carbon Dating Reads the Past", "radiocarbon dating", "in once-living material", "scientists measure the remaining amount of a radioactive carbon isotope", "a probability range estimates when an organism died", "dating connects objects to environmental and human history", "contamination and calibration affect accuracy", "technology"],
  ["B2", "How Earthquake Early Warning Works", "earthquake early warning", "between ground sensors, communication networks, and threatened cities", "systems detect fast seismic signals and estimate stronger shaking still on its way", "alerts create seconds for automatic and human action", "warning turns measurement speed into practical preparation", "nearby locations may receive little or no warning time", "earth"],
  ["C1", "Climate Feedbacks That Amplify Change", "climate feedbacks", "across ice, oceans, land, and atmosphere", "an initial change triggers effects that either strengthen or weaken it", "the climate response becomes larger or smaller than the first forcing alone", "feedbacks help explain long-term sensitivity", "interacting feedbacks operate on different timescales", "earth"],
  ["C1", "The Human Microbiome as an Ecosystem", "the human microbiome", "across the gut, skin, mouth, and other body sites", "microbial communities interact with food, immunity, and one another", "their collective activity influences health without acting as a single organ", "ecological thinking reveals relationships missed by species lists", "cause and correlation remain difficult to separate", "health"],
  ["C1", "Why Antibiotic Resistance Evolves", "antibiotic resistance", "within populations of bacteria exposed to treatment", "selection favors variants able to survive and reproduce", "effective medicines gradually lose power against some infections", "individual prescriptions contribute to a shared evolutionary problem", "resistance also moves between bacteria and environments", "health"],
  ["C1", "How Gravitational Waves Carry Information", "gravitational waves", "through distortions in space-time from accelerating massive objects", "extreme events produce waves detected as tiny changes in distance", "astronomers gain a new channel for observing the universe", "the signal contains information unavailable from light alone", "instrument noise is vastly larger than the measured change", "space"],
  ["C1", "Gene Drives and Ecological Risk", "gene drives", "within sexually reproducing populations", "biased inheritance helps a selected genetic trait spread rapidly", "a population may change across many generations", "the technique could address disease or invasive species", "ecological effects may cross borders and resist reversal", "life"],
  ["C1", "When an Ecosystem Reaches a Tipping Point", "ecological tipping points", "in systems under accumulating environmental pressure", "feedbacks push gradual stress toward a rapid state change", "recovery may become difficult even after pressure falls", "early warning requires understanding resilience, not only averages", "thresholds are uncertain and context dependent", "earth"],
  ["C1", "Why Quantum Computers Need Error Correction", "quantum error correction", "inside fragile quantum states used for computation", "redundant patterns detect errors without directly reading the encoded information", "logical operations can become more reliable than physical components", "error correction determines whether scaling is practical", "noise and resource demands remain severe constraints", "technology"],
  ["C1", "The Energy Demand Behind Artificial Intelligence", "AI energy demand", "across data centers, electrical grids, and model use", "computation converts electrical energy into processing and heat", "large systems create costs beyond their visible digital output", "efficiency must be evaluated alongside scale and frequency of use", "better hardware can lower cost per task while total demand still rises", "technology"],
  ["C1", "How Epigenetics Regulates Gene Activity", "epigenetic regulation", "around DNA and the proteins that organize it", "chemical marks and molecular structures influence which genes cells can access", "cells with the same DNA maintain different identities and responses", "regulation connects development with environmental history", "epigenetic change does not simply rewrite inherited DNA", "life"],
  ["C1", "What Makes a Scientific Model Trustworthy", "scientific models", "between observation, mathematical structure, and prediction", "researchers simplify selected relationships and test outputs against evidence", "a model becomes useful within a stated range of conditions", "transparent assumptions allow criticism and improvement", "success in one task does not guarantee truth in every context", "technology"]
].map(([level, articleTitle, name, setting, process, result, connection, challenge, source]) => {
  const [sourceName, sourceUrl] = scienceSources[source];
  return {
    level,
    articleTitle,
    title: articleTitle,
    name,
    setting,
    input: "energy, material, and information from the surrounding conditions",
    process,
    result,
    challenge,
    response: "observers compare repeated evidence to understand how the system responds",
    connection,
    sourceName,
    sourceUrl,
  };
});

const artSources = {
  museum: ["National Gallery of Art education resources", "https://www.nga.gov/learn.html"],
  design: ["Victoria and Albert Museum collections", "https://www.vam.ac.uk/collections"],
  performance: ["Smithsonian music and performance resources", "https://music.si.edu/"],
  film: ["BFI education resources", "https://www.bfi.org.uk/education-research"],
  critical: ["The Metropolitan Museum of Art essays", "https://www.metmuseum.org/toah/"],
};

const uniqueArtTopics = [
  ["A1", "What a Line Can Do", "marks drawn across a surface", "pencil, ink, brush, and movement", "lines can show edges, paths, speed, or feeling", "pressure and direction change every mark", "museum"],
  ["A1", "How Colors Mix", "colored light or pigment placed together", "paint, paper, light, and simple experiments", "new colors appear through mixture and contrast", "light and paint combine color in different ways", "museum"],
  ["A1", "Building a Picture From Shapes", "circles, squares, triangles, and irregular forms", "cut paper, drawing tools, and arrangement", "simple shapes become objects and patterns", "position and size guide what viewers see", "design"],
  ["A1", "Making a Collage", "separate pieces joined on one surface", "paper, cloth, photographs, scissors, and glue", "different materials share one image", "selection and placement create surprising links", "design"],
  ["A1", "How Clay Remembers a Hand", "soft clay shaped by touch", "hands, simple tools, water, and pressure", "fingerprints and tool marks remain visible", "drying and heat make temporary marks permanent", "design"],
  ["A1", "Looking at a Portrait", "an image of a person", "pose, face, clothing, setting, and light", "details suggest identity and mood", "viewers compare expression with surrounding clues", "museum"],
  ["A1", "Reading a Landscape", "an image of land, sky, water, or buildings", "distance, horizon, color, and scale", "space appears to continue beyond a flat surface", "foreground and background organize the view", "museum"],
  ["A1", "Finding Rhythm in Music", "sounds arranged through time", "beat, repetition, pause, and change", "listeners feel patterns and expect what comes next", "rhythm can continue even when the melody changes", "performance"],
  ["A1", "How a Gesture Becomes Dance", "a body moving with intention", "hands, feet, balance, space, and timing", "an everyday action gains rhythm and meaning", "repetition turns movement into a phrase", "performance"],
  ["A1", "Choosing What Fits in a Photograph", "a selected view inside a frame", "camera position, distance, and timing", "some details become visible while others disappear", "framing is a choice rather than a neutral window", "museum"],
  ["A2", "Painting With Watercolor Washes", "pigment carried through water on paper", "soft brushes, clean water, and layered washes", "transparent color allows paper to reflect light", "timing controls whether edges remain soft or sharp", "museum"],
  ["A2", "Patterns Woven Into Cloth", "threads crossing in repeated structures", "loom, fiber, color, and patient handwork", "structure and decoration appear together", "small repeated choices build a large pattern", "design"],
  ["A2", "How Artists Use Light and Shadow", "bright and dark areas arranged in an image", "directional light, tone, and contrast", "forms appear solid and attention moves across the work", "a changed light source changes the whole scene", "museum"],
  ["A2", "Walking Around a Sculpture", "a three-dimensional object sharing the viewer's space", "carved, modeled, cast, or assembled material", "the work changes as the viewer changes position", "empty space becomes part of the form", "museum"],
  ["A2", "How a Mask Changes a Performance", "a face covered or transformed for performance", "material, color, eye openings, voice, and gesture", "the performer gains a new visible identity", "limited facial expression makes body movement more important", "performance"],
  ["A2", "How Film Puts Shots in Order", "separate moving images joined into a sequence", "camera, performance, sound, and editing", "viewers connect one shot with the next", "a changed order can create a new meaning", "film"],
  ["A2", "Printing One Image Many Times", "ink transferred from a prepared surface", "block, plate, screen, paper, and pressure", "one design produces several related impressions", "each print can still contain small differences", "design"],
  ["A2", "Why Artists Paint Still Life", "everyday objects arranged for close attention", "fruit, vessels, cloth, tables, light, and color", "ordinary things become studies of form and time", "selection gives objects relationships they did not have before", "museum"],
  ["A2", "How Folk Dance Carries Memory", "movement learned and repeated by a community", "music, clothing, steps, and social gathering", "people share history through the body", "each performance preserves and changes the tradition", "performance"],
  ["A2", "How a Melody Creates Expectation", "a sequence of pitches heard over time", "voice, instrument, repetition, and variation", "listeners remember earlier notes and predict later ones", "delay and return create musical tension", "performance"],
  ["B1", "How Perspective Creates Distance", "a flat surface organized to suggest deep space", "horizon, scale, overlap, and converging lines", "viewers read some forms as nearer than others", "perspective is a system shaped by culture and purpose", "museum"],
  ["B1", "How Composition Directs the Eye", "visual elements arranged within a boundary", "balance, contrast, repetition, and empty space", "attention follows a planned route through the image", "composition connects individual details to the whole", "museum"],
  ["B1", "How Fresco Becomes Part of a Wall", "pigment applied to fresh wet plaster", "brushes, mineral color, damp surface, and planned sections", "color bonds with the wall as the plaster dries", "limited working time requires preparation and confident decisions", "museum"],
  ["B1", "What Glaze Does to Ceramics", "a glass-like surface fused to fired clay", "minerals, heat, kiln atmosphere, and testing", "color, texture, and water resistance change", "chemical reactions make the final surface partly unpredictable", "design"],
  ["B1", "How Stage Design Builds a World", "space prepared for a live performance", "scenery, light, costume, sound, and movement", "the audience understands place and mood quickly", "design must support performers as well as images", "performance"],
  ["B1", "When a Photograph Becomes Evidence", "a camera image used to support a claim", "framing, timing, caption, source, and context", "viewers may treat selected detail as factual proof", "evidence depends on what happened outside the frame", "museum"],
  ["B1", "The Rules Behind Jazz Improvisation", "music created in the moment within a shared structure", "harmony, rhythm, listening, memory, and response", "musicians produce variation without losing connection", "freedom becomes possible through deep knowledge of form", "performance"],
  ["B1", "Who Owns a Public Mural?", "a large image made in shared urban space", "wall, paint, permission, neighborhood, and maintenance", "art becomes part of daily public experience", "ownership can involve artists, residents, and authorities", "critical"],
  ["B1", "How Typography Changes a Message", "language given visible shape", "typeface, size, spacing, weight, and layout", "the same words gain different tone and clarity", "reading is influenced before meaning is fully processed", "design"],
  ["B1", "How Animators Create Movement", "still images changed in small steps", "drawing, models, software, timing, and sound", "the eye connects separate frames into motion", "character depends on rhythm as much as appearance", "film"],
  ["B2", "Why Abstract Art Avoids Recognition", "color, form, gesture, and material without a clear depicted object", "scale, rhythm, surface, and visual tension", "viewers attend to relationships rather than a named subject", "the absence of recognition can expand rather than remove meaning", "museum"],
  ["B2", "How Cubism Shows More Than One View", "objects broken and reorganized across a flat surface", "fragmented planes, shifting angles, and limited depth", "several viewpoints appear within one image", "the work questions the idea of a single stable observer", "museum"],
  ["B2", "The Power of Negative Space", "unoccupied areas surrounding or entering a form", "silence, margin, gap, pause, and balance", "absence actively shapes what remains visible or audible", "empty space can carry structure and emotion", "design"],
  ["B2", "How Montage Creates an Argument", "separate images and sounds joined through editing", "contrast, sequence, rhythm, and association", "viewers infer a relationship not shown inside either shot", "editing can persuade without stating a claim directly", "film"],
  ["B2", "Why Modern Architecture Exposed Structure", "buildings that made construction and material visually explicit", "steel, concrete, glass, grids, and open plans", "structure became part of the building's public image", "claims of simplicity often concealed social and technical complexity", "design"],
  ["B2", "How Textiles Express Identity", "cloth worn, displayed, exchanged, and inherited", "fiber, pattern, labor, symbol, and custom", "material choices communicate belonging and status", "meanings change when textiles move between communities", "critical"],
  ["B2", "What Sound Design Adds to an Image", "recorded and constructed sound accompanying visual media", "voice, ambience, effects, music, and silence", "viewers sense space and emotion beyond the frame", "sound can confirm or contradict what an image suggests", "film"],
  ["B2", "The Decisions Hidden in Art Restoration", "a damaged work stabilized and interpreted over time", "analysis, cleaning, repair, documentation, and restraint", "viewers encounter a version shaped by conservation choices", "restoration balances historical evidence with present visibility", "critical"],
  ["B2", "How Choreography Organizes a Crowd", "many bodies moving through shared space and time", "pattern, timing, direction, repetition, and encounter", "individual actions become a collective structure", "coordination can express both unity and control", "performance"],
  ["B2", "How Museums Create a Narrative", "objects selected and arranged for public interpretation", "sequence, label, lighting, architecture, and omission", "visitors encounter an argument through movement", "curation makes some relationships visible and leaves others silent", "critical"],
  ["C1", "Who Has the Right to Interpret an Artifact?", "an object carrying several histories and claims", "scholarship, community knowledge, language, and authority", "interpretation becomes a negotiation rather than a final label", "institutions must account for unequal power over meaning", "critical"],
  ["C1", "The Colonial History Inside Museum Collections", "objects moved through trade, excavation, gift, purchase, and force", "provenance research, archives, testimony, and law", "ownership stories complicate aesthetic display", "ethical interpretation may lead to restitution or shared custody", "critical"],
  ["C1", "Can an Algorithm Be an Artist?", "images, sounds, or texts produced through computational systems", "training data, model design, prompts, selection, and labor", "authorship becomes distributed across people and machines", "novel output does not erase the history of its inputs", "critical"],
  ["C1", "How Memorials Shape Public Memory", "designed spaces that organize remembrance", "site, inscription, absence, ritual, and political context", "private grief enters a shared civic form", "every memorial includes some histories while excluding others", "critical"],
  ["C1", "The Ethics of Conserving a Changing Work", "art designed to decay, perform, or be remade", "artist instructions, material evidence, documentation, and judgment", "preservation may alter the quality it attempts to save", "conservators must distinguish identity from original material", "critical"],
  ["C1", "When the Viewer Completes the Artwork", "art whose meaning depends on participation or position", "interaction, duration, instruction, and response", "spectatorship becomes part of the medium", "participation can be invited while still being carefully controlled", "critical"],
  ["C1", "Why Site-Specific Art Cannot Simply Move", "work made for a particular physical and social location", "scale, history, access, weather, and local relationships", "place operates as material rather than background", "relocation may preserve the object while changing the work", "critical"],
  ["C1", "The Unstable Truth of a Photograph", "an image produced by a real encounter and a selective frame", "exposure, editing, caption, circulation, and expectation", "photographs provide evidence without providing the whole event", "technical realism can strengthen misleading interpretation", "critical"],
  ["C1", "Cultural Exchange or Appropriation?", "forms and symbols moving between communities", "credit, consent, power, history, and economic benefit", "influence can create dialogue or repeat exploitation", "similar acts carry different meanings under unequal conditions", "critical"],
  ["C1", "Authorship in Collaborative Art", "a work created through many visible and invisible contributions", "concept, craft, performance, production, and institutional support", "the single-name label may simplify collective labor", "authorship can describe responsibility as well as originality", "critical"]
].map(([level, title, material, tools, feature, process, source]) => {
  const [sourceName, sourceUrl] = artSources[source];
  return { level, title, material, tools, feature, process, sourceName, sourceUrl };
});

const uniqueIdeaTopics = [
  ["A1", "Why Taking Turns Matters", "children, families, classmates, and players", "a clear way to share time and opportunity", "waiting can feel difficult when people want the same thing", "a group uses one simple order so every person gets a chance"],
  ["A1", "How a Daily Routine Helps", "students, workers, and families", "less effort spent deciding what comes next", "a routine can become too strict when needs change", "a student prepares a school bag each evening"],
  ["A1", "What Makes an Apology Honest?", "friends, classmates, and family members", "a way to repair trust after harm", "words alone may not change the action", "a person names the harm and explains what will change"],
  ["A1", "Why We Share Public Space", "neighbors, travelers, children, and workers", "places where many different people can meet", "noise, safety, and different uses can cause conflict", "people leave a path open and care for shared equipment"],
  ["A1", "How Listening Changes a Conversation", "friends, families, teachers, and students", "better understanding before an answer", "people often prepare a reply while another person speaks", "a listener repeats the main idea before giving an opinion"],
  ["A1", "Why Saving Water Is a Shared Job", "households, farms, businesses, and communities", "enough clean water for daily needs", "one small use seems unimportant by itself", "many people change one repeated habit during a dry season"],
  ["A1", "What Teamwork Needs", "people working toward one goal", "different skills used together", "unclear jobs can create repeated or missing work", "a team names each task and checks progress together"],
  ["A1", "Why Reading a Little Each Day Works", "new readers and experienced learners", "regular contact with words and ideas", "large goals can make starting feel difficult", "a reader chooses ten quiet minutes after dinner"],
  ["A1", "When a Rule Is Helpful", "students, drivers, players, and neighbors", "clear expectations that support safety and fairness", "a rule can continue after its reason disappears", "a group explains why a rule exists and reviews it later"],
  ["A1", "How Kindness Travels", "strangers, friends, workers, and families", "support that makes ordinary life easier", "kind actions are not always noticed or returned", "one person offers help and another later helps someone else"],
  ["A2", "Should Schools Require Uniforms?", "students, families, teachers, and schools", "simple clothing choices and a shared identity", "cost, comfort, and personal expression", "a school asks students which rules are necessary"],
  ["A2", "What Pocket Money Can Teach", "children and families", "practice with saving, spending, and planning", "families have different incomes and expectations", "a child divides a small amount between needs and future goals"],
  ["A2", "Why Public Transport Needs Trust", "passengers, drivers, planners, and taxpayers", "shared travel at a lower cost per person", "delays and poor information make planning difficult", "a service gives clear updates and keeps a regular schedule"],
  ["A2", "What Recycling Can and Cannot Do", "households, companies, and local governments", "materials collected for another use", "not every product can be recycled easily", "a family first reduces waste and then sorts what remains"],
  ["A2", "Why Every Town Needs a Library", "readers, children, job seekers, and neighbors", "shared access to books, tools, information, and quiet space", "funding and changing needs", "a library adds digital help while keeping open reading areas"],
  ["A2", "Is Competition Good for Young Players?", "children, coaches, families, and teams", "motivation, practice, and exciting goals", "fear of losing can replace learning and enjoyment", "a coach measures effort and cooperation as well as scores"],
  ["A2", "Can Online Friends Be Real Friends?", "people who meet through games, study, or shared interests", "connection across distance", "identity and trust are harder to judge online", "friends build trust slowly and protect private information"],
  ["A2", "Who Should Plan the School Lunch?", "students, cooks, families, and school leaders", "healthy food that many students will eat", "cost, culture, taste, and waste", "a school tests several meals and collects student feedback"],
  ["A2", "What Makes a Park Welcoming?", "children, older residents, workers, and wildlife", "rest, play, shade, and social contact", "different groups need different spaces", "neighbors help choose paths, seating, trees, and play areas"],
  ["A2", "How Chores Become Fair", "people sharing a home", "necessary work divided among several people", "tasks take different amounts of time and skill", "a family reviews the list instead of counting tasks alone"],
  ["B1", "When Remote Work Works Well", "workers, managers, families, and cities", "flexibility and less travel", "isolation, home conditions, and blurred boundaries", "a team combines quiet work with planned contact"],
  ["B1", "How Social Media Shapes Mood", "friends, creators, platforms, and audiences", "connection and public expression", "comparison, interruption, and uncertain feedback", "a user notices how different kinds of use affect the next hour"],
  ["B1", "What Responsible Tourism Looks Like", "visitors, residents, workers, and local environments", "income and cultural exchange", "crowding, waste, and unequal benefit", "a visitor stays longer and uses locally owned services"],
  ["B1", "How Groups Make Better Decisions", "teams, clubs, classes, and committees", "several kinds of knowledge used together", "confident voices can silence useful doubt", "a chair collects independent views before open debate"],
  ["B1", "The Everyday Value of Privacy", "individuals, families, companies, and governments", "space to think, change, and control personal information", "convenient services often ask for more data", "a user checks which information an app truly needs"],
  ["B1", "Why People Volunteer", "neighbors, charities, schools, and community groups", "time and skills directed toward a shared need", "unpaid help can hide work that institutions should fund", "a project defines a useful role and supports volunteers properly"],
  ["B1", "How News Habits Shape Understanding", "readers, journalists, platforms, and communities", "information about events beyond personal experience", "speed and repetition can reward weak claims", "a reader compares sources before sharing a surprising report"],
  ["B1", "What Should an Exam Measure?", "students, teachers, schools, and employers", "evidence of learning and readiness", "time pressure may measure skills unrelated to the subject", "a course combines exams with projects and explanation"],
  ["B1", "Why Public Benches Matter", "walkers, older residents, caregivers, and strangers", "rest and informal contact in shared places", "design decisions can quietly exclude some users", "a city studies who can stop comfortably along a route"],
  ["B1", "How Consumer Choices Send Signals", "buyers, workers, companies, and producers", "goods selected according to price and value", "information about labor and environmental cost is often hidden", "a buyer changes a repeated purchase rather than seeking perfection"],
  ["B2", "How Recommendation Systems Narrow Choice", "users, platforms, creators, and advertisers", "quick access to relevant material", "past behavior can define what remains visible", "a platform adds controls that allow exploration outside the predicted profile"],
  ["B2", "What Gig Work Trades Away", "independent workers, platforms, customers, and regulators", "flexibility and rapid matching of tasks", "income risk, benefits, and control are unevenly distributed", "a policy distinguishes genuine independence from managed dependence"],
  ["B2", "Who Is Responsible for Climate Action?", "individuals, companies, cities, and national governments", "action at several levels of society", "small personal choices can distract from structural power", "responsibility is assigned according to capacity and influence"],
  ["B2", "Where Should Free Speech Have Limits?", "speakers, audiences, institutions, and governments", "open disagreement and criticism", "threats, harassment, misinformation, and unequal power", "a rule focuses on demonstrable harm while protecting unpopular views"],
  ["B2", "Why Education Inequality Persists", "students, families, schools, and governments", "learning that expands future choices", "resources, housing, health, and expectations reinforce one another", "funding is combined with support beyond the classroom"],
  ["B2", "The Boundary Between Work and Life", "employees, managers, clients, and families", "flexibility across time and place", "constant availability turns freedom into pressure", "a team defines hours when no response is expected"],
  ["B2", "Can Universal Basic Income Increase Freedom?", "citizens, workers, governments, and communities", "a stable income floor with fewer conditions", "cost, work incentives, and different local needs", "a trial measures health, employment, and bargaining power over time"],
  ["B2", "Why Fast Fashion Feels Cheap", "shoppers, brands, factory workers, and environments", "frequent access to new clothing", "low prices can move labor and waste costs elsewhere", "a company publishes supply information and designs for longer use"],
  ["B2", "How Cities Decide Who Gets the Street", "drivers, passengers, cyclists, pedestrians, and businesses", "movement and access through limited public space", "speed, safety, parking, trade, and disability access", "a city tests a redesign and measures several kinds of use"],
  ["B2", "What Makes Workplace Feedback Useful", "colleagues, managers, teams, and new employees", "specific information that supports better future work", "status and vague judgment can make advice defensive", "feedback describes an observable action, its effect, and a possible next step"],
  ["C1", "The Attention Economy's Hidden Contract", "users, platforms, advertisers, and creators", "services funded without a direct price", "behavioral design converts attention into revenue", "regulation treats attention and autonomy as interests worth protecting"],
  ["C1", "Who Should Govern Personal Data?", "individuals, companies, researchers, and states", "information used for useful services and public knowledge", "consent is weak when collection is complex and power is unequal", "rules assign duties to data holders rather than relying only on user choice"],
  ["C1", "Automation and the Meaning of Expertise", "workers, institutions, software designers, and clients", "routine analysis completed quickly and consistently", "skills may weaken when people supervise outputs they no longer understand", "systems preserve opportunities for practice, explanation, and challenge"],
  ["C1", "Platform Power Without Public Accountability", "users, sellers, workers, developers, and large platforms", "shared infrastructure connecting enormous markets", "private rules can function like public law without similar oversight", "appeal, transparency, and interoperability reduce unilateral control"],
  ["C1", "What One Generation Owes the Next", "present citizens, future people, institutions, and governments", "long-term resources and stable social systems", "future interests have no direct vote in current decisions", "policy uses durable limits and independent long-term review"],
  ["C1", "How Public Trust Survives a Mistake", "experts, officials, journalists, and communities", "cooperation under uncertainty", "defensive communication can turn an error into suspicion of the whole institution", "leaders disclose what changed, what remains unknown, and how correction will occur"],
  ["C1", "Communicating Risk Without Creating Panic", "scientists, officials, journalists, and the public", "timely action based on uncertain evidence", "simple reassurance and dramatic warning can both distort judgment", "communication gives probabilities, consequences, and practical actions together"],
  ["C1", "The Meritocracy Story and Its Blind Spots", "students, workers, institutions, and political communities", "effort and skill recognized rather than inherited status", "unequal starting points are easily mistaken for unequal merit", "selection systems examine access and luck alongside achievement"],
  ["C1", "Who Controls Collective Memory?", "families, schools, museums, media, and governments", "shared stories that support identity and learning", "official narratives can silence conflict and minority experience", "archives and public history preserve disagreement rather than one final account"],
  ["C1", "When Expertise and Democracy Disagree", "specialists, elected officials, citizens, and affected communities", "decisions informed by deep technical knowledge", "expert judgment can lack legitimacy while popular choice can ignore evidence", "institutions separate factual assessment from value choices and make both open to challenge"]
].map(([level, title, people, benefit, tension, example]) => ({ level, title, people, benefit, tension, example }));

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cap(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fill(template, context) {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? "");
}

function pickVocabulary(level, index) {
  const bank = vocabulary[level];
  return Array.from({ length: 5 }, (_, offset) => bank[(index * 2 + offset) % bank.length]);
}

function makeVocabulary(level, index, context) {
  return pickVocabulary(level, index).map(([term, target, pronunciation, partOfSpeech, definition, chinese, usage, example, frame]) => ({
    term,
    target,
    cefr: level,
    pronunciation,
    partOfSpeech,
    definition,
    example,
    chinese,
    usage,
    sentence: fill(frame, context),
  }));
}

function makeLanguageParagraph(level, index, context) {
  const items = makeVocabulary(level, index, context);
  return {
    items,
    paragraph: items.map((item) => item.sentence).join(" "),
  };
}

function makePhrase(level, index, context) {
  const term = phraseByLevel[level][index % phraseByLevel[level].length];
  const [definition, chinese, usage] = phraseMeaning[term];
  const sentenceByLevel = {
    A1: `At first, ${context.actor} sees only one part of ${context.subject}.`,
    A2: `${context.actor} can find out more by looking closely at ${context.subject}.`,
    B1: `A full explanation must take into account the conditions around ${context.subject}.`,
    B2: `In contrast, a wider view reveals several connected causes.`,
    C1: `A quick solution may work at the expense of a less visible need.`,
  };
  let sentence = sentenceByLevel[level];
  if (!sentence.toLowerCase().includes(term.toLowerCase())) {
    sentence = {
      "in the end": `In the end, ${context.actor} understands ${context.subject} more clearly.`,
      "one by one": `The important details appear one by one.`,
      "next to": `One clue sits next to another.`,
      "because of": `The outcome changes because of the surrounding conditions.`,
      "take care of": `${context.actor} must take care of the smallest details.`,
      "as soon as": `As soon as one condition changes, another response begins.`,
      "in this way": `In this way, the separate details form a complete idea.`,
      "instead of": `${context.actor} studies the evidence instead of guessing.`,
      "play a role in": `Several conditions play a role in the final result.`,
      "as a result": `As a result, the next stage develops differently.`,
      "deal with": `The system must deal with change over time.`,
      "in response to": `A new pattern appears in response to the changing conditions.`,
      "give rise to": `Small differences can give rise to a larger effect.`,
      "draw attention to": `The contrast can draw attention to a hidden detail.`,
      "to some extent": `To some extent, the result depends on perspective.`,
      "in the long run": `In the long run, repeated choices reshape the outcome.`,
      "be contingent on": `The outcome may be contingent on conditions that remain uncertain.`,
      "call into question": `The new evidence may call into question the first explanation.`,
      "in light of": `In light of the wider context, the simple answer becomes less convincing.`,
    }[term] ?? sentence;
  }
  return {
    item: {
      term,
      target: term,
      cefr: level,
      definition,
      example: sentence,
      chinese,
      usage,
    },
    sentence,
  };
}

function makeGrammar(level, context) {
  const entries = {
    A1: {
      term: "Present simple",
      target: `${context.subjectCap} changes over time.`,
      definition: "The present simple describes a fact or repeated process.",
      note: "一般现在时用于说明事实、规律或经常发生的动作。",
      example: "Water freezes at zero degrees.",
    },
    A2: {
      term: "When + present, can + verb",
      target: `When people look closely, they can see the difference.`,
      definition: "A when-clause introduces the condition or time for a general result.",
      note: "when 从句使用一般现在时，主句用 can 表示通常可能看到的结果。",
      example: "When the sun appears, we can see the colors clearly.",
    },
    B1: {
      term: "First conditional",
      target: `If we ignore the context, we may miss the point.`,
      definition: "If + present form introduces a possible condition and result.",
      note: "条件从句说明可能发生的情况，may 表示结果并非绝对。",
      example: "If the temperature falls, the water may freeze.",
    },
    B2: {
      term: "Concession with although",
      target: `Although the first explanation seems simple, the wider system is more complex.`,
      definition: "Although introduces a fact that contrasts with the main clause.",
      note: "although 引出让步信息，主句给出更重要或相反的判断。",
      example: "Although the method is fast, it is not always reliable.",
    },
    C1: {
      term: "What-clause as subject",
      target: `What appears to be a small detail can shape the whole experience.`,
      definition: "A what-clause turns a complete idea into the subject of the sentence.",
      note: "what 从句整体作主语，适合先呈现表象，再提出更复杂的判断。",
      example: "What seems like a delay may prevent a larger failure.",
    },
  };
  return entries[level];
}

function makeRhetoric(level, context) {
  const entries = {
    A1: {
      term: "Simile",
      target: `${context.subjectCap} is like a small map.`,
      definition: "A simile compares two things using like.",
      note: "用 like 把主题比作地图，帮助读者形成简单画面。",
      effect: "把抽象过程变成容易理解的具体物体。",
      tryIt: "A timetable is like a map of the day.",
    },
    A2: {
      term: "Personification",
      target: `${context.subjectCap} tells its story quietly.`,
      definition: "A non-human thing is given the human action of telling a story.",
      note: "把主题写成会讲故事的人，使描述更生动。",
      effect: "暗示细节需要读者主动观察才能被理解。",
      tryIt: "The old house tells its story through its walls.",
    },
    B1: {
      term: "Contrast",
      target: `The change is small, but its meaning is large.`,
      definition: "Two opposing qualities are placed together for emphasis.",
      note: "small 与 large 形成直接对比。",
      effect: "突出细微现象可能具有重要意义。",
      tryIt: "The journey was short, but its effect was lasting.",
    },
    B2: {
      term: "Metaphor",
      target: `${context.subjectCap} becomes a bridge between separate parts of the explanation.`,
      definition: "The subject is described as a bridge because it connects ideas.",
      note: "用 bridge 表示主题在多个因素之间建立联系。",
      effect: "把系统关系转化为读者熟悉的空间形象。",
      tryIt: "Shared language became a bridge between the groups.",
    },
    C1: {
      term: "Layered metaphor",
      target: `Beneath the visible surface, ${context.subject} keeps a second history.`,
      definition: "The subject is imagined as containing a hidden record below its surface.",
      note: "surface 与 second history 共同表现可见现象背后的累积过程。",
      effect: "为复杂分析提供一个统一且可记忆的意象。",
      tryIt: "Beneath the polished result, the project keeps a history of compromise.",
    },
  };
  return entries[level];
}

function languageNotes(level, index, context) {
  const vocab = makeLanguageParagraph(level, index, context);
  const phrase = makePhrase(level, index, context);
  const grammar = makeGrammar(level, context);
  const rhetoric = makeRhetoric(level, context);
  return {
    paragraph: vocab.paragraph,
    phraseSentence: phrase.sentence,
    grammarSentence: grammar.target,
    rhetoricSentence: rhetoric.target,
    vocabulary: vocab.items.map(({ sentence, ...item }) => item),
    phrases: [phrase.item],
    grammar: [{ ...grammar, cefr: level }],
    rhetoric: [{ ...rhetoric, cefr: level }],
  };
}

function gradedParagraphs(core, language, level, beginnerCore = {}) {
  const counts = { A1: 3, A2: 4, B1: 5, B2: 6, C1: 7 };
  const selected = beginnerCore[level] ? [...beginnerCore[level]] : core.slice(0, counts[level]);
  selected.splice(Math.min(2, selected.length), 0, language.paragraph);
  selected.push(language.phraseSentence, language.grammarSentence, language.rhetoricSentence);
  return selected;
}

function storyArticle(hero, challenge, level, index) {
  const title = `${hero.name} and ${challenge.title.replace(/^The /, "the ")}`;
  const context = {
    actor: hero.name,
    actorCap: hero.name,
    subject: "the journey",
    subjectCap: "The journey",
  };
  const language = languageNotes(level, index, context);
  const core = [
    `${hero.name} was a ${hero.role} who lived in ${hero.setting}. Each morning brought familiar work, but ${hero.name} hoped to ${hero.goal} and become worthy of the trust that others had placed nearby.`,
    `One day, ${challenge.event}. The event created a new task: ${challenge.goal}. Turning back would have been easy, yet the choice would have affected more than ${hero.name} alone.`,
    `${hero.name} first tried the quickest answer. It failed because the situation demanded attention rather than speed. Then ${challenge.helper} appeared and asked what had already been tried.`,
    `Together they studied the place, the available tools, and the time that remained. ${hero.name} began to understand that ${challenge.resolution}. The next attempt was slower, but every step answered a real part of the problem.`,
    `Before the task was complete, another difficulty appeared. ${hero.name} felt the pull of an easier choice and remembered the original goal. That moment, rather than the final success, became the true test of ${hero.value}.`,
    `By evening, the work was finished. The people who had been waiting saw only the result, while ${hero.name} remembered the uncertainty behind it. Praise mattered less than the knowledge that the decision could be explained honestly.`,
    `Years later, the story was still told in ${hero.setting}. Its lesson was not that every obstacle has a perfect answer. It was that character becomes visible when convenience, fear, and responsibility point in different directions.`
  ];
  const beginnerCore = {
    A1: [
      `${hero.name} is a ${hero.role}. ${hero.name} lives in ${hero.setting} and wants to ${hero.goal}.`,
      `One day, ${challenge.event}. ${hero.name} has a problem and must ${challenge.goal}.`,
      `${hero.name} meets ${challenge.helper}. They look at the problem and work together.`,
      `The work is not easy, but ${hero.name} does not stop. The final choice shows ${hero.value}.`
    ],
    A2: [
      `${hero.name} works as a ${hero.role} in ${hero.setting}. ${hero.name} hopes to ${hero.goal}.`,
      `One day, ${challenge.event}. Because of this, ${hero.name} must ${challenge.goal}.`,
      `The first plan fails, so ${hero.name} asks ${challenge.helper} for help. Together, they study the problem.`,
      `${hero.name} learns to ${challenge.resolution}. The slower plan works because it answers the real problem.`,
      `At the end of the day, ${hero.name} understands that ${hero.value} is shown through actions.`
    ]
  };
  return {
    id: `stories-${slug(title)}-${level.toLowerCase()}-${index + 1}`,
    title,
    topic: "Stories",
    level,
    levelFocus: levelFocus[level],
    dek: `A graded ${level} story about ${hero.value}, choice, and ${challenge.title.toLowerCase()}.`,
    sourceName: "English Reading Lab original story collection",
    sourceUrl: "./",
    sourceType: "Original graded story",
    adaptationNote: `An original ${level} story written for this reading collection.`,
    body: gradedParagraphs(core, language, level, beginnerCore),
    vocabulary: language.vocabulary,
    phrases: language.phrases,
    grammar: language.grammar,
    rhetoric: language.rhetoric,
  };
}

function scienceArticle(subject, lens, level, index) {
  const title = fill(lens.title, { title: subject.title });
  const context = {
    actor: "a careful observer",
    actorCap: "A careful observer",
    subject: "this natural system",
    subjectCap: "This natural system",
  };
  const language = languageNotes(level, index, context);
  const lensText = {
    process: `The order of the stages matters because each stage creates the conditions for the next one.`,
    signals: `Changes in movement, timing, shape, or position can act as signals about the state of the system.`,
    adaptation: `A response becomes especially important when the surrounding conditions no longer remain stable.`,
    measurement: `Repeated measurement separates a lasting pattern from an event that happened only once.`,
    connections: `No part exists alone; energy, material, and information move between this system and its surroundings.`,
  }[lens.lens];
  const beginnerLensText = {
    process: `The steps happen in an order. One step helps the next step begin.`,
    signals: `A movement or change can be a signal. It gives information about the system.`,
    adaptation: `Conditions can change. The system must respond in a new way.`,
    measurement: `Scientists measure the system many times. One number is not enough.`,
    connections: `The system is connected to other living things and places.`,
  }[lens.lens];
  const core = [
    `${cap(subject.name)} can be studied ${subject.setting}. A useful explanation begins with ${subject.input}, because no natural process happens without conditions around it. ${lensText}`,
    `At the center of the system, ${subject.process}. This activity is not a single event. It consists of connected stages, each of which changes what can happen next.`,
    `The immediate result is that ${subject.result}. Observers can compare places, times, or individuals to identify which conditions make the result stronger or weaker.`,
    `Change introduces a challenge: ${subject.challenge}. In response, ${subject.response}. The response has limits, however, and it does not guarantee that the system will remain unchanged.`,
    `Measurement matters because appearances alone can be misleading. Repeated observations reveal timing, variation, and unusual events that one brief visit would miss.`,
    `The wider connection is that ${subject.connection}. For this reason, studying one process can illuminate relationships that extend far beyond the original site.`,
    `A strong scientific account separates direct observation from inference. It also states uncertainty openly. The aim is not to make nature sound simple, but to make a complex explanation testable.`
  ];
  const beginnerCore = {
    A1: [
      `${subject.title} is the topic of this article. We can study it ${subject.setting}. ${beginnerLensText}`,
      `The system uses ${subject.input}. Then ${subject.process}.`,
      `This means that ${subject.result}.`,
      `A problem can appear because ${subject.challenge}. Scientists watch these changes.`
    ],
    A2: [
      `${subject.title} can be studied ${subject.setting}. The process begins with ${subject.input}. ${beginnerLensText}`,
      `Next, ${subject.process}. This leads to an important result: ${subject.result}.`,
      `Conditions do not always stay the same. For example, ${subject.challenge}.`,
      `The system responds because ${subject.response}. Scientists compare many observations to understand the change.`,
      `The topic also connects to a wider world because ${subject.connection}.`
    ]
  };
  return {
    id: `science-${slug(title)}-${level.toLowerCase()}-${index + 1}`,
    title,
    topic: "Science",
    level,
    levelFocus: levelFocus[level],
    dek: `A ${level} science explainer about ${subject.name}, ${lens.lens}, and connected systems.`,
    sourceName: subject.sourceName,
    sourceUrl: subject.sourceUrl,
    sourceType: "Original science explainer",
    adaptationNote: `Written for English Reading Lab from established educational material; graded for ${level}.`,
    body: gradedParagraphs(core, language, level, beginnerCore),
    vocabulary: language.vocabulary,
    phrases: language.phrases,
    grammar: language.grammar,
    rhetoric: language.rhetoric,
  };
}

function artArticle(form, lens, level, index) {
  const title = fill(lens.title, { title: form.title });
  const context = {
    actor: "a careful viewer",
    actorCap: "A careful viewer",
    subject: "the work",
    subjectCap: "The work",
  };
  const language = languageNotes(level, index, context);
  const lensText = {
    material: `Material is not a neutral container for an idea; its weight, resistance, and texture participate in the result.`,
    light: `Light and color establish relationships of emphasis, distance, temperature, and mood.`,
    movement: `Rhythm guides attention by creating expectation through repetition, pause, and change.`,
    composition: `Composition gives separate elements a structure, determining what leads, supports, or interrupts the whole.`,
    context: `An audience encounters the work through a particular place, technology, custom, and moment in history.`,
  }[lens.lens];
  const beginnerLensText = {
    material: `The material can be hard, soft, light, or heavy. This changes the work.`,
    light: `Light and color help some parts stand out. They can also change the mood.`,
    movement: `Rhythm uses repeat and change. It helps the work move through time or space.`,
    composition: `Composition is the way the parts work together. It guides the viewer.`,
    context: `People see art in different places. The place and audience can change the experience.`,
  }[lens.lens];
  const core = [
    `${form.title} begins with ${form.material}. Before asking what a work means, a viewer can ask how its material behaves and what kinds of decisions it permits. ${lensText}`,
    `Artists work with ${form.tools}. Each tool leaves possibilities as well as limits. A technique that appears effortless may depend on repeated physical practice.`,
    `One important feature is ${form.feature}. The effect develops through relationships among parts rather than through a single isolated detail.`,
    `Process shapes appearance: ${form.process}. What viewers encounter as a finished work is therefore also a record of time, revision, and material change.`,
    `Composition directs attention. Scale, contrast, repetition, and empty space influence what is noticed first and what remains in memory afterward.`,
    `Context changes interpretation. The same work can function differently in a home, a public square, a theater, a museum, or a screen viewed alone.`,
    `Close looking does not require one correct response. It requires claims that can be connected to visible or audible evidence, while leaving room for history and experience to complicate the first impression.`
  ];
  const beginnerCore = {
    A1: [
      `${form.title} uses ${form.material}. Artists need time and practice to work with it. ${beginnerLensText}`,
      `They may use ${form.tools}. Each tool makes a different mark, sound, shape, or movement.`,
      `Viewers can see ${form.feature}. They can look at one part and then another.`,
      `The artist makes choices. These choices help the work share an idea or feeling.`
    ],
    A2: [
      `${form.title} begins with ${form.material}. The material affects what the artist can do. ${beginnerLensText}`,
      `Artists work with ${form.tools}. They learn how each tool changes the result.`,
      `One important feature is ${form.feature}. Viewers may understand it by looking or listening more than once.`,
      `The process also matters because ${form.process}. The finished work keeps signs of this process.`,
      `Different viewers may have different ideas, but they can use details from the work to explain them.`
    ]
  };
  return {
    id: `art-design-${slug(title)}-${level.toLowerCase()}-${index + 1}`,
    title,
    topic: "Art & Design",
    level,
    levelFocus: levelFocus[level],
    dek: `A ${level} guide to ${form.title.toLowerCase()} through ${lens.lens}, material, and attention.`,
    sourceName: form.sourceName,
    sourceUrl: form.sourceUrl,
    sourceType: "Original art explainer",
    adaptationNote: `An original ${level} learning article informed by museum and arts education resources.`,
    body: gradedParagraphs(core, language, level, beginnerCore),
    vocabulary: language.vocabulary,
    phrases: language.phrases,
    grammar: language.grammar,
    rhetoric: language.rhetoric,
  };
}

function ideaArticle(topic, level, index) {
  const title = topic.title;
  const context = {
    actor: "a thoughtful participant",
    actorCap: "A thoughtful participant",
    subject: topic.title.toLowerCase(),
    subjectCap: topic.title,
  };
  const language = languageNotes(level, index, context);
  const lensText = `The central question is how ${topic.benefit} should be weighed against ${topic.tension}.`;
  const beginnerLensText = `The choice has a benefit and a problem. People need to look at both.`;
  const core = [
    `${topic.title} affects ${topic.people}. It can provide ${topic.benefit}, which explains why simple criticism rarely captures the whole question. ${lensText}`,
    `The tension appears around ${topic.tension}. A choice that helps one person immediately may move time, cost, or risk onto someone else.`,
    `The example is practical: ${topic.example}. Looking at this case makes the values behind the decision easier to identify.`,
    `Fair discussion begins by separating evidence from preference. People may value the same outcome but disagree about who should act, who should pay, or how uncertainty should be handled.`,
    `A useful proposal also considers unintended effects. Rules shape behavior, and people adapt to them. A solution can therefore create a second problem if it rewards the wrong action.`,
    `There may be no final arrangement that satisfies every need equally. The stronger goal is a decision whose benefits, limits, and revision process are visible to those affected.`,
    `Responsibility is shared but not identical. Individuals make choices, institutions design options, and public rules establish boundaries. Good judgment asks what each level can realistically change.`
  ];
  const beginnerCore = {
    A1: [
      `${topic.title} is part of daily life for ${topic.people}. ${beginnerLensText}`,
      `It can give people ${topic.benefit}. It can also bring a problem: ${topic.tension}.`,
      `Here is one example: ${topic.example}.`,
      `People can listen, ask questions, and make a fair choice together.`
    ],
    A2: [
      `${topic.title} affects ${topic.people}. It can offer ${topic.benefit}. ${beginnerLensText}`,
      `However, people also think about ${topic.tension}. Different groups may need different things.`,
      `A useful example is this: ${topic.example}. The example shows that one choice can have several effects.`,
      `People can compare the benefits and problems before they decide. They should also listen to those who are affected.`,
      `A good answer may not be perfect, but it should be clear, fair, and open to change.`
    ]
  };
  return {
    id: `ideas-society-${slug(title)}-${level.toLowerCase()}-${index + 1}`,
    title,
    topic: "Ideas & Society",
    level,
    levelFocus: levelFocus[level],
    dek: `A ${level} discussion of ${topic.title.toLowerCase()}, shared choices, and competing needs.`,
    sourceName: "English Reading Lab editorial essay collection",
    sourceUrl: "./",
    sourceType: "Original learning essay",
    adaptationNote: `An original ${level} essay written for this reading collection.`,
    body: gradedParagraphs(core, language, level, beginnerCore),
    vocabulary: language.vocabulary,
    phrases: language.phrases,
    grammar: language.grammar,
    rhetoric: language.rhetoric,
  };
}

function buildGeneratedArticles() {
  const articles = [];

  LEVELS.forEach((level, levelIndex) => {
    stories.forEach((hero, heroIndex) => {
      const challenge = storyChallenges[(heroIndex + levelIndex * 2) % storyChallenges.length];
      articles.push(storyArticle(hero, challenge, level, heroIndex));
    });
  });

  uniqueScienceTopics.forEach((subject, index) => {
    const lens = {
      title: subject.articleTitle,
      lens: scienceLenses[index % scienceLenses.length].lens,
    };
    articles.push(scienceArticle(subject, lens, subject.level, index % 10));
  });

  uniqueArtTopics.forEach((form, index) => {
    const lens = {
      title: form.title,
      lens: artLenses[index % artLenses.length].lens,
    };
    articles.push(artArticle(form, lens, form.level, index % 10));
  });

  uniqueIdeaTopics.forEach((topic, index) => {
    articles.push(ideaArticle(topic, topic.level, index % 10));
  });

  return articles;
}

function mergeFeatured(generated, featured) {
  const articles = [...generated];
  const usedSlots = new Set();
  for (const article of featured) {
    const slotKey = `${article.topic}:${article.level}`;
    const replaceIndex = articles.findIndex((candidate, index) =>
      !usedSlots.has(index) &&
      candidate.topic === article.topic &&
      candidate.level === article.level
    );
    if (replaceIndex === -1) {
      throw new Error(`No generated slot for featured article ${slotKey}`);
    }
    articles[replaceIndex] = article;
    usedSlots.add(replaceIndex);
  }
  return articles;
}

function validate(articles) {
  const errors = [];
  const ids = new Set();
  const titles = new Set();
  for (const article of articles) {
    if (ids.has(article.id)) errors.push(`Duplicate id: ${article.id}`);
    ids.add(article.id);
    const titleKey = article.title.toLowerCase();
    if (titles.has(titleKey)) errors.push(`Duplicate title: ${article.title}`);
    titles.add(titleKey);
    const body = article.body.join(" ").toLowerCase();
    for (const type of ["vocabulary", "phrases", "grammar", "rhetoric"]) {
      if (!article[type]?.length) errors.push(`${article.id}: missing ${type}`);
      for (const item of article[type] ?? []) {
        const target = (item.target ?? item.term).toLowerCase();
        if (!body.includes(target)) errors.push(`${article.id}: target not found: ${target}`);
      }
    }
  }
  for (const category of CATEGORIES) {
    for (const level of LEVELS) {
      const count = articles.filter((article) => article.topic === category && article.level === level).length;
      if (count !== 10) errors.push(`${category} ${level}: expected 10, received ${count}`);
    }
  }
  if (articles.length !== 200) errors.push(`Expected 200 articles, received ${articles.length}`);
  if (errors.length) throw new Error(errors.slice(0, 40).join("\n"));
}

const featured = JSON.parse(fs.readFileSync(FEATURED_PATH, "utf8")).articles.map((article) => ({
  ...article,
  vocabulary: article.vocabulary.map((item) => ({
    ...item,
    chinese: item.chinese ?? item.note,
    usage: item.usage ?? "结合正文中的语境和上方例句使用，注意词性及常见搭配。",
  })),
}));
const generated = buildGeneratedArticles();
const articles = mergeFeatured(generated, featured).sort((a, b) => {
  const categoryDiff = CATEGORIES.indexOf(a.topic) - CATEGORIES.indexOf(b.topic);
  if (categoryDiff) return categoryDiff;
  const levelDiff = LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level);
  if (levelDiff) return levelDiff;
  return a.title.localeCompare(b.title);
});

validate(articles);
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({ articles })}\n`);
console.log(`Wrote ${articles.length} validated articles to ${OUTPUT_PATH.pathname}`);
