(function () {
  "use strict";

  function gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(value, min = -1, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function generateDataset(type, count, noise) {
    const points = [];

    for (let i = 0; i < count; i += 1) {
      let x1 = Math.random() * 2 - 1;
      let x2 = Math.random() * 2 - 1;
      let y;

      if (type === "circle") {
        y = x1 * x1 + x2 * x2 < 0.43 ? 1 : 0;
      } else if (type === "diagonal") {
        y = x1 + x2 > 0 ? 1 : 0;
      } else {
        y = x1 * x2 > 0 ? 1 : 0;
      }

      x1 = clamp(x1 + gaussian() * noise * 0.28);
      x2 = clamp(x2 + gaussian() * noise * 0.28);

      if (Math.random() < noise * 0.22) y = 1 - y;
      points.push({ x: [x1, x2], y });
    }

    return points;
  }

  window.MLPData = { generateDataset };
})();

