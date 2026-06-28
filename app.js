const levelOrder = new Map([
  ["A1", 0],
  ["A2", 1],
  ["B1", 2],
  ["B2", 3],
  ["C1", 4],
]);

const annotationTypePriority = new Map([
  ["vocabulary", 0],
  ["phrases", 1],
  ["grammar", 2],
  ["rhetoric", 3],
]);

const state = {
  articles: [],
  activeId: "",
  query: "",
  activeAnnotationId: "",
  isLibraryHidden: false,
  collapsedTopics: new Set(),
  collapsedLevels: new Set(),
};

const elements = {
  readerShell: document.querySelector("#readerShell"),
  libraryPanel: document.querySelector("#libraryPanel"),
  hideLibraryButton: document.querySelector("#hideLibraryButton"),
  showLibraryButton: document.querySelector("#showLibraryButton"),
  searchInput: document.querySelector("#searchInput"),
  libraryTree: document.querySelector("#libraryTree"),
  articleTopic: document.querySelector("#articleTopic"),
  articleLevel: document.querySelector("#articleLevel"),
  articleLength: document.querySelector("#articleLength"),
  articleSourceType: document.querySelector("#articleSourceType"),
  articleTitle: document.querySelector("#articleTitle"),
  articleDek: document.querySelector("#articleDek"),
  articleLevelFocus: document.querySelector("#articleLevelFocus"),
  articleSource: document.querySelector("#articleSource"),
  adaptationNote: document.querySelector("#adaptationNote"),
  articleBody: document.querySelector("#articleBody"),
  orderedNoteList: document.querySelector("#orderedNoteList"),
};

function normalize(value) {
  return value.trim().toLowerCase();
}

function setLibraryHidden(isHidden) {
  state.isLibraryHidden = isHidden;
  elements.readerShell.classList.toggle("is-library-hidden", isHidden);
  elements.libraryPanel.hidden = isHidden;
  elements.hideLibraryButton.setAttribute("aria-expanded", String(!isHidden));
  elements.showLibraryButton.hidden = !isHidden;
  elements.showLibraryButton.setAttribute("aria-expanded", String(!isHidden));
}

function articleMatches(article, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    article.title,
    article.topic,
    article.level,
    article.dek,
    article.sourceName,
    ...article.body,
    ...article.vocabulary.flatMap((item) => [item.term, item.note]),
    ...article.phrases.flatMap((item) => [item.term, item.note]),
    ...article.grammar.flatMap((item) => [item.term, item.note]),
    ...article.rhetoric.flatMap((item) => [item.term, item.note]),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function sortArticles(articles) {
  return [...articles].sort((a, b) => {
    const topicCompare = a.topic.localeCompare(b.topic);
    if (topicCompare !== 0) {
      return topicCompare;
    }

    const levelCompare = (levelOrder.get(a.level) ?? 999) - (levelOrder.get(b.level) ?? 999);
    if (levelCompare !== 0) {
      return levelCompare;
    }

    return a.title.localeCompare(b.title);
  });
}

function groupArticles(articles) {
  const grouped = new Map();

  articles.forEach((article) => {
    if (!grouped.has(article.topic)) {
      grouped.set(article.topic, new Map());
    }

    const levels = grouped.get(article.topic);
    if (!levels.has(article.level)) {
      levels.set(article.level, []);
    }

    levels.get(article.level).push(article);
  });

  return grouped;
}

function getArticleCountByLevels(levels) {
  return [...levels.values()].reduce((total, articles) => total + articles.length, 0);
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function getArticleWordCount(article) {
  return article.body.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function getStudyItems(article) {
  return [
    ...article.vocabulary.map((item, index) => ({
      ...item,
      id: `vocabulary-${index}`,
      type: "vocabulary",
      label: "Vocabulary",
      target: item.target ?? item.term,
    })),
    ...article.phrases.map((item, index) => ({
      ...item,
      id: `phrases-${index}`,
      type: "phrases",
      label: "Phrase",
      target: item.target ?? item.term,
    })),
    ...article.grammar.map((item, index) => ({
      ...item,
      id: `grammar-${index}`,
      type: "grammar",
      label: "Grammar",
      target: item.target ?? item.term,
    })),
    ...article.rhetoric.map((item, index) => ({
      ...item,
      id: `rhetoric-${index}`,
      type: "rhetoric",
      label: "Rhetoric",
      target: item.target ?? item.term,
    })),
  ];
}

function getArticleTextOffset(article, target) {
  const lowerTarget = target.toLowerCase();
  let offset = 0;

  for (const paragraph of article.body) {
    const index = paragraph.toLowerCase().indexOf(lowerTarget);
    if (index !== -1) {
      return offset + index;
    }

    offset += paragraph.length + 1;
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortStudyItemsByReadingOrder(article, items) {
  return [...items]
    .map((item, index) => ({
      ...item,
      readingOrder: getArticleTextOffset(article, item.target),
      originalOrder: index,
    }))
    .sort((a, b) => {
      if (a.readingOrder !== b.readingOrder) {
        return a.readingOrder - b.readingOrder;
      }

      const typeCompare =
        (annotationTypePriority.get(a.type) ?? 999) - (annotationTypePriority.get(b.type) ?? 999);
      if (typeCompare !== 0) {
        return typeCompare;
      }

      return a.originalOrder - b.originalOrder;
    });
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function findAnnotationRanges(text, annotations) {
  const lowerText = text.toLowerCase();
  const ranges = [];
  const sortedAnnotations = annotations
    .filter((annotation) => annotation.target && annotation.target.length > 1)
    .sort((a, b) => b.target.length - a.target.length);

  sortedAnnotations.forEach((annotation) => {
    const lowerTarget = annotation.target.toLowerCase();
    let searchFrom = 0;
    let index = lowerText.indexOf(lowerTarget, searchFrom);

    while (index !== -1) {
      ranges.push({
        start: index,
        end: index + lowerTarget.length,
        annotation,
      });

      searchFrom = index + lowerTarget.length;
      index = lowerText.indexOf(lowerTarget, searchFrom);
    }
  });

  return ranges.sort((a, b) => a.start - b.start);
}

function createAnnotatedParagraph(text, annotations) {
  const paragraph = document.createElement("p");
  const ranges = findAnnotationRanges(text, annotations);
  const boundaries = [...new Set([0, text.length, ...ranges.flatMap((range) => [range.start, range.end])])].sort((a, b) => a - b);

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const segment = text.slice(start, end);
    const coveringRanges = ranges.filter((range) => rangesOverlap(range, { start, end }));

    if (coveringRanges.length === 0) {
      paragraph.append(document.createTextNode(segment));
      continue;
    }

    const span = document.createElement("span");
    const annotationIds = [...new Set(coveringRanges.map((range) => range.annotation.id))];
    const primaryAnnotation = [...coveringRanges]
      .sort((a, b) => {
        const typeCompare =
          (annotationTypePriority.get(a.annotation.type) ?? 999) -
          (annotationTypePriority.get(b.annotation.type) ?? 999);
        if (typeCompare !== 0) {
          return typeCompare;
        }

        return a.end - a.start - (b.end - b.start);
      })[0].annotation;
    span.className = `annotation annotation--${primaryAnnotation.type}`;
    span.dataset.annotationId = annotationIds.join(" ");
    span.tabIndex = 0;
    span.textContent = segment;
    span.addEventListener("mouseenter", () => activateAnnotation(primaryAnnotation.id, { scrollNote: true }));
    span.addEventListener("mouseleave", clearAnnotation);
    span.addEventListener("focus", () => activateAnnotation(primaryAnnotation.id, { scrollNote: true }));
    span.addEventListener("blur", clearAnnotation);
    span.addEventListener("click", () => activateAnnotation(primaryAnnotation.id, { scrollNote: true }));
    paragraph.append(span);
  }

  return paragraph;
}

function getAnnotationIds(element) {
  return element.dataset.annotationId?.split(" ") ?? [];
}

function scrollLinkedNoteIntoView(annotationId) {
  const note = document.querySelector(`.note-item[data-annotation-id="${annotationId}"]`);
  if (!note) {
    return;
  }

  const container = document.querySelector(".study-panel");
  if (!container) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const noteRect = note.getBoundingClientRect();
  const targetTop = container.scrollTop + noteRect.top - containerRect.top - container.clientHeight / 2 + noteRect.height / 2;

  container.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

function scrollLinkedAnnotationIntoView(annotationId) {
  const annotation = [...document.querySelectorAll(".annotation")].find((element) =>
    getAnnotationIds(element).includes(annotationId)
  );
  if (!annotation) {
    return;
  }

  annotation.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

function activateAnnotation(annotationId, options = {}) {
  const shouldScrollNote = options.scrollNote && state.activeAnnotationId !== annotationId;
  const shouldScrollArticle = options.scrollArticle;
  state.activeAnnotationId = annotationId;

  document.querySelectorAll(".annotation, .note-item").forEach((element) => {
    element.classList.toggle("is-linked", getAnnotationIds(element).includes(annotationId));
  });

  if (shouldScrollNote) {
    scrollLinkedNoteIntoView(annotationId);
  }

  if (shouldScrollArticle) {
    scrollLinkedAnnotationIntoView(annotationId);
  }
}

function clearAnnotation() {
  state.activeAnnotationId = "";
  document.querySelectorAll(".annotation, .note-item").forEach((element) => {
    element.classList.remove("is-linked");
  });
}

function renderLibrary() {
  const query = normalize(state.query);
  const visibleArticles = sortArticles(state.articles.filter((article) => articleMatches(article, query)));
  const grouped = groupArticles(visibleArticles);
  elements.libraryTree.replaceChildren();

  if (visibleArticles.length === 0) {
    elements.libraryTree.append(createTextElement("div", "empty-state", "No articles match this search."));
    return;
  }

  grouped.forEach((levels, topic) => {
    const topicSection = document.createElement("section");
    topicSection.className = "topic-group";
    const contentId = `topic-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const isCollapsed = !query && state.collapsedTopics.has(topic);

    const topicButton = document.createElement("button");
    topicButton.type = "button";
    topicButton.className = `topic-toggle${isCollapsed ? " is-collapsed" : ""}`;
    topicButton.setAttribute("aria-expanded", String(!isCollapsed));
    topicButton.setAttribute("aria-controls", contentId);

    const topicName = createTextElement("span", "topic-toggle__name", topic);
    const topicMeta = createTextElement("span", "topic-toggle__meta", `${getArticleCountByLevels(levels)} articles`);
    topicButton.append(topicName, topicMeta);
    topicButton.addEventListener("click", () => {
      if (state.collapsedTopics.has(topic)) {
        state.collapsedTopics.delete(topic);
      } else {
        state.collapsedTopics.add(topic);
      }
      renderLibrary();
    });
    topicSection.append(topicButton);

    const topicContent = document.createElement("div");
    topicContent.id = contentId;
    topicContent.className = "topic-content";
    topicContent.hidden = isCollapsed;

    if (!isCollapsed) {
      [...levels.entries()]
      .sort((a, b) => (levelOrder.get(a[0]) ?? 999) - (levelOrder.get(b[0]) ?? 999))
      .forEach(([level, articles]) => {
        const levelKey = `${topic}::${level}`;
        const isLevelCollapsed = !query && state.collapsedLevels.has(levelKey);
        const levelSection = document.createElement("section");
        levelSection.className = "level-group";

        const levelButton = document.createElement("button");
        levelButton.type = "button";
        levelButton.className = `level-toggle${isLevelCollapsed ? " is-collapsed" : ""}`;
        levelButton.setAttribute("aria-expanded", String(!isLevelCollapsed));
        levelButton.append(createTextElement("span", "level-title", level));
        levelButton.append(createTextElement("span", "level-count", `${articles.length}`));
        levelButton.addEventListener("click", () => {
          if (state.collapsedLevels.has(levelKey)) {
            state.collapsedLevels.delete(levelKey);
          } else {
            state.collapsedLevels.add(levelKey);
          }
          renderLibrary();
        });
        levelSection.append(levelButton);

        if (!isLevelCollapsed) {
          articles.forEach((article) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `article-button${article.id === state.activeId ? " is-active" : ""}`;
            button.textContent = article.title;
            button.addEventListener("click", () => {
              state.activeId = article.id;
              render();
            });
            levelSection.append(button);
          });
        }

        topicContent.append(levelSection);
      });
    }

    topicSection.append(topicContent);
    elements.libraryTree.append(topicSection);
  });
}

function renderNotes(container, items) {
  container.replaceChildren();

  items.forEach((item) => {
    const note = document.createElement("article");
    note.className = "note-item";
    note.dataset.annotationId = item.id;
    note.tabIndex = 0;
    note.addEventListener("mouseenter", () => activateAnnotation(item.id));
    note.addEventListener("mouseleave", clearAnnotation);
    note.addEventListener("focus", () => activateAnnotation(item.id));
    note.addEventListener("blur", clearAnnotation);
    note.addEventListener("click", () => activateAnnotation(item.id, { scrollArticle: true }));
    note.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateAnnotation(item.id, { scrollArticle: true });
      }
    });

    const meta = document.createElement("div");
    meta.className = "note-meta";
    meta.append(createTextElement("span", `note-type note-type--${item.type}`, item.label));
    if (item.cefr) {
      meta.append(createTextElement("span", "note-level", `CEFR ${item.cefr}`));
    }

    note.append(meta);
    note.append(createTextElement("h3", "note-term", item.term));
    if (item.pronunciation || item.partOfSpeech) {
      note.append(
        createTextElement(
          "p",
          "note-pronunciation",
          [item.pronunciation, item.partOfSpeech].filter(Boolean).join("  ·  ")
        )
      );
    }
    if (item.definition) {
      const definition = createTextElement("p", "note-definition", item.definition);
      definition.lang = "en";
      note.append(definition);
    }
    if (item.note && item.type !== "vocabulary") {
      const context = document.createElement("p");
      context.className = "note-text";
      context.append(createTextElement("strong", "note-label", "语境 "));
      context.append(document.createTextNode(item.note));
      note.append(context);
    }
    if (item.example) {
      const example = document.createElement("p");
      example.className = "note-example";
      example.append(createTextElement("strong", "note-label", "Example "));
      example.append(document.createTextNode(item.example));
      note.append(example);
    }
    if (item.type === "vocabulary" && (item.chinese || item.note)) {
      const chinese = document.createElement("p");
      chinese.className = "note-chinese";
      chinese.append(createTextElement("strong", "note-label", "中文 "));
      chinese.append(document.createTextNode(item.chinese || item.note));
      note.append(chinese);
    }
    if (item.type === "vocabulary" && item.usage) {
      const usage = document.createElement("p");
      usage.className = "note-usage";
      usage.append(createTextElement("strong", "note-label", "用法 "));
      usage.append(document.createTextNode(item.usage));
      note.append(usage);
    }
    if (item.effect) {
      const effect = document.createElement("p");
      effect.className = "note-effect";
      effect.append(createTextElement("strong", "note-label", "作用 "));
      effect.append(document.createTextNode(item.effect));
      note.append(effect);
    }
    if (item.tryIt) {
      const tryIt = document.createElement("p");
      tryIt.className = "note-try";
      tryIt.append(createTextElement("strong", "note-label", "仿写 "));
      tryIt.append(document.createTextNode(item.tryIt));
      note.append(tryIt);
    }
    container.append(note);
  });
}

function renderArticle() {
  const article = state.articles.find((item) => item.id === state.activeId) ?? state.articles[0];
  if (!article) {
    return;
  }

  state.activeId = article.id;
  elements.articleTopic.textContent = article.topic;
  elements.articleLevel.textContent = `CEFR ${article.level}`;
  const wordCount = getArticleWordCount(article);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 180));
  elements.articleLength.textContent = `${wordCount} words · ${readingMinutes} min`;
  elements.articleSourceType.textContent = article.sourceType;
  elements.articleTitle.textContent = article.title;
  elements.articleDek.textContent = article.dek;
  elements.articleLevelFocus.textContent = article.levelFocus
    ? `${article.level} focus · ${article.levelFocus}`
    : "";
  elements.articleSource.textContent = `Source reference: ${article.sourceName}`;
  elements.articleSource.href = article.sourceUrl;
  elements.adaptationNote.textContent = article.adaptationNote;

  const studyItems = getStudyItems(article);
  elements.articleBody.replaceChildren();
  article.body.forEach((paragraph) => {
    elements.articleBody.append(createAnnotatedParagraph(paragraph, studyItems));
  });

  renderNotes(elements.orderedNoteList, sortStudyItemsByReadingOrder(article, studyItems));
}

function render() {
  renderLibrary();
  renderArticle();
}

async function loadArticles() {
  try {
    const response = await fetch("./data/articles.json");
    if (!response.ok) {
      throw new Error(`Failed to load articles: ${response.status}`);
    }

    const data = await response.json();
    state.articles = data.articles;
    state.activeId = data.articles[0]?.id ?? "";
    const activeArticle = data.articles[0];
    const topics = [...new Set(data.articles.map((article) => article.topic))];
    state.collapsedTopics = new Set(topics.filter((topic) => topic !== activeArticle?.topic));
    state.collapsedLevels = new Set(
      data.articles
        .map((article) => `${article.topic}::${article.level}`)
        .filter((key) => key !== `${activeArticle?.topic}::${activeArticle?.level}`)
    );
    render();
  } catch (error) {
    elements.libraryTree.replaceChildren(
      createTextElement("div", "empty-state", "Unable to load data/articles.json. Run this folder through a static server.")
    );
    elements.articleTitle.textContent = "Article data failed to load";
    elements.articleDek.textContent = error.message;
  }
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderLibrary();
});

elements.hideLibraryButton.addEventListener("click", () => {
  setLibraryHidden(true);
  elements.showLibraryButton.focus();
});

elements.showLibraryButton.addEventListener("click", () => {
  setLibraryHidden(false);
  elements.hideLibraryButton.focus();
});

setLibraryHidden(false);
loadArticles();
