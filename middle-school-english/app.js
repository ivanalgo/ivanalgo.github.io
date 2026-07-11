const THEME_KEY = "middle-school-english:theme";
const PROGRESS_PREFIX = "middle-school-english:progress:";
const DICTIONARY_CACHE_KEY = "middle-school-english:dictionary-cache";
const DICTIONARY_ENDPOINT = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const semesters = {
  "grade-7-1": { title: "七年级上册 · 沪教牛津版", data: "./grade-7-1/words.json" },
  "grade-7-2": { title: "七年级下册 · 沪教牛津版", data: "./grade-7-2/words.json" },
  "grade-8-1": { title: "八年级上册 · 沪教牛津版", data: "./grade-8-1/words.json" },
  "grade-8-2": { title: "八年级下册 · 沪教牛津版", data: "./grade-8-2/words.json" },
  "grade-9-1": { title: "九年级上册 · 沪教牛津版", data: "./grade-9-1/words.json" },
  "grade-9-2": { title: "九年级下册 · 沪教牛津版", data: "./grade-9-2/words.json" },
};

const collocations = {
  hello: ["say hello to 向……问好", "hello everyone 大家好"],
  good: ["be good at 擅长", "be good for 对……有益"],
  morning: ["in the morning 在早晨", "good morning 早上好"],
  how: ["how are you 你好吗", "how much 多少"],
  name: ["first name 名", "family name 姓"],
  meet: ["meet a friend 见朋友", "nice to meet you 很高兴认识你"],
  school: ["go to school 去上学", "after school 放学后"],
  class: ["in class 在课堂上", "have a class 上课"],
  friend: ["make friends 交朋友", "best friend 最好的朋友"],
  family: ["family member 家庭成员", "family name 姓"],
  book: ["read a book 读书", "a useful book 一本有用的书"],
  teacher: ["English teacher 英语老师", "ask the teacher 询问老师"],
  student: ["middle school student 初中生", "good student 好学生"],
  help: ["help with 帮助做……", "ask for help 寻求帮助"],
  like: ["would like 想要", "look like 看起来像"],
  look: ["look at 看", "look for 寻找"],
  have: ["have to 必须", "have a good time 玩得开心"],
  play: ["play with 和……玩", "play sports 做运动"],
  time: ["on time 准时", "have a good time 玩得开心"],
  day: ["every day 每天", "one day 有一天"],
  home: ["go home 回家", "at home 在家"],
  work: ["work hard 努力工作", "work with 和……一起工作"],
  study: ["study for 为……学习", "study hard 努力学习"],
  learn: ["learn from 向……学习", "learn to do 学会做……"],
  speak: ["speak English 说英语", "speak to 和……说话"],
  talk: ["talk about 谈论", "talk with 和……交谈"],
  listen: ["listen to 听", "listen carefully 仔细听"],
  read: ["read aloud 大声读", "read a book 读书"],
  write: ["write down 写下", "write to 写信给"],
  make: ["make friends 交朋友", "make a difference 产生影响"],
  take: ["take part in 参加", "take care of 照顾"],
  get: ["get up 起床", "get ready for 为……做准备"],
  go: ["go to school 去上学", "go out 外出"],
  come: ["come from 来自", "come true 实现"],
  put: ["put on 穿上", "put away 收好"],
  give: ["give up 放弃", "give advice 提建议"],
  find: ["find out 查明", "find it difficult 发现它很难"],
  think: ["think about 思考", "think of 想起"],
  know: ["get to know 逐渐了解", "as far as I know 据我所知"],
  want: ["want to do 想要做", "want something 想要某物"],
  need: ["need to do 需要做", "in need 在困境中"],
  important: ["be important to 对……重要", "an important part 重要部分"],
  different: ["be different from 与……不同", "different kinds of 不同种类的"],
  happy: ["be happy with 对……满意", "happy birthday 生日快乐"],
  afraid: ["be afraid of 害怕", "be afraid to do 不敢做"],
  interested: ["be interested in 对……感兴趣", "become interested in 开始对……感兴趣"],
  beautiful: ["beautiful scenery 美丽的风景", "look beautiful 看起来很美"],
  country: ["in the country 在乡村", "around the country 全国各地"],
  world: ["around the world 全世界", "in the world 在世界上"],
  problem: ["solve a problem 解决问题", "have a problem 遇到问题"],
  question: ["ask a question 提问", "answer a question 回答问题"],
  health: ["good health 健康状况良好", "health problem 健康问题"],
  healthy: ["keep healthy 保持健康", "healthy food 健康食品"],
  water: ["drink water 喝水", "a glass of water 一杯水"],
  food: ["healthy food 健康食品", "fast food 快餐"],
  weather: ["weather report 天气预报", "cold weather 寒冷天气"],
  idea: ["good idea 好主意", "have an idea 有一个想法"],
  way: ["in this way 用这种方式", "on the way 在路上"],
  place: ["take place 发生", "a good place to visit 值得参观的地方"],
  interested: ["be interested in 对……感兴趣", "show interest in 对……表现出兴趣"],
};

const localExamples = {
  hello: "Hello, everyone.",
  how: "How are you today?",
  do: "What do you do after school?",
  you: "You are my good friend.",
  people: "Many people exercise in the park.",
  hi: "Hi, nice to meet you.",
  good: "Reading is good for us.",
  morning: "I read English every morning.",
  and: "My sister and I go to school together.",
  class: "Please listen carefully in class.",
  sit: "Please sit down.",
  please: "Please open your book.",
  can: "I can speak English.",
  school: "We go to school from Monday to Friday.",
  teacher: "Our English teacher is very kind.",
  student: "She is a middle school student.",
  friend: "Tom is my best friend.",
  family: "There are four people in my family.",
  book: "This book is easy to read.",
  help: "Can you help me with my English?",
};

const elements = {
  semesterName: document.querySelector("#semesterName"),
  unitName: document.querySelector("#unitName"),
  unitSelect: document.querySelector("#unitSelect"),
  currentNumber: document.querySelector("#currentNumber"),
  totalNumber: document.querySelector("#totalNumber"),
  reviewedCount: document.querySelector("#reviewedCount"),
  progressBar: document.querySelector("#progressBar"),
  wordUnit: document.querySelector("#wordUnit"),
  audioStatus: document.querySelector("#audioStatus"),
  wordButton: document.querySelector("#wordButton"),
  wordText: document.querySelector("#wordText"),
  phoneticText: document.querySelector("#phoneticText"),
  partOfSpeech: document.querySelector("#partOfSpeech"),
  meaningText: document.querySelector("#meaningText"),
  exampleText: document.querySelector("#exampleText"),
  exampleNote: document.querySelector("#exampleNote"),
  collocationList: document.querySelector("#collocationList"),
  playButton: document.querySelector("#playButton"),
  repeatButton: document.querySelector("#repeatButton"),
  rateSelect: document.querySelector("#rateSelect"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  randomButton: document.querySelector("#randomButton"),
  themeButton: document.querySelector("#themeButton"),
  dataButton: document.querySelector("#dataButton"),
  dataDialog: document.querySelector("#dataDialog"),
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  importInput: document.querySelector("#importInput"),
  toast: document.querySelector("#toast"),
};

const params = new URLSearchParams(window.location.search);
const semesterId = semesters[params.get("semester")] ? params.get("semester") : "grade-7-1";
const semester = semesters[semesterId];

const state = {
  data: null,
  allWords: [],
  words: [],
  queue: [],
  index: 0,
  unit: "all",
  progress: loadJson(`${PROGRESS_PREFIX}${semesterId}`, {}),
  dictionaryCache: loadJson(DICTIONARY_CACHE_KEY, {}),
  lookupToken: 0,
  isRepeating: false,
  activeAudio: null,
};

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveProgress() {
  localStorage.setItem(`${PROGRESS_PREFIX}${semesterId}`, JSON.stringify(state.progress));
}

function saveDictionaryCache() {
  const entries = Object.entries(state.dictionaryCache);
  if (entries.length > 250) {
    state.dictionaryCache = Object.fromEntries(entries.slice(-200));
  }
  localStorage.setItem(DICTIONARY_CACHE_KEY, JSON.stringify(state.dictionaryCache));
}

function resolveTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "dark" ? "#171d1b" : "#f2eee3",
  );
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function normalizeWord(value) {
  return value.toLowerCase().replace(/[’']/g, "'").trim();
}

function todayStamp() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addDays(days) {
  return todayStamp() + days * 86_400_000;
}

function buildWordList() {
  state.allWords = state.data.units.flatMap((unit, unitIndex) =>
    unit.words.map((word) => ({ ...word, unit: unit.name, unitIndex })),
  );
  state.words = state.unit === "all"
    ? state.allWords
    : state.allWords.filter((word) => String(word.unitIndex) === state.unit);

  const due = [];
  const unseen = [];
  const future = [];
  const now = todayStamp();

  state.words.forEach((word) => {
    const record = state.progress[word.id];
    if (!record) {
      unseen.push(word);
    } else if ((record.due || 0) <= now) {
      due.push(word);
    } else {
      future.push(word);
    }
  });

  future.sort((a, b) => state.progress[a.id].due - state.progress[b.id].due);
  state.queue = [...due, ...unseen, ...future];
  state.index = 0;
}

function fillUnitOptions() {
  state.data.units.forEach((unit, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${unit.name} · ${unit.words.length} 词`;
    elements.unitSelect.append(option);
  });
}

function currentWord() {
  return state.queue[state.index];
}

function topicLabel(word) {
  return (word.unit || "this topic").replace(/^Unit\s+\d+\s*/i, "").trim().toLowerCase();
}

function fallbackExample(word) {
  const topic = topicLabel(word);
  if (word.word.includes(" ")) {
    return `We often use “${word.word}” when talking about ${topic}.`;
  }
  return `The word “${word.word}” is useful when talking about ${topic}.`;
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function fallbackCollocations(word) {
  const normalized = normalizeWord(word.word);
  if (Array.isArray(word.collocations) && word.collocations.length > 0) {
    return word.collocations;
  }
  if (collocations[normalized]) {
    return collocations[normalized];
  }
  if (word.word.includes(" ")) {
    return [`${word.word}　${word.meaning}`];
  }
  const part = (word.partOfSpeech || "").toLowerCase();
  if (part.includes("v.")) {
    return [`${word.word} something ${word.word} + 某事/某物`, `${word.word} carefully 认真地${word.word}`];
  }
  if (part.includes("adj.")) {
    return [`be ${word.word} 是/变得${word.meaning.split(/[；;]/)[0]}`, `${word.word} + noun ${word.word} + 名词`];
  }
  if (part.includes("adv.")) {
    return [`${word.word} + verb ${word.word} + 动词`, `${word.word} enough 足够${word.word}`];
  }
  if (part.includes("n.")) {
    return [`${articleFor(word.word)} ${word.word} 一个/一件/一本 ${word.word}`, `${word.word} of ... ……的${word.word}`];
  }
  return [`use “${word.word}” 使用 ${word.word}`, `remember “${word.word}” 记住 ${word.word}`];
}

function renderCollocations(items) {
  elements.collocationList.replaceChildren();
  items.slice(0, 3).forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    elements.collocationList.append(item);
  });
}

function stopPlayback() {
  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio.currentTime = 0;
    state.activeAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  elements.wordButton.classList.remove("is-playing");
}

function renderWord() {
  const word = currentWord();
  if (!word) {
    showToast("这个范围里还没有词条");
    return;
  }

  stopPlayback();
  state.lookupToken += 1;
  const token = state.lookupToken;

  elements.wordText.textContent = word.word;
  elements.wordUnit.textContent = word.unit;
  elements.unitName.textContent = state.unit === "all" ? word.unit : `${word.unit} · 单元复习`;
  elements.partOfSpeech.textContent = word.partOfSpeech;
  elements.meaningText.textContent = word.meaning;
  elements.phoneticText.textContent = "正在查询音标…";
  elements.exampleText.textContent = "正在从在线词典寻找例句…";
  elements.exampleNote.textContent = "例句由在线词典提供";
  elements.audioStatus.textContent = "联网获取真人发音";
  elements.audioStatus.dataset.status = "loading";
  renderCollocations(fallbackCollocations(word));

  const position = state.index + 1;
  elements.currentNumber.textContent = position;
  elements.totalNumber.textContent = state.queue.length;
  elements.progressBar.style.width = `${(position / Math.max(state.queue.length, 1)) * 100}%`;
  elements.reviewedCount.textContent = Object.keys(state.progress).length;
  elements.previousButton.disabled = state.index === 0;

  lookupDictionary(word).then((result) => {
    if (token !== state.lookupToken || currentWord()?.id !== word.id) {
      return;
    }
    applyDictionaryResult(word, result);
  });
}

function applyDictionaryResult(word, result) {
  const localExample = localExamples[normalizeWord(word.word)];
  if (!result) {
    elements.phoneticText.textContent = "音标暂缺";
    elements.exampleText.textContent = localExample || fallbackExample(word);
    elements.exampleNote.textContent = localExample
      ? "初中学习例句"
      : "在线词典暂无例句 · 这是练习提示句";
    elements.audioStatus.textContent = "使用设备英语语音";
    elements.audioStatus.dataset.status = "fallback";
    return;
  }

  elements.phoneticText.textContent = result.phonetic || "音标暂缺";
  if (localExample || result.example) {
    elements.exampleText.textContent = localExample || result.example;
    elements.exampleNote.textContent = localExample ? "初中学习例句" : "英文例句由在线词典提供";
  } else {
    elements.exampleText.textContent = fallbackExample(word);
    elements.exampleNote.textContent = "在线词典暂无例句 · 这是练习提示句";
  }

  if (result.audio) {
    elements.audioStatus.textContent = "在线真人发音已就绪";
    elements.audioStatus.dataset.status = "ready";
  } else {
    elements.audioStatus.textContent = "使用设备英语语音";
    elements.audioStatus.dataset.status = "fallback";
  }
}

async function lookupDictionary(word) {
  const key = normalizeWord(word.word);
  if (state.dictionaryCache[key]) {
    return state.dictionaryCache[key];
  }

  if (!/^[a-z]+(?:[-'][a-z]+)*$/i.test(word.word)) {
    return null;
  }

  try {
    const response = await fetch(`${DICTIONARY_ENDPOINT}${encodeURIComponent(word.word)}`);
    if (!response.ok) {
      return null;
    }
    const entries = await response.json();
    const phonetics = entries.flatMap((entry) => entry.phonetics || []);
    const audioEntry = phonetics.find((item) => item.audio && /us/i.test(item.audio))
      || phonetics.find((item) => item.audio)
      || null;
    const definition = entries
      .flatMap((entry) => entry.meanings || [])
      .flatMap((meaning) => meaning.definitions || [])
      .find((item) => item.example);
    const phonetic = entries.find((entry) => entry.phonetic)?.phonetic
      || phonetics.find((item) => item.text)?.text
      || "";
    const rawAudio = audioEntry?.audio || "";
    const result = {
      audio: rawAudio.startsWith("//") ? `https:${rawAudio}` : rawAudio,
      phonetic,
      example: definition?.example || "",
      savedAt: Date.now(),
    };
    state.dictionaryCache[key] = result;
    saveDictionaryCache();
    return result;
  } catch {
    return null;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function speakWithDevice(text, rate) {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("speech synthesis unavailable"));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onend = resolve;
    utterance.onerror = reject;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

function playAudioUrl(url, rate) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    state.activeAudio = audio;
    audio.playbackRate = rate;
    audio.onended = () => {
      state.activeAudio = null;
      resolve();
    };
    audio.onerror = reject;
    audio.play().catch(reject);
  });
}

async function playCurrent() {
  const word = currentWord();
  if (!word) return;

  stopPlayback();
  elements.wordButton.classList.add("is-playing");
  const rate = Number(elements.rateSelect.value);
  const result = await lookupDictionary(word);

  try {
    if (result?.audio) {
      await playAudioUrl(result.audio, rate);
    } else {
      await speakWithDevice(word.word, rate);
    }
  } catch {
    try {
      await speakWithDevice(word.word, rate);
      elements.audioStatus.textContent = "在线录音失败，已用设备语音";
      elements.audioStatus.dataset.status = "fallback";
    } catch {
      showToast("当前浏览器无法播放发音");
    }
  } finally {
    elements.wordButton.classList.remove("is-playing");
  }
}

async function repeatCurrent() {
  if (state.isRepeating) {
    stopPlayback();
    state.isRepeating = false;
    elements.repeatButton.disabled = false;
    elements.repeatButton.innerHTML = "<span aria-hidden=\"true\">↻</span> 重复 3 遍";
    return;
  }

  state.isRepeating = true;
  elements.repeatButton.disabled = false;
  elements.repeatButton.innerHTML = "<span aria-hidden=\"true\">■</span> 停止重复";
  for (let index = 1; index <= 3 && state.isRepeating; index += 1) {
    await playCurrent();
    if (index < 3 && state.isRepeating) {
      await wait(650);
    }
  }
  state.isRepeating = false;
  elements.repeatButton.disabled = false;
  elements.repeatButton.innerHTML = "<span aria-hidden=\"true\">↻</span> 重复 3 遍";
}

function move(step) {
  if (state.queue.length === 0) return;
  state.index = Math.min(Math.max(state.index + step, 0), state.queue.length - 1);
  renderWord();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function chooseRandom() {
  if (state.queue.length < 2) return;
  let next = state.index;
  while (next === state.index) {
    next = Math.floor(Math.random() * state.queue.length);
  }
  state.index = next;
  renderWord();
}

function rateCurrent(rating) {
  const word = currentWord();
  if (!word) return;
  const previous = state.progress[word.id] || { interval: 0, reviews: 0, lapses: 0 };
  let interval;

  if (rating === "again") {
    interval = 0;
    previous.lapses += 1;
  } else if (rating === "hard") {
    interval = previous.interval > 0 ? Math.max(1, Math.ceil(previous.interval * 1.4)) : 1;
  } else {
    interval = previous.interval > 0 ? Math.max(3, Math.ceil(previous.interval * 2.2)) : 3;
  }

  state.progress[word.id] = {
    interval,
    reviews: previous.reviews + 1,
    lapses: previous.lapses,
    lastRating: rating,
    lastReviewed: Date.now(),
    due: addDays(interval),
  };
  saveProgress();

  if (rating === "again") {
    const [againWord] = state.queue.splice(state.index, 1);
    state.queue.splice(Math.min(state.index + 3, state.queue.length), 0, againWord);
    showToast("这个词会在本次复习中再次出现");
  } else if (state.index >= state.queue.length - 1) {
    state.index = 0;
    showToast("这一轮完成了，回到第一个词");
  } else {
    state.index += 1;
  }
  renderWord();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2400);
}

function exportData() {
  const payload = {};
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PROGRESS_PREFIX))
    .forEach((key) => {
      payload[key] = loadJson(key, {});
    });

  const blob = new Blob([
    JSON.stringify({ app: "middle-school-english", exportedAt: new Date().toISOString(), data: payload }, null, 2),
  ], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `初中英语学习记录-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("学习记录已导出");
}

async function importData(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (payload.app !== "middle-school-english" || !payload.data) {
      throw new Error("invalid backup");
    }
    Object.entries(payload.data).forEach(([key, value]) => {
      if (key.startsWith(PROGRESS_PREFIX)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    state.progress = loadJson(`${PROGRESS_PREFIX}${semesterId}`, {});
    buildWordList();
    renderWord();
    elements.dataDialog.close();
    showToast("学习记录已恢复");
  } catch {
    showToast("这个文件不是有效的学习记录");
  }
}

function bindEvents() {
  elements.wordButton.addEventListener("click", playCurrent);
  elements.playButton.addEventListener("click", playCurrent);
  elements.repeatButton.addEventListener("click", repeatCurrent);
  elements.previousButton.addEventListener("click", () => move(-1));
  elements.nextButton.addEventListener("click", () => move(1));
  elements.randomButton.addEventListener("click", chooseRandom);
  elements.themeButton.addEventListener("click", toggleTheme);
  elements.dataButton.addEventListener("click", () => elements.dataDialog.showModal());
  elements.exportButton.addEventListener("click", exportData);
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", () => {
    if (elements.importInput.files[0]) {
      importData(elements.importInput.files[0]);
    }
  });

  elements.unitSelect.addEventListener("change", (event) => {
    state.unit = event.target.value;
    buildWordList();
    renderWord();
  });

  document.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => rateCurrent(button.dataset.rating));
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("select, button, input") || elements.dataDialog.open) return;
    if (event.code === "Space") {
      event.preventDefault();
      playCurrent();
    } else if (event.key === "1") {
      rateCurrent("again");
    } else if (event.key === "2") {
      rateCurrent("hard");
    } else if (event.key === "3") {
      rateCurrent("good");
    } else if (event.key === "ArrowLeft") {
      move(-1);
    } else if (event.key === "ArrowRight") {
      move(1);
    }
  });
}

async function init() {
  applyTheme(resolveTheme());
  elements.semesterName.textContent = semester.title;
  document.title = `${semester.title} · 初中英语`;
  bindEvents();

  try {
    const response = await fetch(semester.data);
    if (!response.ok) throw new Error("word list unavailable");
    state.data = await response.json();
    fillUnitOptions();
    buildWordList();
    renderWord();
  } catch {
    elements.wordText.textContent = "载入失败";
    elements.meaningText.textContent = "请检查网络后刷新页面。";
    elements.audioStatus.textContent = "词库未载入";
    showToast("词库载入失败");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

init();
