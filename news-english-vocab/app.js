const pageSize = 12;

const state = {
  words: [],
  filtered: [],
  page: 1,
  topic: "all",
  level: "all",
  query: "",
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  topicSelect: document.querySelector("#topicSelect"),
  levelSelect: document.querySelector("#levelSelect"),
  topicChips: document.querySelector("#topicChips"),
  vocabGrid: document.querySelector("#vocabGrid"),
  resultCount: document.querySelector("#resultCount"),
  pageInfo: document.querySelector("#pageInfo"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageNumbers: document.querySelector("#pageNumbers"),
};

function normalize(value) {
  return value.toLowerCase().trim();
}

function getTopics(words) {
  return [...new Set(words.map((word) => word.topic))].sort((a, b) => a.localeCompare(b));
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function buildFilters() {
  const topics = getTopics(state.words);

  topics.forEach((topic) => {
    elements.topicSelect.append(createOption(topic, topic));
  });

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "chip is-active";
  allChip.dataset.topic = "all";
  allChip.textContent = "全部";
  elements.topicChips.append(allChip);

  topics.forEach((topic) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.topic = topic;
    chip.textContent = topic;
    elements.topicChips.append(chip);
  });
}

function wordMatchesQuery(word, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    word.term,
    word.phonetic,
    word.level,
    word.partOfSpeech,
    word.meaning,
    word.topic,
    ...word.examples,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function applyFilters() {
  const query = normalize(state.query);

  state.filtered = state.words.filter((word) => {
    const topicMatch = state.topic === "all" || word.topic === state.topic;
    const levelMatch = state.level === "all" || word.level === state.level;
    return topicMatch && levelMatch && wordMatchesQuery(word, query);
  });

  const pageCount = getPageCount();
  if (state.page > pageCount) {
    state.page = pageCount || 1;
  }
}

function getPageCount() {
  return Math.ceil(state.filtered.length / pageSize);
}

function speak(term) {
  if (!("speechSynthesis" in window)) {
    window.alert("当前浏览器不支持语音播放。请尝试 Chrome、Edge 或 Safari。");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(term);
  utterance.lang = "en-US";
  utterance.rate = 0.86;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function renderCards() {
  elements.vocabGrid.replaceChildren();

  if (state.filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有找到匹配的词条。请换一个关键词、话题或难度。";
    elements.vocabGrid.append(empty);
    return;
  }

  const start = (state.page - 1) * pageSize;
  const pageItems = state.filtered.slice(start, start + pageSize);

  pageItems.forEach((word) => {
    const article = document.createElement("article");
    article.className = "word-card";

    const top = document.createElement("div");
    top.className = "word-card__top";

    const heading = document.createElement("h2");
    heading.textContent = word.term;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "speak-button";
    button.setAttribute("aria-label", `播放 ${word.term} 的发音`);
    button.textContent = "音";
    button.addEventListener("click", () => speak(word.term));

    top.append(heading, button);

    const meta = document.createElement("div");
    meta.className = "meta";
    [word.phonetic, word.level, word.partOfSpeech, word.topic].forEach((item) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = item;
      meta.append(pill);
    });

    const meaning = document.createElement("p");
    meaning.className = "meaning";
    meaning.textContent = word.meaning;

    const examples = document.createElement("ul");
    examples.className = "examples";
    word.examples.forEach((example) => {
      const item = document.createElement("li");
      item.textContent = example;
      examples.append(item);
    });

    article.append(top, meta, meaning, examples);
    elements.vocabGrid.append(article);
  });
}

function renderSummary() {
  const pageCount = getPageCount();
  elements.resultCount.textContent = `${state.filtered.length} 个词条`;
  elements.pageInfo.textContent = pageCount
    ? `第 ${state.page} / ${pageCount} 页，每页 ${pageSize} 个词条`
    : "当前没有可显示的词条";
}

function renderPagination() {
  const pageCount = getPageCount();
  elements.pageNumbers.replaceChildren();

  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= pageCount || pageCount === 0;

  for (let page = 1; page <= pageCount; page += 1) {
    if (pageCount > 7 && Math.abs(page - state.page) > 2 && page !== 1 && page !== pageCount) {
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = page === state.page ? "page-number is-active" : "page-number";
    button.textContent = page;
    button.setAttribute("aria-label", `跳转到第 ${page} 页`);
    button.addEventListener("click", () => {
      state.page = page;
      render();
    });
    elements.pageNumbers.append(button);
  }
}

function renderChips() {
  elements.topicChips.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.topic === state.topic);
  });
}

function render() {
  applyFilters();
  renderCards();
  renderSummary();
  renderPagination();
  renderChips();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.page = 1;
    render();
  });

  elements.topicSelect.addEventListener("change", (event) => {
    state.topic = event.target.value;
    state.page = 1;
    render();
  });

  elements.levelSelect.addEventListener("change", (event) => {
    state.level = event.target.value;
    state.page = 1;
    render();
  });

  elements.topicChips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) {
      return;
    }

    state.topic = chip.dataset.topic;
    elements.topicSelect.value = state.topic;
    state.page = 1;
    render();
  });

  elements.prevPage.addEventListener("click", () => {
    state.page -= 1;
    render();
  });

  elements.nextPage.addEventListener("click", () => {
    state.page += 1;
    render();
  });
}

async function loadVocabulary() {
  try {
    const response = await fetch("./vocab.json");
    if (!response.ok) {
      throw new Error(`Failed to load vocab.json: ${response.status}`);
    }

    state.words = await response.json();
    state.filtered = state.words;
    buildFilters();
    bindEvents();
    render();
  } catch (error) {
    elements.resultCount.textContent = "词库加载失败";
    elements.pageInfo.textContent = error.message;
    elements.vocabGrid.innerHTML = '<div class="empty-state">无法读取 vocab.json。请通过本地服务器或 GitHub Pages 打开页面。</div>';
  }
}

loadVocabulary();
