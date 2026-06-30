(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const MAX_HIDDEN_LAYERS = 32;
  const MAX_NEURONS_PER_LAYER = 32;
  const state = {
    hiddenLayers: [4, 3],
    data: [],
  };

  const elements = {
    dataset: $("#datasetSelect"),
    sampleCount: $("#sampleCount"),
    sampleCountOutput: $("#sampleCountOutput"),
    learningRate: $("#learningRate"),
    learningRateOutput: $("#learningRateOutput"),
    optimizer: $("#optimizerSelect"),
    lossFunction: $("#lossFunctionSelect"),
    noise: $("#noiseLevel"),
    noiseOutput: $("#noiseLevelOutput"),
    layerEditor: $("#layerEditor"),
    addLayer: $("#addLayerButton"),
    generate: $("#generateButton"),
    regenerate: $("#previewRegenerateButton"),
    summary: $("#architectureSummary"),
    canvas: $("#setupDataCanvas"),
  };

  function updateRangeFill(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const ratio = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(90deg, var(--blue) ${ratio}%, #ddddda ${ratio}%)`;
  }

  function renderLayerEditor() {
    const chunks = ['<div class="layer-pill"><span>输入层</span><strong>2</strong></div>'];
    state.hiddenLayers.forEach((count, index) => {
      chunks.push('<span class="architecture-arrow">→</span>');
      chunks.push(`
        <div class="layer-pill hidden" data-layer="${index}">
          <span>隐藏 ${index + 1}</span>
          <div class="pill-controls">
            <button class="mini-control" data-action="decrease" aria-label="减少第 ${index + 1} 个隐藏层的神经元">−</button>
            <strong>${count}</strong>
            <button class="mini-control" data-action="increase" aria-label="增加第 ${index + 1} 个隐藏层的神经元">＋</button>
            <button class="mini-control remove" data-action="remove" aria-label="删除第 ${index + 1} 个隐藏层">×</button>
          </div>
        </div>
      `);
    });
    chunks.push('<span class="architecture-arrow">→</span>');
    chunks.push('<div class="layer-pill"><span>输出层</span><strong>1</strong></div>');
    elements.layerEditor.innerHTML = chunks.join("");
    elements.summary.textContent = [2, ...state.hiddenLayers, 1].join(" → ");
    elements.addLayer.disabled = state.hiddenLayers.length >= MAX_HIDDEN_LAYERS;
    elements.addLayer.title = elements.addLayer.disabled ? "已达到 32 个隐藏层" : "增加隐藏层";
  }

  function regenerateData() {
    state.data = window.MLPData.generateDataset(
      elements.dataset.value,
      Number(elements.sampleCount.value),
      Number(elements.noise.value)
    );
    drawPreview();
  }

  function drawPreview() {
    const canvas = elements.canvas;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const margin = 32;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fafaf8";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#e2e2de";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i += 1) {
      const x = margin + ((width - margin * 2) * i) / 4;
      const y = margin + ((height - margin * 2) * i) / 4;
      ctx.beginPath(); ctx.moveTo(x, margin); ctx.lineTo(x, height - margin); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(width - margin, y); ctx.stroke();
    }

    state.data.forEach((point) => {
      const x = margin + ((point.x[0] + 1) / 2) * (width - margin * 2);
      const y = height - margin - ((point.x[1] + 1) / 2) * (height - margin * 2);
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = point.y === 1 ? "#10a37f" : "#d97745";
      ctx.globalAlpha = 0.82;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function saveAndGenerate() {
    const config = {
      dataset: elements.dataset.value,
      sampleCount: Number(elements.sampleCount.value),
      learningRate: Number(elements.learningRate.value),
      optimizer: elements.optimizer.value,
      lossFunction: elements.lossFunction.value,
      batchSize: 1,
      noise: Number(elements.noise.value),
      hiddenLayers: state.hiddenLayers.slice(),
      data: state.data,
    };
    sessionStorage.setItem("mlpExperiment", JSON.stringify(config));
    window.location.href = "./demo.html";
  }

  elements.layerEditor.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const pill = button.closest("[data-layer]");
    const index = Number(pill.dataset.layer);
    const action = button.dataset.action;
    if (action === "increase") {
      state.hiddenLayers[index] = Math.min(
        MAX_NEURONS_PER_LAYER,
        state.hiddenLayers[index] + 1
      );
    }
    if (action === "decrease") state.hiddenLayers[index] = Math.max(1, state.hiddenLayers[index] - 1);
    if (action === "remove" && state.hiddenLayers.length > 1) state.hiddenLayers.splice(index, 1);
    renderLayerEditor();
  });

  elements.addLayer.addEventListener("click", () => {
    if (state.hiddenLayers.length >= MAX_HIDDEN_LAYERS) return;
    state.hiddenLayers.push(3);
    renderLayerEditor();
  });

  try {
    const saved = JSON.parse(sessionStorage.getItem("mlpExperiment"));
    if (saved) {
      if (saved.dataset) elements.dataset.value = saved.dataset;
      if (saved.sampleCount) elements.sampleCount.value = String(saved.sampleCount);
      if (saved.optimizer) {
        elements.optimizer.value = saved.optimizer;
        if (saved.learningRate) elements.learningRate.value = String(saved.learningRate);
      } else {
        elements.optimizer.value = "adam";
        elements.learningRate.value = "0.03";
      }
      if (saved.lossFunction) elements.lossFunction.value = saved.lossFunction;
      if (saved.noise !== undefined) elements.noise.value = String(saved.noise);
      if (Array.isArray(saved.hiddenLayers) && saved.hiddenLayers.length) {
        state.hiddenLayers = saved.hiddenLayers
          .slice(0, MAX_HIDDEN_LAYERS)
          .map((value) => Math.max(1, Math.min(MAX_NEURONS_PER_LAYER, Number(value))));
      }
      elements.sampleCountOutput.textContent = Number(elements.sampleCount.value).toFixed(0);
      elements.learningRateOutput.textContent = Number(elements.learningRate.value).toFixed(3);
      elements.noiseOutput.textContent = Number(elements.noise.value).toFixed(2);
    }
  } catch (error) {
    // Ignore invalid saved experiments and keep the safe defaults.
  }

  [
    [elements.sampleCount, elements.sampleCountOutput, 0],
    [elements.learningRate, elements.learningRateOutput, 3],
    [elements.noise, elements.noiseOutput, 2],
  ].forEach(([input, output, digits]) => {
    input.addEventListener("input", () => {
      output.textContent = Number(input.value).toFixed(digits);
      updateRangeFill(input);
      if (input !== elements.learningRate) regenerateData();
    });
    updateRangeFill(input);
  });

  elements.dataset.addEventListener("change", regenerateData);
  elements.optimizer.addEventListener("change", () => {
    const recommendedRates = { adam: 0.03, momentum: 0.12, sgd: 0.18 };
    elements.learningRate.value = String(recommendedRates[elements.optimizer.value]);
    elements.learningRateOutput.textContent = Number(elements.learningRate.value).toFixed(3);
    updateRangeFill(elements.learningRate);
  });
  elements.regenerate.addEventListener("click", regenerateData);
  elements.generate.addEventListener("click", saveAndGenerate);

  renderLayerEditor();
  regenerateData();
})();
