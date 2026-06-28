(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const svgNS = "http://www.w3.org/2000/svg";
  const OPTIMIZER_NAMES = { adam: "Adam", momentum: "Momentum", sgd: "SGD" };
  const LOSS_NAMES = { mse: "MSE", bce: "BCE" };
  const DATASET_NAMES = {
    xor: "XOR 四象限",
    circle: "圆内 / 圆外",
    diagonal: "对角分割",
  };
  const defaultConfig = {
    dataset: "xor",
    sampleCount: 48,
    learningRate: 0.03,
    optimizer: "adam",
    lossFunction: "mse",
    batchSize: 1,
    noise: 0.1,
    hiddenLayers: [4, 3],
    data: null,
  };
  let savedConfig = null;
  try {
    savedConfig = JSON.parse(sessionStorage.getItem("mlpExperiment"));
  } catch (error) {
    savedConfig = null;
  }
  const config = { ...defaultConfig, ...(savedConfig || {}) };
  if (savedConfig && !savedConfig.optimizer) {
    config.optimizer = "adam";
    config.learningRate = 0.03;
  }
  config.hiddenLayers = Array.isArray(config.hiddenLayers) && config.hiddenLayers.length
    ? config.hiddenLayers
      .slice(0, 32)
      .map((value) => Math.max(1, Math.min(32, Number(value))))
    : defaultConfig.hiddenLayers.slice();
  if (!LOSS_NAMES[config.lossFunction]) config.lossFunction = "mse";
  config.batchSize = Math.max(1, Math.min(256, Math.floor(Number(config.batchSize) || 1)));

  const state = {
    config,
    data: Array.isArray(config.data) && config.data.length ? config.data : [],
    network: null,
    sampleIndex: 0,
    trainStep: 0,
    processedSamples: 0,
    batchProgress: 0,
    lastUpdateApplied: false,
    stageIndex: -1,
    stages: [],
    lossWindow: [],
    lossWindowSum: 0,
    accuracyWindow: [],
    accuracyWindowSum: 0,
    metricHistory: [],
    metricRecordStride: 1,
    currentAverageLoss: null,
    currentAverageAccuracy: null,
    parameterHistory: { weights: {}, biases: {} },
    currentLoss: null,
    playing: false,
    timer: null,
    fastRenderCounter: 0,
    parameterRecordStride: 1,
    selected: null,
  };

  const elements = {
    reset: $("#resetButton"),
    next: $("#nextButton"),
    play: $("#playButton"),
    speed: $("#speedSelect"),
    networkSvg: $("#networkSvg"),
    phaseRail: $("#phaseRail"),
    stepBadge: $("#stepBadge"),
    stepTitle: $("#stepTitle"),
    stepDescription: $("#stepDescription"),
    stepFormula: $("#stepFormula"),
    sampleMetric: $("#sampleMetric"),
    predictionMetric: $("#predictionMetric"),
    lossMetric: $("#lossMetric"),
    dataCanvas: $("#dataCanvas"),
    lossCanvas: $("#lossCanvas"),
    parameterCanvas: $("#parameterCanvas"),
    averageLoss: $("#averageLoss"),
    lossAverageLabel: $("#lossAverageLabel"),
    averageAccuracy: $("#averageAccuracy"),
    accuracyAverageLabel: $("#accuracyAverageLabel"),
    parameterHistoryLabel: $("#parameterHistoryLabel"),
    parameterHistoryValue: $("#parameterHistoryValue"),
    inspector: $("#inspectorContent"),
    summaryDataset: $("#summaryDataset"),
    summaryArchitecture: $("#summaryArchitecture"),
    summaryLearningRate: $("#summaryLearningRate"),
    summaryOptimizer: $("#summaryOptimizer"),
    summaryLossFunction: $("#summaryLossFunction"),
    summarySamples: $("#summarySamples"),
    networkOptimizerBadge: $("#networkOptimizerBadge"),
    networkLossBadge: $("#networkLossBadge"),
    networkSampleBadge: $("#networkSampleBadge"),
    chartOptimizer: $("#chartOptimizer"),
    chartLossFunction: $("#chartLossFunction"),
    chartBatchSize: $("#chartBatchSize"),
  };

  function format(value, digits = 4) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    const abs = Math.abs(value);
    if (abs !== 0 && abs < 0.0001) return value.toExponential(2);
    return value.toFixed(digits);
  }

  function htmlNotation(symbol, superscript, subscript = "") {
    return `<span class="math-notation"><span class="math-base">${symbol}</span><span class="math-scripts"><sup>${superscript}</sup>${subscript ? `<sub>${subscript}</sub>` : ""}</span></span>`;
  }

  function appendSvgNotation(container, {
    symbol,
    superscript,
    subscript = "",
    value = "",
    baseX,
    scriptsX,
    valueX,
    y,
    className,
  }) {
    const base = makeSvg("text", { x: baseX, y, class: `${className} notation-base` });
    base.textContent = symbol;
    container.appendChild(base);

    const upper = makeSvg("text", { x: scriptsX, y: y - 4, class: `${className} notation-script notation-sup` });
    upper.textContent = superscript;
    container.appendChild(upper);

    if (subscript) {
      const lower = makeSvg("text", { x: scriptsX, y: y + 4, class: `${className} notation-script notation-sub` });
      lower.textContent = subscript;
      container.appendChild(lower);
    }

    if (value !== "") {
      const valueText = makeSvg("text", { x: valueX, y, class: `${className} notation-value` });
      valueText.textContent = value;
      container.appendChild(valueText);
    }
  }

  function weightKey(layer, target, source) {
    return `${layer}:${target}:${source}`;
  }

  function biasKey(layer, neuron) {
    return `${layer}:${neuron}`;
  }

  function initializeParameterHistory() {
    state.parameterHistory = { weights: {}, biases: {} };
    for (let layer = 1; layer < state.network.sizes.length; layer += 1) {
      for (let target = 0; target < state.network.sizes[layer]; target += 1) {
        state.parameterHistory.biases[biasKey(layer, target)] = [
          { step: 0, value: state.network.biases[layer][target] },
        ];
        for (let source = 0; source < state.network.sizes[layer - 1]; source += 1) {
          state.parameterHistory.weights[weightKey(layer, target, source)] = [
            { step: 0, value: state.network.weights[layer][target][source] },
          ];
        }
      }
    }
  }

  function recordParameterSnapshot() {
    const representative = state.parameterHistory.biases[biasKey(1, 0)];
    if (representative && representative[representative.length - 1].step === state.trainStep) return;
    for (let layer = 1; layer < state.network.sizes.length; layer += 1) {
      for (let target = 0; target < state.network.sizes[layer]; target += 1) {
        state.parameterHistory.biases[biasKey(layer, target)].push({
          step: state.trainStep,
          value: state.network.biases[layer][target],
        });
        for (let source = 0; source < state.network.sizes[layer - 1]; source += 1) {
          state.parameterHistory.weights[weightKey(layer, target, source)].push({
            step: state.trainStep,
            value: state.network.weights[layer][target][source],
          });
        }
      }
    }
  }

  function recordLoss(loss, prediction, target) {
    const windowSize = state.data.length;
    const windowIndex = state.processedSamples % windowSize;
    if (state.lossWindow.length === windowSize) {
      state.lossWindowSum -= state.lossWindow[windowIndex];
      state.lossWindow[windowIndex] = loss;
    } else {
      state.lossWindow.push(loss);
    }
    state.lossWindowSum += loss;

    const correct = Number((prediction >= 0.5 ? 1 : 0) === target);
    if (state.accuracyWindow.length === windowSize) {
      state.accuracyWindowSum -= state.accuracyWindow[windowIndex];
      state.accuracyWindow[windowIndex] = correct;
    } else {
      state.accuracyWindow.push(correct);
    }
    state.accuracyWindowSum += correct;
    state.currentAverageLoss = state.lossWindowSum / state.lossWindow.length;
    state.currentAverageAccuracy = state.accuracyWindowSum / state.accuracyWindow.length;

    const sampleNumber = state.processedSamples + 1;
    if (sampleNumber === 1 || sampleNumber % state.metricRecordStride === 0) {
      state.metricHistory.push({
        step: sampleNumber,
        loss: state.currentAverageLoss,
        accuracy: state.currentAverageAccuracy,
      });
      if (state.metricHistory.length > 4000) {
        const compacted = [state.metricHistory[0]];
        for (let index = 2; index < state.metricHistory.length - 1; index += 2) {
          compacted.push(state.metricHistory[index]);
        }
        compacted.push(state.metricHistory[state.metricHistory.length - 1]);
        state.metricHistory = compacted;
      }
    }
  }

  function makeSvg(tag, attributes = {}) {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function buildStages() {
    const last = state.network.sizes.length - 1;
    const stages = [{
      type: "input",
      layer: 0,
      badge: "INPUT",
      title: "装载特征 x 与真实标签 y",
      description: "两个特征进入输入层；真实标签立即显示在网络最右侧，稍后会与预测 ŷ 一起计算 Loss。",
      formula: "训练样本 = (x, y)  ·  a⁽⁰⁾ = x",
    }];

    for (let layer = 1; layer <= last; layer += 1) {
      const isOutput = layer === last;
      stages.push({
        type: "forward",
        layer,
        badge: "FORWARD",
        title: isOutput ? "计算输出层的预测" : `计算隐藏层 ${layer}`,
        description: "每个神经元先做加权求和，再经过 Sigmoid 激活函数。",
        formula: `z⁽${layer}⁾ = W⁽${layer}⁾a⁽${layer - 1}⁾ + b⁽${layer}⁾  ·  a⁽${layer}⁾ = σ(z⁽${layer}⁾)`,
      });
    }

    const usesBce = state.network.lossFunction === "bce";
    stages.push({
      type: "loss",
      layer: last,
      badge: "LOSS",
      title: "衡量预测与真实标签的差距",
      description: usesBce
        ? "这里使用二元交叉熵，直接衡量二分类预测概率与真实标签的差距。"
        : "这里使用平方误差。Loss 越接近 0，表示这一个样本预测得越准。",
      formula: usesBce
        ? "L = −[y ln(ŷ) + (1−y) ln(1−ŷ)]"
        : "L = ½(ŷ − y)²",
    });

    for (let layer = last; layer >= 1; layer -= 1) {
      stages.push({
        type: "backward",
        layer,
        badge: "BACKWARD",
        title: layer === last ? "计算输出层梯度" : `将梯度传回隐藏层 ${layer}`,
        description: "链式法则把误差信号逐层传回；节点显示 ∂L/∂z，连线携带 ∂L/∂w。",
        formula: layer === last
          ? usesBce
            ? `δ⁽${layer}⁾ = ŷ − y`
            : `δ⁽${layer}⁾ = (ŷ − y) · σ′(z⁽${layer}⁾)`
          : `δ⁽${layer}⁾ = (W⁽${layer + 1}⁾ᵀδ⁽${layer + 1}⁾) ⊙ σ′(z⁽${layer}⁾)`,
      });
    }

    stages.push({
      type: "update",
      layer: null,
      badge: "UPDATE",
      title: `累积梯度，并按 Batch 使用 ${OPTIMIZER_NAMES[state.network.optimizer]} 更新`,
      description: state.config.batchSize > 1
        ? `每 ${state.config.batchSize} 个样本取一次平均梯度；一轮末尾不足一个 Batch 时使用剩余样本。`
        : "Batch Size 为 1，每个样本完成后立即更新全部 W 与 B。",
      formula: state.network.optimizer === "adam"
        ? "g_batch = mean(g₁…gₙ)  ·  m,v → 偏差修正 → Δθ"
        : state.network.optimizer === "momentum"
          ? "g_batch = mean(g₁…gₙ)  ·  v ← 0.9v + g_batch"
          : "g_batch = mean(g₁…gₙ)  ·  θ ← θ − ηg_batch",
    });

    state.stages = stages;
    elements.phaseRail.innerHTML = stages.map((_, i) => `<span class="phase-segment" data-phase="${i}"></span>`).join("");
  }

  function updateExperimentSummary() {
    const optimizerName = OPTIMIZER_NAMES[state.network.optimizer] || state.network.optimizer;
    elements.summaryDataset.textContent = DATASET_NAMES[state.config.dataset] || state.config.dataset;
    elements.summaryArchitecture.textContent = [2, ...state.config.hiddenLayers, 1].join(" → ");
    elements.summaryLearningRate.textContent = format(Number(state.network.learningRate), 3);
    elements.summaryOptimizer.textContent = optimizerName;
    elements.summaryLossFunction.textContent = LOSS_NAMES[state.network.lossFunction];
    elements.summarySamples.textContent = String(state.data.length);
    elements.networkOptimizerBadge.textContent = `${optimizerName} · η=${format(state.network.learningRate, 3)}`;
    elements.networkLossBadge.textContent = LOSS_NAMES[state.network.lossFunction];
    elements.networkSampleBadge.textContent = `${state.sampleIndex + 1} / ${state.data.length}`;
    elements.chartOptimizer.textContent = optimizerName;
    elements.chartLossFunction.textContent = LOSS_NAMES[state.network.lossFunction];
    elements.chartBatchSize.textContent = String(state.config.batchSize);
    elements.lossAverageLabel.textContent = `最近 ${state.data.length} 个样本平均 Loss`;
    elements.accuracyAverageLabel.textContent = `最近 ${state.data.length} 个样本准确率`;
  }

  function rebuild() {
    stopPlaying();
    if (state.data.length === 0) {
      state.data = window.MLPData.generateDataset(
        state.config.dataset,
        Number(state.config.sampleCount),
        Number(state.config.noise)
      );
    }
    state.network = new window.MLP(
      [2, ...state.config.hiddenLayers, 1],
      Number(state.config.learningRate),
      state.config.optimizer,
      state.config.lossFunction
    );
    state.sampleIndex = 0;
    state.trainStep = 0;
    state.processedSamples = 0;
    state.batchProgress = 0;
    state.lastUpdateApplied = false;
    state.stageIndex = -1;
    state.lossWindow = [];
    state.lossWindowSum = 0;
    state.accuracyWindow = [];
    state.accuracyWindowSum = 0;
    state.metricHistory = [];
    state.metricRecordStride = 1;
    state.currentAverageLoss = null;
    state.currentAverageAccuracy = null;
    state.parameterRecordStride = 1;
    initializeParameterHistory();
    state.currentLoss = null;
    state.selected = null;
    updateExperimentSummary();
    buildStages();
    renderNetwork();
    drawData();
    drawLoss();
    drawParameterHistory();
    updateConsole(null);
    renderInspector();
  }

  function getNodePositions() {
    const sizes = state.network.sizes;
    const width = Math.max(900, sizes.length * 190 + 90);
    const largestLayer = Math.max(...sizes);
    const neuronSpacing = 70;
    const height = Math.max(620, 140 + (largestLayer - 1) * neuronSpacing);
    const side = 78;
    const targetSpace = 150;
    const usableWidth = width - side - targetSpace;
    const positions = sizes.map((size, layer) => {
      const x = side + (usableWidth * layer) / Math.max(1, sizes.length - 1);
      const total = neuronSpacing * (size - 1);
      return Array.from({ length: size }, (_, neuron) => ({
        x,
        y: height / 2 - total / 2 + neuron * neuronSpacing,
      }));
    });
    return { width, height, positions };
  }

  function getNodeValue(layer, neuron, stage) {
    if (!stage) return { value: 0, label: layer === 0 ? `x${neuron + 1}` : `n${neuron + 1}` };
    if (stage.type === "backward" && layer === stage.layer) {
      return { value: state.network.deltas[layer][neuron], label: "grad" };
    }
    if (layer === 0 || layer <= getMaxForwardLayer()) {
      return { value: state.network.activations[layer][neuron], label: layer === 0 ? `x${neuron + 1}` : "act" };
    }
    return { value: 0, label: `n${neuron + 1}` };
  }

  function getMaxForwardLayer() {
    if (state.stageIndex < 0) return -1;
    let max = 0;
    for (let i = 0; i <= state.stageIndex; i += 1) {
      if (state.stages[i].type === "forward") max = Math.max(max, state.stages[i].layer);
    }
    return max;
  }

  function getVisualProgress() {
    const forwardLayers = new Set();
    const backwardLayers = new Set();
    for (let i = 0; i <= state.stageIndex; i += 1) {
      const stage = state.stages[i];
      if (stage.type === "forward") forwardLayers.add(stage.layer);
      if (stage.type === "backward") backwardLayers.add(stage.layer);
      if (stage.type === "update") {
        for (let layer = 1; layer < state.network.sizes.length; layer += 1) {
          backwardLayers.add(layer);
        }
      }
    }
    return { forwardLayers, backwardLayers };
  }

  function isBackwardView() {
    const stage = state.stages[state.stageIndex];
    return Boolean(stage && (stage.type === "backward" || stage.type === "update"));
  }

  function renderNetwork() {
    const stage = state.stages[state.stageIndex] || null;
    const { forwardLayers, backwardLayers } = getVisualProgress();
    const { width, height, positions } = getNodePositions();
    const svg = elements.networkSvg;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.minWidth = `${Math.max(820, state.network.sizes.length * 160 + 180)}px`;
    svg.style.height = `${height}px`;
    svg.innerHTML = "";

    const edgeGroup = makeSvg("g", { class: "edges" });
    const edgeLabelGroup = makeSvg("g", { class: "edge-labels" });
    for (let layer = 1; layer < state.network.sizes.length; layer += 1) {
      for (let target = 0; target < state.network.sizes[layer]; target += 1) {
        for (let source = 0; source < state.network.sizes[layer - 1]; source += 1) {
          const from = positions[layer - 1][source];
          const to = positions[layer][target];
          const classNames = ["edge"];
          if (forwardLayers.has(layer)) classNames.push("forward-done");
          if (stage && stage.type === "forward" && stage.layer === layer) classNames.push("forward-current");
          if (backwardLayers.has(layer)) classNames.push("backward-done");
          if (stage && stage.type === "backward" && stage.layer === layer) classNames.push("backward-current");
          if (stage && stage.type === "update" && state.lastUpdateApplied) {
            classNames.push(state.network.weightUpdates[layer][target][source] >= 0 ? "updating-positive" : "updating-negative");
          }
          const edge = makeSvg("line", {
            x1: from.x + 19, y1: from.y, x2: to.x - 19, y2: to.y,
            class: classNames.join(" "),
            "data-layer": layer, "data-source": source, "data-target": target,
          });
          edge.addEventListener("click", () => {
            state.selected = { type: "edge", layer, source, target };
            renderInspector();
          });
          edgeGroup.appendChild(edge);

          const edgeIndex = target * state.network.sizes[layer - 1] + source;
          const edgeCount = state.network.sizes[layer] * state.network.sizes[layer - 1];
          const ratio = 0.27 + (0.46 * (edgeIndex + 0.5)) / edgeCount;
          const midX = from.x + (to.x - from.x) * ratio;
          const midY = from.y + (to.y - from.y) * ratio;
          const labelClassNames = ["edge-weight-label"];
          if (classNames.includes("forward-done")) labelClassNames.push("forward-done");
          if (classNames.includes("forward-current")) labelClassNames.push("forward-current");
          if (classNames.includes("backward-done")) labelClassNames.push("backward-done");
          if (classNames.includes("backward-current")) labelClassNames.push("backward-current");
          if (classNames.includes("updating-positive")) labelClassNames.push("updating-positive");
          if (classNames.includes("updating-negative")) labelClassNames.push("updating-negative");
          const weightGroup = makeSvg("g", {
            class: labelClassNames.join(" "),
            transform: `translate(${midX} ${midY})`,
            role: "button",
            tabindex: "0",
            "data-layer": layer,
            "data-source": source,
            "data-target": target,
            "aria-label": `权重 ${source + 1} 到 ${target + 1}，值 ${format(state.network.weights[layer][target][source], 3)}`,
          });
          weightGroup.appendChild(makeSvg("rect", { x: -30, y: -7, width: 60, height: 14, rx: 4 }));
          appendSvgNotation(weightGroup, {
            symbol: "w",
            superscript: layer,
            subscript: `${target + 1},${source + 1}`,
            value: format(state.network.weights[layer][target][source], 2),
            baseX: -24,
            scriptsX: -18,
            valueX: 9,
            y: 2.7,
            className: "weight-notation",
          });
          weightGroup.addEventListener("click", () => {
            state.selected = { type: "edge", layer, source, target };
            renderInspector();
          });
          edgeLabelGroup.appendChild(weightGroup);
        }
      }
    }
    svg.appendChild(edgeGroup);
    svg.appendChild(edgeLabelGroup);

    state.network.sizes.forEach((size, layer) => {
      const heading = layer === 0 ? "INPUT" : layer === state.network.sizes.length - 1 ? "OUTPUT" : `HIDDEN ${layer}`;
      const label = makeSvg("text", { x: positions[layer][0].x, y: 27, class: "layer-label" });
      label.textContent = heading;
      svg.appendChild(label);
      const count = makeSvg("text", { x: positions[layer][0].x, y: 42, class: "layer-count" });
      count.textContent = `${size} NEURON${size > 1 ? "S" : ""}`;
      svg.appendChild(count);

      positions[layer].forEach((position, neuron) => {
        const info = getNodeValue(layer, neuron, stage);
        const active = stage && stage.layer === layer;
        const classes = ["node"];
        if (active) classes.push("active");
        if (layer <= getMaxForwardLayer() || (stage && stage.type === "backward" && layer === stage.layer) || (stage && stage.type === "input" && layer === 0)) {
          classes.push(info.value >= 0 ? "positive" : "negative");
        }
        const group = makeSvg("g", {
          class: classes.join(" "),
          transform: `translate(${position.x} ${position.y})`,
          "data-layer": layer, "data-neuron": neuron,
        });
        group.appendChild(makeSvg("circle", { r: 19 }));
        const valueText = makeSvg("text", { y: 1 });
        valueText.textContent = (layer <= getMaxForwardLayer() || active) ? format(info.value, 2) : "·";
        group.appendChild(valueText);
        appendSvgNotation(group, {
          symbol: layer === 0 ? "x" : stage && stage.type === "backward" && stage.layer === layer ? "δ" : "a",
          superscript: layer === 0 ? state.sampleIndex + 1 : layer,
          subscript: neuron + 1,
          baseX: -4,
          scriptsX: 2,
          valueX: 0,
          y: 11,
          className: "node-label",
        });
        group.addEventListener("click", () => {
          state.selected = { type: "node", layer, neuron };
          renderInspector();
        });
        svg.appendChild(group);

        if (layer > 0) {
          const biasGroup = makeSvg("g", {
            class: `bias-label${active ? " active" : ""}${backwardLayers.has(layer) ? " backward-done" : forwardLayers.has(layer) ? " forward-done" : ""}`,
            transform: `translate(${position.x + 27} ${position.y - 23})`,
            role: "button",
            tabindex: "0",
            "data-layer": layer,
            "data-neuron": neuron,
            "aria-label": `第 ${layer} 层神经元 ${neuron + 1} 的偏置`,
          });
          biasGroup.appendChild(makeSvg("rect", { x: -3, y: -8, width: 59, height: 15, rx: 5 }));
          appendSvgNotation(biasGroup, {
            symbol: "b",
            superscript: layer,
            subscript: neuron + 1,
            value: format(state.network.biases[layer][neuron], 2),
            baseX: 4,
            scriptsX: 10,
            valueX: 36,
            y: 2.5,
            className: "bias-notation",
          });
          biasGroup.addEventListener("click", () => {
            state.selected = { type: "bias", layer, neuron };
            renderInspector();
          });
          svg.appendChild(biasGroup);
        }
      });
    });

    if (state.stageIndex >= 0) {
      const outputLayer = positions.length - 1;
      const output = positions[outputLayer][0];
      const targetX = output.x + 92;
      const sample = state.data[state.sampleIndex];
      svg.appendChild(makeSvg("line", {
        x1: output.x + 25,
        y1: output.y,
        x2: targetX - 36,
        y2: output.y,
        class: `target-relation${stage && stage.type === "loss" ? " active" : ""}${isBackwardView() ? " backward" : ""}`,
      }));

      const targetGroup = makeSvg("g", {
        class: `target-label${stage && stage.type === "loss" ? " active" : ""}${isBackwardView() ? " backward" : ""}`,
        transform: `translate(${targetX} ${output.y})`,
        role: "button",
        tabindex: "0",
        "aria-label": `当前样本真实标签 ${sample.y}`,
      });
      targetGroup.appendChild(makeSvg("rect", { x: -36, y: -28, width: 72, height: 56, rx: 12 }));
      const targetTitle = makeSvg("text", { y: -8, class: "target-title" });
      targetTitle.textContent = "真实标签";
      targetGroup.appendChild(targetTitle);
      appendSvgNotation(targetGroup, {
        symbol: "y",
        superscript: state.sampleIndex + 1,
        value: `= ${sample.y}`,
        baseX: -12,
        scriptsX: -6,
        valueX: 11,
        y: 13,
        className: "target-value",
      });
      targetGroup.addEventListener("click", () => {
        state.selected = { type: "target" };
        renderInspector();
      });
      svg.appendChild(targetGroup);
    }
  }

  function executeStage(stage) {
    const sample = state.data[state.sampleIndex];
    if (stage.type === "input") {
      state.network.setInput(sample.x);
      state.currentLoss = null;
    } else if (stage.type === "forward") {
      state.network.forwardLayer(stage.layer);
    } else if (stage.type === "loss") {
      state.currentLoss = state.network.loss(sample.y);
    } else if (stage.type === "backward") {
      state.network.backwardLayer(stage.layer, sample.y);
    } else if (stage.type === "update") {
      state.network.accumulateGradients();
      state.batchProgress += 1;
      const prediction = state.network.activations[state.network.sizes.length - 1][0];
      recordLoss(state.currentLoss, prediction, sample.y);
      state.processedSamples += 1;
      const endOfEpoch = state.sampleIndex === state.data.length - 1;
      state.lastUpdateApplied =
        state.batchProgress >= state.config.batchSize || endOfEpoch;
      if (state.lastUpdateApplied) {
        state.network.applyAccumulatedGradients(state.batchProgress);
        state.batchProgress = 0;
        state.trainStep += 1;
        if (state.trainStep % state.parameterRecordStride === 0) {
          recordParameterSnapshot();
        }
      }
    }
  }

  function renderStage(stage) {
    updateConsole(stage);
    renderNetwork();
    drawData();
    drawLoss();
    drawParameterHistory();
    if (state.selected) renderInspector();
  }

  function advanceStage({ render = true } = {}) {
    state.stageIndex += 1;
    if (state.stageIndex >= state.stages.length) {
      state.stageIndex = 0;
      state.sampleIndex = (state.sampleIndex + 1) % state.data.length;
      if (state.sampleIndex === 0) shuffle(state.data);
    }

    const stage = state.stages[state.stageIndex];
    executeStage(stage);
    if (render) renderStage(stage);
    return stage;
  }

  function nextStage() {
    advanceStage();
  }

  function completeOneTrainingSample({ fullRender = true, renderCharts = true } = {}) {
    const startingSampleCount = state.processedSamples;
    let finalStage = null;
    let guard = 0;
    do {
      finalStage = advanceStage({ render: false });
      guard += 1;
    } while (
      state.processedSamples === startingSampleCount
      && guard <= state.stages.length + 1
    );
    if (fullRender) {
      renderStage(finalStage);
    } else if (renderCharts) {
      drawLoss();
      elements.networkSampleBadge.textContent = `${state.sampleIndex + 1} / ${state.data.length}`;
      if (state.selected && (state.selected.type === "edge" || state.selected.type === "bias")) {
        drawParameterHistory();
      }
    }
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function updateConsole(stage) {
    const sample = state.data[state.sampleIndex];
    const prediction = state.network && getMaxForwardLayer() === state.network.sizes.length - 1
      ? state.network.activations[state.network.sizes.length - 1][0]
      : null;

    elements.stepBadge.textContent = stage ? stage.badge : "准备";
    elements.stepTitle.textContent = stage ? stage.title : "点击“下一步”装载第一个训练样本";
    elements.stepDescription.textContent = stage
      ? stage.description
      : "全部权重 w 与偏置 b 已显示。每次点击只推进一个可观察的计算阶段。";
    if (stage && stage.type === "update") {
      elements.stepTitle.textContent = state.lastUpdateApplied
        ? `${OPTIMIZER_NAMES[state.network.optimizer]} 已完成一次 Batch 更新`
        : `正在累积 Batch 梯度 · ${state.batchProgress} / ${state.config.batchSize}`;
      elements.stepDescription.textContent = state.lastUpdateApplied
        ? "本批样本的平均梯度已用于更新全部 W 与 B。"
        : "当前样本的梯度已经加入 Batch，尚未修改参数。";
    }
    if (stage && stage.type === "input") {
      elements.stepFormula.innerHTML = `样本 #${state.sampleIndex + 1}: (${htmlNotation("x", state.sampleIndex + 1, 1)}, ${htmlNotation("x", state.sampleIndex + 1, 2)}, ${htmlNotation("y", state.sampleIndex + 1)})`;
    } else {
      elements.stepFormula.textContent = stage ? stage.formula : "x, y → forward → loss → backward → update";
    }
    elements.sampleMetric.innerHTML = stage
      ? `#${state.sampleIndex + 1} · ${htmlNotation("y", state.sampleIndex + 1)}=${sample.y}`
      : "—";
    elements.predictionMetric.textContent = prediction === null ? "—" : format(prediction);
    elements.lossMetric.textContent = state.currentLoss === null ? "—" : format(state.currentLoss);
    elements.networkSampleBadge.textContent = `${state.sampleIndex + 1} / ${state.data.length}`;
    document.body.classList.toggle("backward-stage", Boolean(stage && (stage.type === "backward" || stage.type === "update")));

    [...elements.phaseRail.children].forEach((segment, index) => {
      segment.classList.toggle("done", state.stageIndex >= 0 && index < state.stageIndex);
      segment.classList.toggle("current", index === state.stageIndex);
    });
  }

  function drawGrid(ctx, width, height, margin) {
    ctx.strokeStyle = "#e2e2de";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const x = margin + ((width - margin * 2) * i) / 4;
      const y = margin + ((height - margin * 2) * i) / 4;
      ctx.beginPath(); ctx.moveTo(x, margin); ctx.lineTo(x, height - margin); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(width - margin, y); ctx.stroke();
    }
  }

  function drawData() {
    const canvas = elements.dataCanvas;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const margin = 24;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fafaf8";
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height, margin);

    state.data.forEach((point, index) => {
      const x = margin + ((point.x[0] + 1) / 2) * (width - margin * 2);
      const y = height - margin - ((point.x[1] + 1) / 2) * (height - margin * 2);
      ctx.beginPath();
      ctx.arc(x, y, index === state.sampleIndex && state.stageIndex >= 0 ? 8 : 5.2, 0, Math.PI * 2);
      ctx.fillStyle = point.y === 1 ? "#10a37f" : "#d97745";
      ctx.globalAlpha = index === state.sampleIndex && state.stageIndex >= 0 ? 1 : 0.72;
      ctx.fill();
      if (index === state.sampleIndex && state.stageIndex >= 0) {
        ctx.strokeStyle = "#202123";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function compressHistoryPoints(points, maxPoints = 120) {
    if (points.length <= maxPoints) return points;
    const first = points[0];
    const last = points[points.length - 1];
    const inner = points.slice(1, -1);
    const bucketCount = Math.max(1, Math.floor((maxPoints - 2) / 2));
    const bucketSize = Math.ceil(inner.length / bucketCount);
    const compressed = [];
    for (let start = 0; start < inner.length; start += bucketSize) {
      const bucket = inner.slice(start, start + bucketSize);
      const minimum = bucket.reduce((best, point) => point.value < best.value ? point : best, bucket[0]);
      const maximum = bucket.reduce((best, point) => point.value > best.value ? point : best, bucket[0]);
      if (minimum.step === maximum.step) {
        compressed.push(minimum);
      } else if (minimum.step < maximum.step) {
        compressed.push(minimum, maximum);
      } else {
        compressed.push(maximum, minimum);
      }
    }
    return [first, ...compressed, last];
  }

  function adaptiveValueRange(values, { nonNegative = false, paddingRatio = 0.08 } = {}) {
    let dataMin = Infinity;
    let dataMax = -Infinity;
    for (const value of values) {
      if (!Number.isFinite(value)) continue;
      if (value < dataMin) dataMin = value;
      if (value > dataMax) dataMax = value;
    }
    if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) return { min: 0, max: 1 };
    const rawRange = dataMax - dataMin;
    const reference = Math.max(Math.abs(dataMin), Math.abs(dataMax));
    const padding = rawRange > 1e-12
      ? rawRange * paddingRatio
      : Math.max(reference * paddingRatio, 0.0001);
    const min = nonNegative ? Math.max(0, dataMin - padding) : dataMin - padding;
    const max = dataMax + padding;
    return max > min ? { min, max } : { min: min - 0.0001, max: max + 0.0001 };
  }

  function drawLoss() {
    const canvas = elements.lossCanvas;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const margin = { left: 76, right: 76, top: 20, bottom: 34 };
    ctx.clearRect(0, 0, width, height);

    const metricPoints = state.metricHistory.slice();
    const lastRecorded = metricPoints[metricPoints.length - 1];
    if (
      state.currentAverageLoss !== null
      && (!lastRecorded || lastRecorded.step !== state.processedSamples)
    ) {
      metricPoints.push({
        step: state.processedSamples,
        loss: state.currentAverageLoss,
        accuracy: state.currentAverageAccuracy,
      });
    }
    const visible = compressHistoryPoints(
      metricPoints.map((point) => ({ step: point.step, value: point.loss }))
    );
    const accuracyVisible = compressHistoryPoints(
      metricPoints.map((point) => ({ step: point.step, value: point.accuracy }))
    );
    const lossRange = metricPoints.length
      ? adaptiveValueRange(visible.map((point) => point.value), {
        nonNegative: true,
        paddingRatio: 0.04,
      })
      : { min: 0, max: 0.5 };
    ctx.font = '18px "SFMono-Regular", Consolas, monospace';
    ctx.fillStyle = "#8a8b86";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#e4e4df";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = margin.top + ((height - margin.top - margin.bottom) * i) / 4;
      const value = lossRange.max - ((lossRange.max - lossRange.min) * i) / 4;
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(width - margin.right, y); ctx.stroke();
      ctx.fillText(format(value, 4), margin.left - 12, y);
      ctx.textAlign = "left";
      ctx.fillStyle = "#7c5ce7";
      ctx.fillText(`${Math.round(100 - i * 25)}%`, width - margin.right + 12, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#8a8b86";
    }

    if (metricPoints.length === 0) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#9a9b96";
      ctx.font = '20px Inter, system-ui, sans-serif';
      ctx.fillText("完成第一次参数更新后，平均 Loss 曲线会出现在这里", width / 2, height / 2);
      elements.averageLoss.textContent = "—";
      elements.averageAccuracy.textContent = "—";
      return;
    }

    const maxLossStep = Math.max(1, state.processedSamples);
    const xAt = (step) => margin.left + (step / maxLossStep) * (width - margin.left - margin.right);
    const yAt = (value) => margin.top
      + ((lossRange.max - value) / (lossRange.max - lossRange.min))
      * (height - margin.top - margin.bottom);
    const accuracyYAt = (value) => margin.top
      + (1 - value) * (height - margin.top - margin.bottom);

    const gradient = ctx.createLinearGradient(0, margin.top, 0, height - margin.bottom);
    gradient.addColorStop(0, "rgba(16,163,127,.22)");
    gradient.addColorStop(1, "rgba(16,163,127,0)");
    ctx.beginPath();
    visible.forEach((point, index) => {
      const x = xAt(point.step);
      const y = yAt(point.value);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(xAt(visible[visible.length - 1].step), height - margin.bottom);
    ctx.lineTo(xAt(0), height - margin.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    visible.forEach((point, index) => {
      const x = xAt(point.step);
      const y = yAt(point.value);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#10a37f";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    const lastIndex = visible.length - 1;
    ctx.beginPath();
    ctx.arc(xAt(visible[lastIndex].step), yAt(visible[lastIndex].value), 5, 0, Math.PI * 2);
    ctx.fillStyle = "#10a37f";
    ctx.fill();

    ctx.beginPath();
    accuracyVisible.forEach((point, index) => {
      const x = xAt(point.step);
      const y = accuracyYAt(point.value);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#7c5ce7";
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 7]);
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.setLineDash([]);

    const lastAccuracy = accuracyVisible[accuracyVisible.length - 1];
    ctx.beginPath();
    ctx.arc(xAt(lastAccuracy.step), accuracyYAt(lastAccuracy.value), 5, 0, Math.PI * 2);
    ctx.fillStyle = "#7c5ce7";
    ctx.fill();

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#878883";
    ctx.font = '17px "SFMono-Regular", Consolas, monospace';
    ctx.fillText("0", margin.left, height - margin.bottom + 10);
    const epoch = state.processedSamples / state.data.length;
    const epochLabel = epoch >= 100
      ? epoch.toFixed(1)
      : epoch.toFixed(2).replace(/\.?0+$/, "");
    ctx.textAlign = "right";
    ctx.fillText(epochLabel, width - margin.right, height - margin.bottom + 10);

    elements.averageLoss.textContent = format(state.currentAverageLoss);
    elements.averageAccuracy.textContent = `${(state.currentAverageAccuracy * 100).toFixed(1)}%`;
  }

  function drawParameterHistory() {
    const canvas = elements.parameterCanvas;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const margin = { left: 76, right: 28, top: 22, bottom: 38 };
    ctx.clearRect(0, 0, width, height);

    let history = null;
    let labelHtml = "";
    let color = "#10a37f";
    if (state.selected && state.selected.type === "edge") {
      const { layer, target, source } = state.selected;
      history = state.parameterHistory.weights[weightKey(layer, target, source)];
      labelHtml = htmlNotation("w", layer, `${target + 1},${source + 1}`);
    } else if (state.selected && state.selected.type === "bias") {
      const { layer, neuron } = state.selected;
      history = state.parameterHistory.biases[biasKey(layer, neuron)];
      labelHtml = htmlNotation("b", layer, neuron + 1);
      color = "#7c5ce7";
    }

    if (!history) {
      elements.parameterHistoryLabel.textContent = "点击网络中的 w 或 b";
      elements.parameterHistoryValue.textContent = "—";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#999a95";
      ctx.font = '20px Inter, system-ui, sans-serif';
      ctx.fillText("选中任意权重或偏置后，这里显示它的完整历史", width / 2, height / 2);
      return;
    }

    elements.parameterHistoryLabel.innerHTML = `${labelHtml} · ${history.length - 1} 次更新`;
    elements.parameterHistoryValue.textContent = format(history[history.length - 1].value, 6);

    const visible = compressHistoryPoints(history);
    const values = visible.map((point) => point.value);
    const valueRange = adaptiveValueRange(values, { paddingRatio: 0.06 });
    const minValue = valueRange.min;
    const maxValue = valueRange.max;
    const maxStep = Math.max(1, history[history.length - 1].step);
    const xAt = (step) => margin.left + (step / maxStep) * (width - margin.left - margin.right);
    const yAt = (value) => margin.top + ((maxValue - value) / (maxValue - minValue)) * (height - margin.top - margin.bottom);

    ctx.strokeStyle = "#e4e4df";
    ctx.lineWidth = 1;
    ctx.font = '17px "SFMono-Regular", Consolas, monospace';
    ctx.fillStyle = "#8a8b86";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i += 1) {
      const y = margin.top + ((height - margin.top - margin.bottom) * i) / 4;
      const value = maxValue - ((maxValue - minValue) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      ctx.fillText(format(value, 4), margin.left - 12, y);
    }

    const gradient = ctx.createLinearGradient(0, margin.top, 0, height - margin.bottom);
    const rgba = color === "#7c5ce7" ? "124,92,231" : "16,163,127";
    gradient.addColorStop(0, `rgba(${rgba},.2)`);
    gradient.addColorStop(1, `rgba(${rgba},0)`);
    ctx.beginPath();
    visible.forEach((point, index) => {
      const x = xAt(point.step);
      const y = yAt(point.value);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(xAt(visible[visible.length - 1].step), height - margin.bottom);
    ctx.lineTo(xAt(0), height - margin.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    visible.forEach((point, index) => {
      const x = xAt(point.step);
      const y = yAt(point.value);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    visible.forEach((point) => {
      ctx.beginPath();
      ctx.arc(xAt(point.step), yAt(point.value), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    ctx.textBaseline = "top";
    ctx.fillStyle = "#878883";
    ctx.font = '17px "SFMono-Regular", Consolas, monospace';
    ctx.textAlign = "left";
    ctx.fillText("0", margin.left, height - margin.bottom + 11);
    ctx.textAlign = "right";
    ctx.fillText(String(history[history.length - 1].step), width - margin.right, height - margin.bottom + 11);
  }

  function optimizerUpdateFormula(parameter, gradient, update, oldValue, newValue) {
    const optimizer = state.network.optimizer;
    const optimizerName = OPTIMIZER_NAMES[optimizer];
    if (optimizer === "adam") {
      return `
        <span>${optimizerName} · ${parameter} 更新</span>
        <code>g = ∂L/∂${parameter} = ${format(gradient, 6)}</code>
        <code>m[t] = 0.9m[t−1] + 0.1g　·　v[t] = 0.999v[t−1] + 0.001g²</code>
        <code>Δ${parameter} = −η × m_hat[t]/(√v_hat[t] + ε) = ${format(update, 6)}</code>
        <strong>${parameter}_new = ${format(oldValue, 6)} + ${format(update, 6)} = ${format(newValue, 6)}</strong>
      `;
    }
    if (optimizer === "momentum") {
      return `
        <span>${optimizerName} · ${parameter} 更新</span>
        <code>g = ∂L/∂${parameter} = ${format(gradient, 6)}</code>
        <code>v[t] = 0.9v[t−1] + g　·　Δ${parameter} = −ηv[t] = ${format(update, 6)}</code>
        <strong>${parameter}_new = ${format(oldValue, 6)} + ${format(update, 6)} = ${format(newValue, 6)}</strong>
      `;
    }
    return `
      <span>${optimizerName} · ${parameter} 更新</span>
      <code>g = ∂L/∂${parameter} = ${format(gradient, 6)}</code>
      <code>Δ${parameter} = −ηg = −${format(state.network.learningRate, 3)} × ${format(gradient, 6)} = ${format(update, 6)}</code>
      <strong>${parameter}_new = ${format(oldValue, 6)} + ${format(update, 6)} = ${format(newValue, 6)}</strong>
    `;
  }

  function renderInspector() {
    drawParameterHistory();
    if (!state.selected || !state.network) {
      elements.inspector.innerHTML = '<div class="empty-inspector"><span>⌁</span><p>点击 x、y、神经元、w 或 b<br />查看这一步的完整计算</p></div>';
      return;
    }

    const sample = state.data[state.sampleIndex];
    const sampleNumber = state.sampleIndex + 1;
    const stage = state.stages[state.stageIndex] || null;
    const backward = isBackwardView();

    if (state.selected.type === "target") {
      const lossExplanation = state.network.lossFunction === "bce"
        ? "y 不参与前向传播；它在输出 ŷ 得到后用于计算 L = −[y ln(ŷ) + (1−y) ln(1−ŷ)]。"
        : "y 不参与前向传播；它在输出 ŷ 得到后用于计算 L = ½(ŷ − y)²。";
      elements.inspector.innerHTML = `
        <div class="inspector-title">训练样本 #${sampleNumber} · 真实标签</div>
        <div class="inspector-value math-symbol">${htmlNotation("y", sampleNumber)} = ${sample.y}</div>
        <div class="formula-card">
          <span>样本身份</span>
          <code>#${sampleNumber}: (${htmlNotation("x", sampleNumber, 1)}=${format(sample.x[0], 4)}, ${htmlNotation("x", sampleNumber, 2)}=${format(sample.x[1], 4)}, ${htmlNotation("y", sampleNumber)}=${sample.y})</code>
          <p>${lossExplanation}</p>
        </div>
      `;
      return;
    }

    if (state.selected.type === "node") {
      const { layer, neuron } = state.selected;
      const activation = state.network.activations[layer][neuron];
      const z = state.network.zValues[layer][neuron];
      const delta = state.network.deltas[layer][neuron];

      if (layer === 0) {
        elements.inspector.innerHTML = `
          <div class="inspector-title">训练样本 #${sampleNumber} · 输入特征</div>
          <div class="inspector-value math-symbol">${htmlNotation("x", sampleNumber, neuron + 1)} = ${format(sample.x[neuron], 6)}</div>
          <div class="formula-card">
            <span>样本身份</span>
            <code>#${sampleNumber}: (${htmlNotation("x", sampleNumber, 1)}=${format(sample.x[0], 4)}, ${htmlNotation("x", sampleNumber, 2)}=${format(sample.x[1], 4)}, ${htmlNotation("y", sampleNumber)}=${sample.y})</code>
            <p>输入节点只保存样本特征，不执行加权与激活计算。</p>
          </div>
        `;
        return;
      }

      const previousActivations = state.network.activations[layer - 1];
      const terms = previousActivations.map((value, source) =>
        `${htmlNotation("w", layer, `${neuron + 1},${source + 1}`)}(${format(state.network.weights[layer][neuron][source], 3)}) × ${htmlNotation("a", layer - 1, source + 1)}(${format(value, 3)})`
      ).join(" + ");
      let backwardFormula = "";
      if (backward) {
        if (layer === state.network.sizes.length - 1) {
          backwardFormula = state.network.lossFunction === "bce"
            ? `
              <span>反向计算 · BCE 与 Sigmoid</span>
              <code>δ = ∂L/∂z = a − y</code>
              <code>= ${format(activation, 4)} − ${sample.y}</code>
              <strong>δ = ${format(delta, 6)}</strong>
            `
            : `
              <span>反向计算 · MSE</span>
              <code>δ = (a − y) × a × (1 − a)</code>
              <code>= (${format(activation, 4)} − ${sample.y}) × ${format(activation, 4)} × (1 − ${format(activation, 4)})</code>
              <strong>δ = ${format(delta, 6)}</strong>
            `;
        } else {
          const downstream = state.network.deltas[layer + 1].map((nextDelta, next) =>
            `${format(state.network.weights[layer + 1][next][neuron], 3)} × ${format(nextDelta, 4)}`
          ).join(" + ");
          backwardFormula = `
            <span>反向计算</span>
            <code>δ = (Σ w_next × δ_next) × a × (1 − a)</code>
            <code>= (${downstream}) × ${format(activation, 4)} × (1 − ${format(activation, 4)})</code>
            <strong>δ = ${format(delta, 6)}</strong>
          `;
        }
      }

      elements.inspector.innerHTML = `
        <div class="inspector-title">${layer === state.network.sizes.length - 1 ? "输出层" : `隐藏层 ${layer}`} · 神经元 ${neuron + 1}</div>
        <div class="inspector-value math-symbol">${htmlNotation("a", layer, neuron + 1)} = ${format(activation, 6)}</div>
        <div class="formula-card">
          <span>前向计算</span>
          <code>z = Σ(w × a) + b</code>
          <code>= ${terms} + ${format(state.network.biases[layer][neuron], 3)}</code>
          <strong>z = ${format(z, 6)}</strong>
          <code>a = σ(z) = ${format(activation, 6)}</code>
        </div>
        ${backwardFormula ? `<div class="formula-card backward-formula">${backwardFormula}</div>` : ""}
      `;
      return;
    }

    if (state.selected.type === "bias") {
      const { layer, neuron } = state.selected;
      const bias = state.network.biases[layer][neuron];
      const gradient = state.network.biasGradients[layer][neuron];
      const applied = stage && stage.type === "update" && state.lastUpdateApplied;
      const pendingBatch = stage && stage.type === "update" && !state.lastUpdateApplied;
      const update = applied
        ? state.network.biasUpdates[layer][neuron]
        : state.network.previewBiasUpdate(layer, neuron);
      const oldBias = applied ? bias - update : bias;
      const newBias = applied ? bias : bias + update;
      elements.inspector.innerHTML = backward ? pendingBatch ? `
        <div class="inspector-title">第 ${layer} 层 · 神经元 ${neuron + 1} 的偏置</div>
        <div class="inspector-value math-symbol">${htmlNotation("b", layer, neuron + 1)} = ${format(bias, 6)}</div>
        <div class="formula-card backward-formula">
          <span>Batch 梯度累积 · ${state.batchProgress} / ${state.config.batchSize}</span>
          <code>当前样本 ∂L/∂b = ${format(gradient, 6)}</code>
          <p>达到 Batch Size 或本轮结束后，才会用平均梯度更新参数。</p>
        </div>
      ` : `
        <div class="inspector-title">第 ${layer} 层 · 神经元 ${neuron + 1} 的偏置</div>
        <div class="inspector-value math-symbol">${htmlNotation("b", layer, neuron + 1)}: ${format(oldBias, 6)} → ${format(newBias, 6)}</div>
        <div class="formula-card backward-formula">
          ${optimizerUpdateFormula("b", gradient, update, oldBias, newBias)}
        </div>
      ` : `
        <div class="inspector-title">第 ${layer} 层 · 神经元 ${neuron + 1} 的偏置</div>
        <div class="inspector-value math-symbol">${htmlNotation("b", layer, neuron + 1)} = ${format(bias, 6)}</div>
        <div class="formula-card">
          <span>Forward · 加入加权和</span>
          <code>z = Σ(w × a) + b</code>
          <strong>本项直接贡献 ${format(bias, 6)}</strong>
        </div>
      `;
      return;
    }

    if (state.selected.type === "edge") {
      const { layer, source, target } = state.selected;
      const weight = state.network.weights[layer][target][source];
      const gradient = state.network.weightGradients[layer][target][source];
      const applied = stage && stage.type === "update" && state.lastUpdateApplied;
      const pendingBatch = stage && stage.type === "update" && !state.lastUpdateApplied;
      const update = applied
        ? state.network.weightUpdates[layer][target][source]
        : state.network.previewWeightUpdate(layer, target, source);
      const oldWeight = applied ? weight - update : weight;
      const newWeight = applied ? weight : weight + update;
      const sourceActivation = state.network.activations[layer - 1][source];
      elements.inspector.innerHTML = backward ? pendingBatch ? `
        <div class="inspector-title">第 ${layer} 层 · 神经元 ${source + 1} → ${target + 1}</div>
        <div class="inspector-value math-symbol">${htmlNotation("w", layer, `${target + 1},${source + 1}`)} = ${format(weight, 6)}</div>
        <div class="formula-card backward-formula">
          <span>Batch 梯度累积 · ${state.batchProgress} / ${state.config.batchSize}</span>
          <code>当前样本 ∂L/∂w = ${format(gradient, 6)}</code>
          <p>达到 Batch Size 或本轮结束后，才会用平均梯度更新参数。</p>
        </div>
      ` : `
        <div class="inspector-title">第 ${layer} 层 · 神经元 ${source + 1} → ${target + 1}</div>
        <div class="inspector-value math-symbol">${htmlNotation("w", layer, `${target + 1},${source + 1}`)}: ${format(oldWeight, 6)} → ${format(newWeight, 6)}</div>
        <div class="formula-card backward-formula">
          <code>∂L/∂w = δ_target × a_source = ${format(state.network.deltas[layer][target], 6)} × ${format(sourceActivation, 6)}</code>
          ${optimizerUpdateFormula("w", gradient, update, oldWeight, newWeight)}
        </div>
      ` : `
        <div class="inspector-title">第 ${layer} 层 · 神经元 ${source + 1} → ${target + 1}</div>
        <div class="inspector-value math-symbol">${htmlNotation("w", layer, `${target + 1},${source + 1}`)} = ${format(weight, 6)}</div>
        <div class="formula-card">
          <span>Forward · 这条边的贡献</span>
          <code>w × a_source</code>
          <code>= ${format(weight, 6)} × ${format(sourceActivation, 6)}</code>
          <strong>${format(weight * sourceActivation, 6)}</strong>
        </div>
      `;
      return;
    }
  }

  function stopPlaying() {
    state.playing = false;
    clearTimeout(state.timer);
    state.timer = null;
    if (elements.play) elements.play.textContent = "▶ 自动播放";
  }

  function getPlaybackProfile() {
    if (elements.speed.value === "step") {
      return {
        mode: "step",
        batchSize: 1,
        interval: 900,
        networkEvery: 1,
        parameterStride: 1,
        metricStride: 1,
        timeBudget: Infinity,
      };
    }

    const targetRate = Number(elements.speed.value) || 1;
    const ticksPerSecond = targetRate <= 10 ? targetRate : 20;
    return {
      mode: "samples",
      batchSize: Math.max(1, Math.ceil(targetRate / ticksPerSecond)),
      interval: 1000 / ticksPerSecond,
      networkEvery: targetRate <= 10
        ? 1
        : targetRate <= 100
          ? 2
          : targetRate <= 1000
            ? 4
            : targetRate <= 10000
              ? 10
              : targetRate <= 100000
                ? 15
                : 20,
      parameterStride: targetRate <= 100
        ? 1
        : targetRate <= 1000
          ? 10
          : targetRate <= 10000
            ? 100
            : targetRate <= 100000
              ? 1000
              : 10000,
      metricStride: targetRate <= 100
        ? 1
        : targetRate <= 1000
          ? 5
          : targetRate <= 10000
            ? 50
            : targetRate <= 100000
              ? 500
              : 5000,
      timeBudget: targetRate >= 1000000 ? 24 : 32,
    };
  }

  function playLoop() {
    if (!state.playing) return;
    const cycleStartedAt = performance.now();
    const profile = getPlaybackProfile();
    state.parameterRecordStride = profile.parameterStride;
    state.metricRecordStride = profile.metricStride;
    let completed = 0;
    if (profile.mode === "samples") {
      state.fastRenderCounter += 1;
      while (completed < profile.batchSize) {
        completeOneTrainingSample({
          fullRender: false,
          renderCharts: false,
        });
        completed += 1;
        if (
          completed % 16 === 0
          && performance.now() - cycleStartedAt >= profile.timeBudget
        ) break;
      }

      const currentStage = state.stages[state.stageIndex] || null;
      if (currentStage && state.fastRenderCounter % profile.networkEvery === 0) {
        renderStage(currentStage);
      } else {
        drawLoss();
        elements.networkSampleBadge.textContent = `${state.sampleIndex + 1} / ${state.data.length}`;
        if (state.selected && (state.selected.type === "edge" || state.selected.type === "bias")) {
          drawParameterHistory();
        }
      }
    } else {
      nextStage();
    }
    const calculationTime = performance.now() - cycleStartedAt;
    const behindTarget = profile.mode === "samples" && completed < profile.batchSize;
    state.timer = setTimeout(
      playLoop,
      behindTarget ? 0 : Math.max(0, profile.interval - calculationTime)
    );
  }

  function togglePlaying() {
    state.playing = !state.playing;
    elements.play.textContent = state.playing ? "Ⅱ 暂停" : "▶ 自动播放";
    if (state.playing) {
      state.fastRenderCounter = 0;
      playLoop();
    } else {
      stopPlaying();
      recordParameterSnapshot();
      state.parameterRecordStride = 1;
      state.metricRecordStride = 1;
      const currentStage = state.stages[state.stageIndex] || null;
      if (currentStage) renderStage(currentStage);
    }
  }

  elements.reset.addEventListener("click", rebuild);
  elements.next.addEventListener("click", nextStage);
  elements.play.addEventListener("click", togglePlaying);
  elements.speed.addEventListener("change", () => {
    if (state.playing) {
      clearTimeout(state.timer);
      recordParameterSnapshot();
      state.fastRenderCounter = 0;
      const profile = getPlaybackProfile();
      state.parameterRecordStride = profile.parameterStride;
      state.metricRecordStride = profile.metricStride;
      state.timer = setTimeout(playLoop, profile.interval);
    }
  });

  rebuild();
})();
