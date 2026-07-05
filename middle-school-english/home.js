const THEME_KEY = "middle-school-english:theme";
const PROGRESS_PREFIX = "middle-school-english:progress:";

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

function renderProgress() {
  document.querySelectorAll("[data-progress]").forEach((element) => {
    try {
      const semester = element.dataset.progress;
      const records = JSON.parse(localStorage.getItem(`${PROGRESS_PREFIX}${semester}`) || "{}");
      const values = Object.values(records);
      if (values.length === 0) {
        element.textContent = "还未开始";
        return;
      }

      const mastered = values.filter((record) => (record.interval || 0) >= 7).length;
      element.textContent = `已接触 ${values.length} 词 · 熟悉 ${mastered} 词`;
    } catch {
      element.textContent = "学习记录待恢复";
    }
  });
}

applyTheme(resolveTheme());
document.querySelector("#themeButton")?.addEventListener("click", toggleTheme);
renderProgress();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
