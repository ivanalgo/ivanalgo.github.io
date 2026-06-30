(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const svgNS = "http://www.w3.org/2000/svg";
  const OPTIMIZER_NAMES = { adam: "Adam", momentum: "Momentum", sgd: "SGD" };
  const LOSS_NAMES = { mse: "MSE", bce: "BCE" };
  const sigmoid = (x) => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
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
  config.batchSize = Math.floor(Math.max(1, Math.min(
    Number(config.batchSize) || 1,
    Array.isArray(config.data) && config.data.length ? config.data.length : config.sampleCount
  )));

  const state = {
    config,
    data: Array.isArray(config.data) && config.data.length ? config.data : [],
    network: null,
    sampleIndex: 0,
    trainStep: 0,
    processedSamples: 0,
    batchProgress: 0,
    lastBatchSize: 0,
    lastBatchRows: [],
    lastUpdateApplied: false,
    stageIndex: -1,
    stages: [],
    lossWindow: [],
    lossWindowSum: 0,
    accuracyWindow: [],
    accuracyWindowSum: 0,
    metricHistory: [],
    epochHistory: [],
    metricRecordStride: 1,
    currentAverageLoss: null,
    currentAverageAccuracy: null,
    parameterHistory: { weights: {}, biases: {} },
    currentLoss: null,
    playing: false,
    timer: null,
    dashboardTraining: false,
    dashboardTimer: null,
    fastRenderCounter: 0,
    parameterRecordStride: 1,
    selected: null,
    viewMode: sessionStorage.getItem("mlpViewMode") || "anatomy",
    history: [],
  };

  const elements = {
    reset: $("#resetButton"),
    prev: $("#prevButton"),
    next: $("#nextButton"),
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
    classificationCanvas: $("#classificationCanvas"),
    classificationAccuracyLabel: $("#classificationAccuracyLabel"),
    dashboardDataCanvas: $("#dashboardDataCanvas"),
    dashboardClassificationCanvas: $("#dashboardClassificationCanvas"),
    dashboardClassificationAccuracyLabel: $("#dashboardClassificationAccuracyLabel"),
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
    networkBatchBadge: $("#networkBatchBadge"),
    calculationPanel: $("#calculationPanel"),
    calculationBadge: $("#calculationBadge"),
    calculationTitle: $("#calculationTitle"),
    calculationHint: $("#calculationHint"),
    calculationContent: $("#calculationContent"),
    chartOptimizer: $("#chartOptimizer"),
    chartLossFunction: $("#chartLossFunction"),
    chartBatchSize: $("#chartBatchSize"),
    dashboardBatchSize: $("#dashboardBatchSizeSelect"),
    dashboardEpochInput: $("#dashboardEpochInput"),
    dashboardTrain: $("#dashboardTrainButton"),
    dashboardReset: $("#dashboardResetButton"),
    dashboardStatus: $("#dashboardTrainingStatus"),
    dashboardEpochCount: $("#dashboardEpochCount"),
    dashboardUpdateCount: $("#dashboardUpdateCount"),
    viewModeButtons: document.querySelectorAll("[data-view-mode]"),
    matrixBatchSize: $("#matrixBatchSizeSelect"),
    batchMatrixLayer: $("#batchMatrixLayerSelect"),
    batchMatrixContent: $("#batchMatrixContent"),
    matrixBatchSizeLabel: $("#matrixBatchSizeLabel"),
    matrixCurrentSampleLabel: $("#matrixCurrentSampleLabel"),
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

  function matrixView(label, values, { rowVector = false, maxRows = 4, maxCols = 4, digits = 3 } = {}) {
    const source = Array.isArray(values) ? values : [];
    const matrix = source.length && Array.isArray(source[0])
      ? source
      : rowVector ? [source] : source.map((value) => [value]);
    const totalRows = matrix.length;
    const totalCols = matrix[0]?.length || 0;
    const shownRows = matrix.slice(0, maxRows);
    const shownCols = Math.min(totalCols, maxCols);
    const cells = shownRows.flatMap((row) =>
      row.slice(0, shownCols).map((value) => `<span>${format(value, digits)}</span>`)
    ).join("");
    const clipped = totalRows > maxRows || totalCols > maxCols;
    return `
      <div class="matrix-term">
        <div class="matrix-name">${label}</div>
        <div class="matrix-bracket">
          <div class="matrix-grid" style="--matrix-cols:${Math.max(1, shownCols)}">${cells || "<span>—</span>"}</div>
        </div>
        <small>${totalRows}×${totalCols}${clipped ? " · 截取显示" : ""}</small>
      </div>`;
  }

  function getConfiguredBatchSize() {
    return Math.max(1, Math.min(state.data.length || 1, Number(state.config.batchSize) || 1));
  }

  function getDashboardBatchSizeOptions() {
    const sampleCount = Math.max(1, state.data.length || state.config.sampleCount || 1);
    const options = new Set([1, sampleCount]);
    for (let value = 2; value <= sampleCount; value *= 2) options.add(value);
    for (let value = 2; value <= sampleCount; value += 1) {
      if (sampleCount % value === 0) options.add(value);
    }
    return [...options]
      .filter((value) => value >= 1 && value <= sampleCount)
      .sort((a, b) => a - b);
  }

  function normalizeDashboardBatchSize(value) {
    const options = getDashboardBatchSizeOptions();
    const numeric = Math.max(1, Math.min(state.data.length || 1, Math.floor(Number(value) || 1)));
    return options.reduce((best, option) =>
      Math.abs(option - numeric) < Math.abs(best - numeric) ? option : best,
      options[0]
    );
  }

  function getTrainingBatchSize() {
    return state.viewMode === "anatomy" ? 1 : getConfiguredBatchSize();
  }

  function getBatchRows({ count = getConfiguredBatchSize(), includeFuture = true } = {}) {
    if (!state.data.length) return [];
    const batchSize = getConfiguredBatchSize();
    const processedInBatch = Math.min(state.batchProgress, batchSize - 1);
    const startIndex = (state.sampleIndex - processedInBatch + state.data.length) % state.data.length;
    const rowCount = Math.max(1, Math.min(count, batchSize, state.data.length));
    return Array.from({ length: rowCount }, (_, offset) => {
      const index = (startIndex + offset) % state.data.length;
      const point = state.data[index];
      return {
        index,
        active: index === state.sampleIndex,
        future: !includeFuture && offset >= Math.max(1, state.batchProgress),
        x: point.x,
        y: point.y,
      };
    });
  }

  function renderBatchContext({ compact = false, includeFormula = true } = {}) {
    const batchSize = getConfiguredBatchSize();
    if (batchSize <= 1) return "";
    const currentStage = state.stages[state.stageIndex] || null;
    const displayBatchSize = currentStage && currentStage.type === "update"
      ? Math.max(1, state.lastUpdateApplied ? state.lastBatchSize : state.batchProgress)
      : batchSize;
    const rows = currentStage && currentStage.type === "update" && state.lastBatchRows.length
      ? state.lastBatchRows.slice(0, 4)
      : getBatchRows({ count: Math.min(batchSize, 4) });
    const sampleRows = rows.map((row) => `
      <div class="batch-row${row.active ? " active" : ""}">
        <span>#${row.index + 1}</span>
        <code>[${format(row.x[0], 3)}, ${format(row.x[1], 3)}]</code>
        <strong>y=${row.y}</strong>
      </div>`).join("");
    return `
      <div class="batch-context${compact ? " compact" : ""}">
        <div class="batch-context-heading">
          <span>Mini-batch 视角</span>
          <strong>m = ${displayBatchSize}${displayBatchSize > rows.length ? ` · 展示前 ${rows.length} 个` : ""}</strong>
        </div>
        <div class="batch-rows">${sampleRows}</div>
        ${includeFormula ? `
          <div class="batch-formulas">
            <code>X_B ∈ ℝ<sup>2×m</sup>, A⁽ˡ⁾ ∈ ℝ<sup>nₗ×m</sup></code>
            <code>Z⁽ˡ⁾ = W⁽ˡ⁾A⁽ˡ⁻¹⁾ + b⁽ˡ⁾1ᵀ</code>
            <code>∂L/∂W⁽ˡ⁾ = (1/m)Δ⁽ˡ⁾(A⁽ˡ⁻¹⁾)ᵀ，∂L/∂b⁽ˡ⁾ = mean_cols(Δ⁽ˡ⁾)</code>
          </div>` : ""}
      </div>`;
  }

  function matrixColumnsFromRows(rows, selector) {
    if (!rows.length) return [];
    const width = selector(rows[0]).length;
    return Array.from({ length: width }, (_, rowIndex) =>
      rows.map((row) => selector(row)[rowIndex])
    );
  }

  function computeBatchSnapshot() {
    if (!state.network || !state.data.length) return null;
    const batchSize = getConfiguredBatchSize();
    const rows = getBatchRows({ count: Math.min(batchSize, 4) });
    const last = state.network.sizes.length - 1;
    const samples = rows.map((row) => {
      const activations = state.network.sizes.map((size) => Array(size).fill(0));
      const zValues = state.network.sizes.map((size) => Array(size).fill(0));
      const deltas = state.network.sizes.map((size) => Array(size).fill(0));
      activations[0] = row.x.slice();
      zValues[0] = row.x.slice();

      for (let layer = 1; layer <= last; layer += 1) {
        for (let neuron = 0; neuron < state.network.sizes[layer]; neuron += 1) {
          let z = state.network.biases[layer][neuron];
          for (let source = 0; source < state.network.sizes[layer - 1]; source += 1) {
            z += state.network.weights[layer][neuron][source] * activations[layer - 1][source];
          }
          zValues[layer][neuron] = z;
          activations[layer][neuron] = sigmoid(z);
        }
      }

      for (let neuron = 0; neuron < state.network.sizes[last]; neuron += 1) {
        const activation = activations[last][neuron];
        const targetValue = neuron === 0 ? row.y : 0;
        deltas[last][neuron] = state.network.lossFunction === "bce"
          ? activation - targetValue
          : (activation - targetValue) * activation * (1 - activation);
      }

      for (let layer = last - 1; layer >= 1; layer -= 1) {
        for (let neuron = 0; neuron < state.network.sizes[layer]; neuron += 1) {
          let downstream = 0;
          for (let next = 0; next < state.network.sizes[layer + 1]; next += 1) {
            downstream += state.network.weights[layer + 1][next][neuron] * deltas[layer + 1][next];
          }
          const activation = activations[layer][neuron];
          deltas[layer][neuron] = downstream * activation * (1 - activation);
        }
      }

      return { ...row, activations, zValues, deltas };
    });

    return { rows, samples, batchSize: samples.length, last };
  }

  function batchGradientMatrix(snapshot, layer) {
    const gradients = state.network.weights[layer].map((row) => row.map(() => 0));
    const biasGradients = state.network.biases[layer].map(() => 0);
    const m = Math.max(1, snapshot.batchSize);
    snapshot.samples.forEach((sample) => {
      for (let target = 0; target < state.network.sizes[layer]; target += 1) {
        biasGradients[target] += sample.deltas[layer][target] / m;
        for (let source = 0; source < state.network.sizes[layer - 1]; source += 1) {
          gradients[target][source] +=
            (sample.deltas[layer][target] * sample.activations[layer - 1][source]) / m;
        }
      }
    });
    return { gradients, biasGradients };
  }

  function renderMatrixCard(title, subtitle, content, className = "") {
    return `
      <div class="matrix-card ${className}">
        <div class="matrix-card-title">
          <span>${title}</span>
          <small>${subtitle}</small>
        </div>
        <div class="matrix-card-body">${content}</div>
      </div>`;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createSnapshot() {
    return cloneJson({
      sampleIndex: state.sampleIndex,
      trainStep: state.trainStep,
      processedSamples: state.processedSamples,
      batchProgress: state.batchProgress,
      lastBatchSize: state.lastBatchSize,
      lastBatchRows: state.lastBatchRows,
      lastUpdateApplied: state.lastUpdateApplied,
      stageIndex: state.stageIndex,
      lossWindow: state.lossWindow,
      lossWindowSum: state.lossWindowSum,
      accuracyWindow: state.accuracyWindow,
      accuracyWindowSum: state.accuracyWindowSum,
      metricHistory: state.metricHistory,
      epochHistory: state.epochHistory,
      currentAverageLoss: state.currentAverageLoss,
      currentAverageAccuracy: state.currentAverageAccuracy,
      parameterHistory: state.parameterHistory,
      currentLoss: state.currentLoss,
      selected: state.selected,
      data: state.data,
      network: {
        optimizerStep: state.network.optimizerStep,
        activations: state.network.activations,
        zValues: state.network.zValues,
        deltas: state.network.deltas,
        weights: state.network.weights,
        biases: state.network.biases,
        weightGradients: state.network.weightGradients,
        biasGradients: state.network.biasGradients,
        weightGradientSums: state.network.weightGradientSums,
        biasGradientSums: state.network.biasGradientSums,
        weightUpdates: state.network.weightUpdates,
        biasUpdates: state.network.biasUpdates,
        weightFirstMoments: state.network.weightFirstMoments,
        weightSecondMoments: state.network.weightSecondMoments,
        biasFirstMoments: state.network.biasFirstMoments,
        biasSecondMoments: state.network.biasSecondMoments,
      },
    });
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot || !state.network) return;
    state.sampleIndex = snapshot.sampleIndex;
    state.trainStep = snapshot.trainStep;
    state.processedSamples = snapshot.processedSamples;
    state.batchProgress = snapshot.batchProgress;
    state.lastBatchSize = snapshot.lastBatchSize;
    state.lastBatchRows = snapshot.lastBatchRows;
    state.lastUpdateApplied = snapshot.lastUpdateApplied;
    state.stageIndex = snapshot.stageIndex;
    state.lossWindow = snapshot.lossWindow;
    state.lossWindowSum = snapshot.lossWindowSum;
    state.accuracyWindow = snapshot.accuracyWindow;
    state.accuracyWindowSum = snapshot.accuracyWindowSum;
    state.metricHistory = snapshot.metricHistory;
    state.epochHistory = snapshot.epochHistory;
    state.currentAverageLoss = snapshot.currentAverageLoss;
    state.currentAverageAccuracy = snapshot.currentAverageAccuracy;
    state.parameterHistory = snapshot.parameterHistory;
    state.currentLoss = snapshot.currentLoss;
    state.selected = snapshot.selected;
    state.data = snapshot.data;
    Object.assign(state.network, snapshot.network);
  }

  function updateHistoryControls() {
    if (elements.prev) elements.prev.disabled = state.history.length <= 1;
  }

  function rememberSnapshot() {
    state.history.push(createSnapshot());
    if (state.history.length > 300) state.history.shift();
    updateHistoryControls();
  }

  function populateBatchMatrixLayerSelect() {
    if (!elements.batchMatrixLayer || !state.network) return;
    const last = state.network.sizes.length - 1;
    const previous = Number(elements.batchMatrixLayer.value) || last;
    elements.batchMatrixLayer.innerHTML = Array.from({ length: last }, (_, index) => {
      const layer = index + 1;
      const label = layer === last ? `输出层 ${layer}` : `隐藏层 ${layer}`;
      return `<option value="${layer}">${label} · ${state.network.sizes[layer]} 个神经元</option>`;
    }).join("");
    elements.batchMatrixLayer.value = String(Math.min(Math.max(1, previous), last));
  }

  function populateMatrixBatchSizeSelect() {
    if (!elements.matrixBatchSize) return;
    const allowed = [1, 2, 4];
    const current = allowed.includes(getConfiguredBatchSize()) ? getConfiguredBatchSize() : 1;
    elements.matrixBatchSize.value = String(current);
  }

  function populateDashboardBatchSizeSelect() {
    if (!elements.dashboardBatchSize) return;
    const options = getDashboardBatchSizeOptions();
    const current = normalizeDashboardBatchSize(getConfiguredBatchSize());
    elements.dashboardBatchSize.innerHTML = options.map((value) => {
      const updates = Math.ceil((state.data.length || 1) / value);
      return `<option value="${value}">${value} 个样本 · 每 Epoch 约 ${updates} 次更新</option>`;
    }).join("");
    elements.dashboardBatchSize.value = String(current);
  }

  function persistCurrentConfig() {
    try {
      sessionStorage.setItem("mlpExperiment", JSON.stringify({
        dataset: state.config.dataset,
        sampleCount: state.config.sampleCount,
        learningRate: state.config.learningRate,
        optimizer: state.config.optimizer,
        lossFunction: state.config.lossFunction,
        batchSize: state.config.batchSize,
        noise: state.config.noise,
        hiddenLayers: state.config.hiddenLayers.slice(),
        data: state.data,
      }));
    } catch (error) {
      // Ignore storage failures; the in-memory config still drives this session.
    }
  }

  function updateMatrixBatchSize(value) {
    const next = [1, 2, 4].includes(Number(value)) ? Number(value) : 1;
    if (state.config.batchSize === next) return;
    stopPlaying();
    state.config.batchSize = next;
    persistCurrentConfig();
    rebuild();
    setViewMode("matrix");
  }

  function updateDashboardBatchSize(value) {
    const next = normalizeDashboardBatchSize(value);
    state.config.batchSize = next;
    if (elements.dashboardBatchSize) elements.dashboardBatchSize.value = String(next);
    if (elements.matrixBatchSize && [1, 2, 4].includes(next)) elements.matrixBatchSize.value = String(next);
    persistCurrentConfig();
    updateExperimentSummary();
  }

  function resetDashboardMetrics() {
    state.lossWindow = [];
    state.lossWindowSum = 0;
    state.accuracyWindow = [];
    state.accuracyWindowSum = 0;
    state.metricHistory = [];
    state.epochHistory = [];
    state.currentAverageLoss = null;
    state.currentAverageAccuracy = null;
    state.processedSamples = 0;
    state.batchProgress = 0;
    state.lastBatchSize = 0;
    state.lastBatchRows = [];
    state.lastUpdateApplied = false;
    state.sampleIndex = 0;
    state.stageIndex = -1;
  }

  function trainDashboardEpochs() {
    if (!state.network) return;
    if (state.dashboardTraining) {
      stopDashboardTraining();
      return;
    }
    stopPlaying();
    setViewMode("dashboard");
    updateDashboardBatchSize(elements.dashboardBatchSize?.value || state.config.batchSize);
    state.dashboardTraining = true;
    if (elements.dashboardTrain) elements.dashboardTrain.textContent = "暂停训练";
    runDashboardTrainingLoop();
  }

  function trainDashboardEpochChunk() {
    const epochs = Math.max(1, Math.min(50, Number(elements.dashboardEpochInput?.value) || 1));
    if (elements.dashboardEpochInput) elements.dashboardEpochInput.value = String(epochs);
    const totalSamples = epochs * state.data.length;
    state.metricRecordStride = 1;
    state.parameterRecordStride = Math.max(1, Math.floor(totalSamples / 200));
    for (let count = 0; count < totalSamples; count += 1) {
      completeOneTrainingSample({ fullRender: false, renderCharts: false });
    }
    state.metricRecordStride = 1;
    state.parameterRecordStride = 1;
    drawLoss();
    drawDashboardSideFigures();
    renderBatchMatrix();
    updateDashboardStats();
    if (elements.dashboardStatus) {
      elements.dashboardStatus.textContent = `训练中 · 已完成 ${Math.floor(state.processedSamples / state.data.length)} 个 Epoch · Batch Size ${getConfiguredBatchSize()} · 参数更新 ${state.trainStep} 次`;
    }
  }

  function runDashboardTrainingLoop() {
    if (!state.dashboardTraining) return;
    trainDashboardEpochChunk();
    state.dashboardTimer = setTimeout(runDashboardTrainingLoop, 90);
  }

  function stopDashboardTraining({ silent = false } = {}) {
    const wasTraining = state.dashboardTraining || state.dashboardTimer;
    state.dashboardTraining = false;
    clearTimeout(state.dashboardTimer);
    state.dashboardTimer = null;
    if (elements.dashboardTrain) elements.dashboardTrain.textContent = "开始训练";
    if (!silent && wasTraining && elements.dashboardStatus) {
      const epochCount = Math.floor(state.processedSamples / Math.max(1, state.data.length));
      elements.dashboardStatus.textContent = `已暂停 · 完成 ${epochCount} 个 Epoch · Batch Size ${getConfiguredBatchSize()} · 参数更新 ${state.trainStep} 次`;
    }
  }

  function resetDashboardTraining() {
    stopDashboardTraining();
    rebuild();
    setViewMode("dashboard");
    if (elements.dashboardStatus) {
      elements.dashboardStatus.textContent = "模型已重置，选择 Batch Size 和 Epochs 后开始训练";
    }
  }

  function renderBatchMatrix() {
    if (!elements.batchMatrixContent || !state.network) return;
    const snapshot = computeBatchSnapshot();
    if (!snapshot || !snapshot.samples.length) {
      elements.batchMatrixContent.innerHTML = '<div class="empty-matrix">暂无 batch 数据</div>';
      return;
    }
    const last = snapshot.last;
    const currentStage = state.stages[state.stageIndex] || null;
    const selectedLayer = currentStage && currentStage.layer > 0
      ? Math.min(last, Math.max(1, currentStage.layer))
      : last;
    const layerReason = currentStage && currentStage.type
      ? `${currentStage.badge} 阶段自动显示第 ${selectedLayer} 层`
      : `准备阶段默认显示输出层 ${selectedLayer}`;
    const xMatrix = matrixColumnsFromRows(snapshot.samples, (sample) => sample.x);
    const yMatrix = [snapshot.samples.map((sample) => sample.y)];
    const zMatrix = matrixColumnsFromRows(snapshot.samples, (sample) => sample.zValues[selectedLayer]);
    const activationMatrix = matrixColumnsFromRows(snapshot.samples, (sample) => sample.activations[selectedLayer]);
    const deltaMatrix = matrixColumnsFromRows(snapshot.samples, (sample) => sample.deltas[selectedLayer]);
    const previousActivationMatrix = matrixColumnsFromRows(snapshot.samples, (sample) => sample.activations[selectedLayer - 1]);
    const { gradients, biasGradients } = batchGradientMatrix(snapshot, selectedLayer);
    const columnLabels = snapshot.samples
      .map((sample, column) => `<span class="matrix-column-chip${sample.active ? " active" : ""}">col ${column + 1} = #${sample.index + 1}</span>`)
      .join("");

    if (elements.matrixBatchSizeLabel) {
      elements.matrixBatchSizeLabel.textContent = `${snapshot.batchSize} / ${getConfiguredBatchSize()}`;
    }
    if (elements.matrixBatchSize) {
      elements.matrixBatchSize.value = String(getConfiguredBatchSize());
    }
    if (elements.matrixCurrentSampleLabel) {
      elements.matrixCurrentSampleLabel.textContent = `#${state.sampleIndex + 1}`;
    }

    const inputCard = renderMatrixCard("输入矩阵", "X_B 与标签", `
      <div class="formula-flow compact-flow matrix-local-flow">
        ${matrixView("X_B", xMatrix, { maxRows: 2, maxCols: 4, digits: 4 })}
        <span class="formula-operator">，</span>
        ${matrixView("Y_B", yMatrix, { maxRows: 1, maxCols: 4, digits: 0 })}
      </div>`);
    const forwardCard = renderMatrixCard(`Forward · 第 ${selectedLayer} 层`, "整层同时处理 m 列样本", `
      <div class="formula-flow matrix-local-flow">
        ${matrixView(htmlNotation("W", selectedLayer), state.network.weights[selectedLayer], { maxRows: 5, maxCols: 5, digits: 3 })}
        <span class="formula-operator">×</span>
        ${matrixView(htmlNotation("A", selectedLayer - 1), previousActivationMatrix, { maxRows: 5, maxCols: 4, digits: 3 })}
        <span class="formula-operator">+</span>
        ${matrixView(`${htmlNotation("b", selectedLayer)}1ᵀ`, state.network.biases[selectedLayer].map((bias) => Array(snapshot.batchSize).fill(bias)), { maxRows: 5, maxCols: 4, digits: 3 })}
        <span class="formula-operator">=</span>
        ${matrixView(htmlNotation("Z", selectedLayer), zMatrix, { maxRows: 5, maxCols: 4, digits: 3 })}
        <span class="formula-operator activation-arrow">σ →</span>
        ${matrixView(htmlNotation("A", selectedLayer), activationMatrix, { maxRows: 5, maxCols: 4, digits: 4 })}
      </div>`);
    const predictions = [snapshot.samples.map((sample) => sample.activations[last][0])];
    const losses = [snapshot.samples.map((sample) => {
      const prediction = Math.max(1e-7, Math.min(1 - 1e-7, sample.activations[last][0]));
      return state.network.lossFunction === "bce"
        ? -(sample.y * Math.log(prediction) + (1 - sample.y) * Math.log(1 - prediction))
        : 0.5 * Math.pow(prediction - sample.y, 2);
    })];
    const averageLoss = losses[0].reduce((sum, value) => sum + value, 0) / losses[0].length;
    const lossCard = renderMatrixCard(
      "Loss · 当前 mini-batch",
      state.network.lossFunction === "bce" ? "逐列计算 BCE，再取平均" : "逐列计算 ½(ŷ−y)²，再取平均",
      `<div class="formula-flow compact-flow matrix-local-flow">
        ${matrixView("Ŷ_B", predictions, { maxRows: 1, maxCols: 4, digits: 5 })}
        <span class="formula-operator">vs</span>
        ${matrixView("Y_B", yMatrix, { maxRows: 1, maxCols: 4, digits: 0 })}
        <span class="formula-operator">→</span>
        ${matrixView("L_B", losses, { maxRows: 1, maxCols: 4, digits: 6 })}
        <span class="formula-operator">mean</span>
        <div class="scalar-result"><span>Batch Loss</span><strong>${format(averageLoss, 7)}</strong></div>
      </div>`
    );
    const sigmoidPrimeMatrix = activationMatrix.map((row) => row.map((value) => value * (1 - value)));
    const outputErrorMatrix = selectedLayer === last
      ? [activationMatrix[0].map((value, column) => value - yMatrix[0][column])]
      : [];
    const nextDeltaMatrix = selectedLayer < last
      ? matrixColumnsFromRows(snapshot.samples, (sample) => sample.deltas[selectedLayer + 1])
      : [];
    const downstreamMatrix = selectedLayer < last
      ? Array.from({ length: state.network.sizes[selectedLayer] }, (_, neuron) =>
        snapshot.samples.map((sample) =>
          state.network.weights[selectedLayer + 1].reduce(
            (sum, row, next) => sum + row[neuron] * sample.deltas[selectedLayer + 1][next],
            0
          )
        )
      )
      : [];
    const signalFormula = selectedLayer === last
      ? state.network.lossFunction === "bce"
        ? `
          <div class="formula-flow compact-flow matrix-local-flow">
            ${matrixView(htmlNotation("A", selectedLayer), activationMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
            <span class="formula-operator">−</span>
            ${matrixView("Y_B", yMatrix, { maxRows: 1, maxCols: 4, digits: 0 })}
            <span class="formula-operator">=</span>
            ${matrixView(htmlNotation("Δ", selectedLayer), deltaMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
          </div>`
        : `
          <div class="formula-flow compact-flow matrix-local-flow">
            ${matrixView(`${htmlNotation("A", selectedLayer)} − Y_B`, outputErrorMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
            <span class="formula-operator">⊙</span>
            ${matrixView(`σ′(${htmlNotation("Z", selectedLayer)})`, sigmoidPrimeMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
            <span class="formula-operator">=</span>
            ${matrixView(htmlNotation("Δ", selectedLayer), deltaMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
          </div>`
      : `
        <div class="formula-flow matrix-local-flow">
          ${matrixView(`${htmlNotation("W", selectedLayer + 1)}ᵀ`, transpose(state.network.weights[selectedLayer + 1]), { maxRows: 5, maxCols: 5, digits: 3 })}
          <span class="formula-operator">×</span>
          ${matrixView(htmlNotation("Δ", selectedLayer + 1), nextDeltaMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
          <span class="formula-operator">=</span>
          ${matrixView("传回误差", downstreamMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
        </div>
        <div class="formula-flow compact-flow matrix-local-flow matrix-sub-flow">
          ${matrixView("传回误差", downstreamMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
          <span class="formula-operator">⊙</span>
          ${matrixView(`σ′(${htmlNotation("Z", selectedLayer)})`, sigmoidPrimeMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
          <span class="formula-operator">=</span>
          ${matrixView(htmlNotation("Δ", selectedLayer), deltaMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
        </div>`;
    const signalCard = renderMatrixCard(
      "反向误差信号 Δ",
      selectedLayer === last ? "输出层先由预测与标签得到 Δ" : "隐藏层先从下一层传回误差，再乘激活导数",
      signalFormula
    );
    const rawGradients = gradients.map((row) => row.map((value) => value * snapshot.batchSize));
    const onesColumn = Array.from({ length: snapshot.batchSize }, () => [1]);
    const rawBiasGradients = biasGradients.map((value) => value * snapshot.batchSize);
    const previousActivationTransposed = transpose(previousActivationMatrix);
    const gradientCard = renderMatrixCard("Batch 平均梯度", "先按样本列求梯度，再除以 m", `
      <div class="formula-flow matrix-local-flow">
        ${matrixView(htmlNotation("Δ", selectedLayer), deltaMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
        <span class="formula-operator">×</span>
        ${matrixView(`${htmlNotation("A", selectedLayer - 1)}ᵀ`, previousActivationTransposed, { maxRows: 4, maxCols: 5, digits: 4 })}
        <span class="formula-operator">=</span>
        ${matrixView("ΣG_W", rawGradients, { maxRows: 5, maxCols: 5, digits: 5 })}
        <span class="formula-operator">÷ m →</span>
        ${matrixView(`∂L/∂${htmlNotation("W", selectedLayer)}`, gradients, { maxRows: 5, maxCols: 5, digits: 5 })}
      </div>
      <div class="formula-flow compact-flow matrix-local-flow matrix-sub-flow">
        ${matrixView(htmlNotation("Δ", selectedLayer), deltaMatrix, { maxRows: 5, maxCols: 4, digits: 5 })}
        <span class="formula-operator">×</span>
        ${matrixView("1_m", onesColumn, { maxRows: 4, maxCols: 1, digits: 0 })}
        <span class="formula-operator">=</span>
        ${matrixView("ΣG_b", rawBiasGradients, { maxRows: 5, maxCols: 1, digits: 5 })}
        <span class="formula-operator">÷ m →</span>
        ${matrixView(`∂L/∂${htmlNotation("b", selectedLayer)}`, biasGradients, { maxRows: 5, maxCols: 1, digits: 5 })}
      </div>`, "wide-matrix-card");
    const updateAlreadyApplied = currentStage?.type === "update" && state.lastUpdateApplied;
    const weightUpdateMatrix = state.network.weights[selectedLayer].map((row, target) => row.map((_, source) =>
      updateAlreadyApplied
        ? state.network.weightUpdates[selectedLayer][target][source]
        : state.network._calculateUpdate(
          gradients[target][source],
          state.network.weightFirstMoments[selectedLayer][target][source],
          state.network.weightSecondMoments[selectedLayer][target][source],
          state.network.optimizerStep + 1
        ).update
    ));
    const biasUpdateVector = state.network.biases[selectedLayer].map((_, neuron) =>
      updateAlreadyApplied
        ? state.network.biasUpdates[selectedLayer][neuron]
        : state.network._calculateUpdate(
          biasGradients[neuron],
          state.network.biasFirstMoments[selectedLayer][neuron],
          state.network.biasSecondMoments[selectedLayer][neuron],
          state.network.optimizerStep + 1
        ).update
    );
    const weightBeforeUpdate = state.network.weights[selectedLayer].map((row, target) => row.map((value, source) =>
      updateAlreadyApplied ? value - weightUpdateMatrix[target][source] : value
    ));
    const weightAfterUpdate = state.network.weights[selectedLayer].map((row, target) => row.map((value, source) =>
      updateAlreadyApplied ? value : value + weightUpdateMatrix[target][source]
    ));
    const biasBeforeUpdate = state.network.biases[selectedLayer].map((value, neuron) =>
      updateAlreadyApplied ? value - biasUpdateVector[neuron] : value
    );
    const biasAfterUpdate = state.network.biases[selectedLayer].map((value, neuron) =>
      updateAlreadyApplied ? value : value + biasUpdateVector[neuron]
    );
    const optimizerName = OPTIMIZER_NAMES[state.network.optimizer];
    const optimizerHint = state.network.optimizer === "sgd"
      ? "SGD：Δθ = −ηG，直接沿负梯度方向移动"
      : state.network.optimizer === "momentum"
        ? "Momentum：先把梯度累积进速度 v，再用 Δθ = −ηv 更新"
        : "Adam：先更新一阶/二阶矩并做偏差修正，再生成 Δθ";
    const negativeLearningRate = [[-state.network.learningRate]];
    const updateDirectionName = state.network.optimizer === "sgd"
      ? "G"
      : state.network.optimizer === "momentum"
        ? "v_t"
        : "m̂/(√v̂+ε)";
    const weightUpdateDirection = weightUpdateMatrix.map((row) => row.map((value) =>
      value / (-state.network.learningRate)
    ));
    const biasUpdateDirection = biasUpdateVector.map((value) => value / (-state.network.learningRate));
    const updateDerivationCard = renderMatrixCard(
      `ΔW / Δb 如何由 η 得到`,
      `${optimizerName} 的更新量一定包含学习率 η，先算更新方向，再乘 −η`,
      `<div class="optimizer-mini-note">${optimizerHint}；当前 η = ${format(state.network.learningRate, 4)}</div>
      <div class="formula-flow matrix-local-flow matrix-sub-flow">
        ${matrixView(`${updateDirectionName}_W`, weightUpdateDirection, { maxRows: 5, maxCols: 5, digits: 5 })}
        <span class="formula-operator">×</span>
        ${matrixView("−η", negativeLearningRate, { maxRows: 1, maxCols: 1, digits: 4 })}
        <span class="formula-operator">=</span>
        ${matrixView(`Δ${htmlNotation("W", selectedLayer)}`, weightUpdateMatrix, { maxRows: 5, maxCols: 5, digits: 5 })}
      </div>
      <div class="formula-flow compact-flow matrix-local-flow matrix-sub-flow">
        ${matrixView(`${updateDirectionName}_b`, biasUpdateDirection, { maxRows: 5, maxCols: 1, digits: 5 })}
        <span class="formula-operator">×</span>
        ${matrixView("−η", negativeLearningRate, { maxRows: 1, maxCols: 1, digits: 4 })}
        <span class="formula-operator">=</span>
        ${matrixView(`Δ${htmlNotation("b", selectedLayer)}`, biasUpdateVector, { maxRows: 5, maxCols: 1, digits: 5 })}
      </div>`,
      "wide-matrix-card"
    );
    const parameterUpdateCard = renderMatrixCard(
      `参数修正 · 第 ${selectedLayer} 层`,
      updateAlreadyApplied ? `${optimizerName} 已把本批平均梯度写回参数` : `${optimizerName} 根据当前平均梯度预览下一步参数变化`,
      `<div class="optimizer-mini-note">${optimizerHint}</div>
      <div class="formula-flow matrix-local-flow matrix-sub-flow">
        ${matrixView(htmlNotation("W", selectedLayer), weightBeforeUpdate, { maxRows: 5, maxCols: 5, digits: 5 })}
        <span class="formula-operator">+</span>
        ${matrixView(`Δ${htmlNotation("W", selectedLayer)}`, weightUpdateMatrix, { maxRows: 5, maxCols: 5, digits: 5 })}
        <span class="formula-operator">=</span>
        ${matrixView(`${htmlNotation("W", selectedLayer)}_new`, weightAfterUpdate, { maxRows: 5, maxCols: 5, digits: 5 })}
      </div>
      <div class="formula-flow compact-flow matrix-local-flow matrix-sub-flow">
        ${matrixView(htmlNotation("b", selectedLayer), biasBeforeUpdate, { maxRows: 5, maxCols: 1, digits: 5 })}
        <span class="formula-operator">+</span>
        ${matrixView(`Δ${htmlNotation("b", selectedLayer)}`, biasUpdateVector, { maxRows: 5, maxCols: 1, digits: 5 })}
        <span class="formula-operator">=</span>
        ${matrixView(`${htmlNotation("b", selectedLayer)}_new`, biasAfterUpdate, { maxRows: 5, maxCols: 1, digits: 5 })}
      </div>`,
      "wide-matrix-card"
    );
    let cards = [];
    let stageFormula = "点击“下一步”后，这里只显示当前阶段已经发生的矩阵计算。";
    if (currentStage?.type === "input") {
      cards = [inputCard];
      stageFormula = "INPUT 阶段：只装载 X_B 与 Y_B，还不计算后续层。";
    } else if (currentStage?.type === "forward") {
      cards = [inputCard, forwardCard];
      stageFormula = `${layerReason}　·　Z⁽${selectedLayer}⁾ = W⁽${selectedLayer}⁾A⁽${selectedLayer - 1}⁾ + b⁽${selectedLayer}⁾1ᵀ　·　A⁽${selectedLayer}⁾ = σ(Z⁽${selectedLayer}⁾)`;
    } else if (currentStage?.type === "loss") {
      cards = [inputCard, lossCard];
      stageFormula = `LOSS 阶段：使用输出层 A⁽${last}⁾ 作为 Ŷ_B，逐列计算 loss 后求平均。`;
    } else if (currentStage?.type === "backward") {
      cards = [signalCard, gradientCard, updateDerivationCard, parameterUpdateCard];
      stageFormula = `${layerReason}　·　先得到 Δ 与平均梯度，再用 η 计算 ΔW / Δb，最后预览参数修正。`;
    } else if (currentStage?.type === "update") {
      cards = [gradientCard, updateDerivationCard, parameterUpdateCard];
      stageFormula = `UPDATE 阶段：平均梯度先通过 η 变成 ΔW / Δb，再写回 ${htmlNotation("W", selectedLayer)} / ${htmlNotation("b", selectedLayer)}。`;
    }

    elements.batchMatrixContent.innerHTML = `
      <div class="matrix-mode-summary">
        <div>
          <strong>列就是样本</strong>
          <p>${columnLabels}</p>
        </div>
        <code>${stageFormula}</code>
      </div>
      <div class="matrix-card-grid">
        ${cards.length ? cards.join("") : '<div class="empty-matrix">尚未开始矩阵计算：点击“下一步”进入 INPUT 阶段。</div>'}
      </div>`;
  }

  function setViewMode(mode) {
    const nextMode = ["anatomy", "matrix", "dashboard"].includes(mode) ? mode : "anatomy";
    state.viewMode = nextMode;
    sessionStorage.setItem("mlpViewMode", nextMode);
    document.body.dataset.viewMode = nextMode;
    elements.viewModeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.viewMode === nextMode);
    });
    if (nextMode === "matrix") renderBatchMatrix();
    if (nextMode === "dashboard") {
      syncDashboardControls();
      drawDashboardSideFigures();
      drawLoss();
    }
  }

  function transpose(matrix) {
    if (!matrix.length) return [];
    return matrix[0].map((_, column) => matrix.map((row) => row[column]));
  }

  function renderCalculation(stage) {
    const panel = elements.calculationPanel;
    const content = elements.calculationContent;
    if (!panel || !content || !state.network) return;
    const sample = state.data[state.sampleIndex];
    const last = state.network.sizes.length - 1;
    const phase = stage?.type || "ready";
    panel.dataset.phase = phase;
    elements.calculationBadge.textContent = stage?.badge || "READY";

    if (!stage) {
      elements.calculationTitle.textContent = "本步计算公式";
      elements.calculationHint.textContent = "点击“下一步”，这里会代入当前样本和参数的真实数值";
      content.innerHTML = `
        <div class="calculation-empty">
          <strong>输入 → 加权求和 → 激活 → Loss → 梯度 → 参数更新</strong>
          <code>z⁽ˡ⁾ = W⁽ˡ⁾a⁽ˡ⁻¹⁾ + b⁽ˡ⁾　·　a⁽ˡ⁾ = σ(z⁽ˡ⁾)</code>
        </div>`;
      return;
    }

    if (stage.type === "input") {
      elements.calculationTitle.textContent = `装载样本 #${state.sampleIndex + 1}`;
      elements.calculationHint.textContent = "输入层只保存数据，不执行加权计算";
      content.innerHTML = `
        <div class="formula-flow compact-flow">
          ${matrixView(`${htmlNotation("a", 0)} = ${htmlNotation("x", state.sampleIndex + 1)}`, sample.x, { digits: 4 })}
          <span class="formula-operator">，</span>
          <div class="scalar-result"><span>真实标签</span><strong>${htmlNotation("y", state.sampleIndex + 1)} = ${sample.y}</strong></div>
        </div>`;
      return;
    }

    if (stage.type === "forward") {
      const layer = stage.layer;
      const previous = state.network.activations[layer - 1];
      const weights = state.network.weights[layer];
      const biases = state.network.biases[layer];
      const zValues = state.network.zValues[layer];
      const activations = state.network.activations[layer];
      const neuron = 0;
      const terms = previous.slice(0, 6).map((value, source) =>
        `${format(weights[neuron][source], 3)}×${format(value, 3)}`
      ).join(" + ");
      const suffix = previous.length > 6 ? " + …" : "";
      elements.calculationTitle.textContent = `Forward · 第 ${layer} 层`;
      elements.calculationHint.textContent = "先完成整层矩阵乘法；下方展开第 1 个神经元的实际计算";
      content.innerHTML = `
        <div class="formula-flow">
          ${matrixView(htmlNotation("W", layer), weights)}
          <span class="formula-operator">×</span>
          ${matrixView(htmlNotation("a", layer - 1), previous)}
          <span class="formula-operator">+</span>
          ${matrixView(htmlNotation("b", layer), biases)}
          <span class="formula-operator">=</span>
          ${matrixView(htmlNotation("z", layer), zValues)}
          <span class="formula-operator activation-arrow">σ →</span>
          ${matrixView(htmlNotation("a", layer), activations)}
        </div>
        <div class="expanded-equation">
          <span>展开神经元 1</span>
          <code>${htmlNotation("z", layer, 1)} = ${terms}${suffix} + ${format(biases[neuron], 3)} = <b>${format(zValues[neuron], 6)}</b></code>
          <code>${htmlNotation("a", layer, 1)} = σ(${format(zValues[neuron], 6)}) = <b>${format(activations[neuron], 6)}</b></code>
        </div>`;
      return;
    }

    if (stage.type === "loss") {
      const prediction = state.network.activations[last][0];
      const bce = state.network.lossFunction === "bce";
      elements.calculationTitle.textContent = `${LOSS_NAMES[state.network.lossFunction]} · 计算当前样本 Loss`;
      elements.calculationHint.textContent = "真实标签 y 只在这里与预测 ŷ 汇合";
      content.innerHTML = `
        <div class="loss-equation">
          <div><span>预测</span><strong>ŷ = ${format(prediction, 6)}</strong></div>
          <span class="formula-operator">与</span>
          <div><span>标签</span><strong>y = ${sample.y}</strong></div>
          <span class="formula-operator">→</span>
          <div class="loss-result">
            <span>${bce ? "−[y ln(ŷ) + (1−y) ln(1−ŷ)]" : "½(ŷ−y)²"}</span>
            <strong>L = ${format(state.currentLoss, 7)}</strong>
          </div>
        </div>`;
      return;
    }

    if (stage.type === "backward") {
      const layer = stage.layer;
      const delta = state.network.deltas[layer];
      const previous = state.network.activations[layer - 1];
      const gradients = state.network.weightGradients[layer];
      const activation = state.network.activations[layer][0];
      let symbolic;
      let expanded;
      if (layer === last) {
        if (state.network.lossFunction === "bce") {
          symbolic = `${htmlNotation("δ", layer)} = ${htmlNotation("a", layer)} − y`;
          expanded = `${htmlNotation("δ", layer, 1)} = ${format(activation, 6)} − ${sample.y} = <b>${format(delta[0], 7)}</b>`;
        } else {
          symbolic = `${htmlNotation("δ", layer)} = (${htmlNotation("a", layer)} − y) ⊙ ${htmlNotation("a", layer)} ⊙ (1−${htmlNotation("a", layer)})`;
          expanded = `${htmlNotation("δ", layer, 1)} = (${format(activation, 6)}−${sample.y})×${format(activation, 6)}×(1−${format(activation, 6)}) = <b>${format(delta[0], 7)}</b>`;
        }
      } else {
        const nextWeights = state.network.weights[layer + 1];
        const nextDelta = state.network.deltas[layer + 1];
        const downstreamTerms = nextDelta.slice(0, 6).map((value, next) =>
          `${format(nextWeights[next][0], 3)}×${format(value, 5)}`
        ).join(" + ");
        symbolic = `${htmlNotation("δ", layer)} = (${htmlNotation("W", layer + 1)}ᵀ${htmlNotation("δ", layer + 1)}) ⊙ ${htmlNotation("a", layer)} ⊙ (1−${htmlNotation("a", layer)})`;
        expanded = `${htmlNotation("δ", layer, 1)} = (${downstreamTerms}${nextDelta.length > 6 ? " + …" : ""})×${format(activation, 5)}×(1−${format(activation, 5)}) = <b>${format(delta[0], 7)}</b>`;
      }
      elements.calculationTitle.textContent = `Backward · 第 ${layer} 层`;
      elements.calculationHint.textContent = "先传回误差信号 δ，再用外积得到本层 W 与 b 的梯度";
      content.innerHTML = `
        <div class="formula-derivation">
          <span>反向传播拆成三步看</span>
          <code>① 输出层：δ⁽ᴸ⁾ = ∂L/∂z⁽ᴸ⁾。MSE 为 (a⁽ᴸ⁾−y)⊙a⁽ᴸ⁾⊙(1−a⁽ᴸ⁾)，BCE+Sigmoid 可化简为 a⁽ᴸ⁾−y。</code>
          <code>② 隐藏层：δ⁽ˡ⁾ = (W⁽ˡ⁺¹⁾ᵀδ⁽ˡ⁺¹⁾)⊙a⁽ˡ⁾⊙(1−a⁽ˡ⁾)。</code>
          <code>③ 参数梯度：∂L/∂W⁽ˡ⁾ = δ⁽ˡ⁾(a⁽ˡ⁻¹⁾)ᵀ，∂L/∂b⁽ˡ⁾ = δ⁽ˡ⁾。</code>
        </div>
        <div class="backward-signal">
          <span>链式法则</span>
          <code>${symbolic}</code>
          <code>${expanded}</code>
        </div>
        <div class="formula-flow gradient-flow">
          ${matrixView(htmlNotation("δ", layer), delta, { digits: 5 })}
          <span class="formula-operator">×</span>
          ${matrixView(`${htmlNotation("a", layer - 1)}ᵀ`, previous, { rowVector: true, digits: 4 })}
          <span class="formula-operator">=</span>
          ${matrixView(`∂L/∂${htmlNotation("W", layer)}`, gradients, { digits: 5 })}
          <span class="formula-operator">，</span>
          ${matrixView(`∂L/∂${htmlNotation("b", layer)} = ${htmlNotation("δ", layer)}`, state.network.biasGradients[layer], { digits: 5 })}
        </div>`;
      return;
    }

    if (stage.type === "update") {
      const layer = 1;
      const optimizerName = OPTIMIZER_NAMES[state.network.optimizer];
      elements.calculationTitle.textContent = `${optimizerName} · 更新当前样本参数`;
      elements.calculationHint.textContent = "单样本推导中，只看当前样本梯度如何变成 ΔW / Δb 并修正参数";
      content.innerHTML = `
        <div class="formula-flow compact-flow">
          ${matrixView(`∂L/∂${htmlNotation("W", layer)}`, state.network.weightGradients[layer], { digits: 5 })}
          <span class="formula-operator">→</span>
          <div class="optimizer-equation">
            <span>${optimizerName}</span>
            <code>Δθ = optimizer(∂L/∂θ, η)</code>
            <code>SGD 时 Δθ = −η · ∂L/∂θ；Momentum / Adam 会先修正更新方向</code>
            <strong>θ_new = θ + Δθ</strong>
          </div>
        </div>`;
    }
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
    if (sampleNumber % state.data.length === 0) {
      state.epochHistory.push({
        epoch: sampleNumber / state.data.length,
        loss: state.currentAverageLoss,
        accuracy: state.currentAverageAccuracy,
        samples: sampleNumber,
      });
      if (state.epochHistory.length > 5000) {
        const compacted = [state.epochHistory[0]];
        for (let index = 2; index < state.epochHistory.length - 1; index += 2) {
          compacted.push(state.epochHistory[index]);
        }
        compacted.push(state.epochHistory[state.epochHistory.length - 1]);
        state.epochHistory = compacted;
      }
    }
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
      title: `使用 ${OPTIMIZER_NAMES[state.network.optimizer]} 修正 W 与 B`,
      description: "根据当前样本算出的梯度得到 ΔW / Δb，并把更新量写回参数。",
      formula: state.network.optimizer === "adam"
        ? "g → m,v → 偏差修正 → Δθ → θ_new"
        : state.network.optimizer === "momentum"
          ? "g → v ← 0.9v + g → Δθ → θ_new"
          : "g → Δθ = −ηg → θ_new",
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
    if (elements.networkBatchBadge) {
      elements.networkBatchBadge.textContent = `m=${getConfiguredBatchSize()}`;
    }
    elements.chartOptimizer.textContent = optimizerName;
    elements.chartLossFunction.textContent = LOSS_NAMES[state.network.lossFunction];
    elements.chartBatchSize.textContent = String(state.config.batchSize);
    elements.lossAverageLabel.textContent = `最近 ${state.data.length} 个样本平均 Loss`;
    elements.accuracyAverageLabel.textContent = `最近 ${state.data.length} 个样本准确率`;
    updateDashboardStats();
    syncDashboardControls();
  }

  function updateDashboardStats() {
    if (elements.dashboardEpochCount) {
      const epochs = state.data.length ? Math.floor(state.processedSamples / state.data.length) : 0;
      elements.dashboardEpochCount.textContent = String(epochs);
    }
    if (elements.dashboardUpdateCount) {
      elements.dashboardUpdateCount.textContent = String(state.trainStep);
    }
    if (elements.chartBatchSize) {
      elements.chartBatchSize.textContent = String(getConfiguredBatchSize());
    }
  }

  function syncDashboardControls() {
    if (elements.dashboardBatchSize) {
      if (!elements.dashboardBatchSize.options.length) populateDashboardBatchSizeSelect();
      elements.dashboardBatchSize.value = String(normalizeDashboardBatchSize(getConfiguredBatchSize()));
    }
  }

  function drawDashboardSideFigures() {
    drawData(elements.dashboardDataCanvas, { highlightCurrent: false });
    drawClassificationMap(
      elements.dashboardClassificationCanvas,
      elements.dashboardClassificationAccuracyLabel,
      { highlightCurrent: false }
    );
  }

  function rebuild() {
    stopDashboardTraining({ silent: true });
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
    state.lastBatchSize = 0;
    state.lastBatchRows = [];
    state.lastUpdateApplied = false;
    state.stageIndex = -1;
    state.lossWindow = [];
    state.lossWindowSum = 0;
    state.accuracyWindow = [];
    state.accuracyWindowSum = 0;
    state.metricHistory = [];
    state.epochHistory = [];
    state.history = [];
    state.metricRecordStride = 1;
    state.currentAverageLoss = null;
    state.currentAverageAccuracy = null;
    state.parameterRecordStride = 1;
    initializeParameterHistory();
    state.currentLoss = null;
    state.selected = null;
    updateExperimentSummary();
    buildStages();
    populateBatchMatrixLayerSelect();
    populateMatrixBatchSizeSelect();
    populateDashboardBatchSizeSelect();
    renderNetwork();
    drawData();
    drawClassificationMap();
    drawDashboardSideFigures();
    drawLoss();
    drawParameterHistory();
    renderBatchMatrix();
    updateConsole(null);
    renderInspector();
    rememberSnapshot();
    setViewMode(state.viewMode);
  }

  function getNodePositions() {
    const sizes = state.network.sizes;
    const width = Math.max(900, sizes.length * 190 + 90);
    const largestLayer = Math.max(...sizes);
    const neuronSpacing = 70;
    const height = Math.max(460, 140 + (largestLayer - 1) * neuronSpacing);
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
      state.lastBatchSize = state.batchProgress;
      state.lastBatchRows = getBatchRows({ count: Math.min(state.batchProgress, 4) });
      const prediction = state.network.activations[state.network.sizes.length - 1][0];
      recordLoss(state.currentLoss, prediction, sample.y);
      state.processedSamples += 1;
      const endOfEpoch = state.sampleIndex === state.data.length - 1;
      state.lastUpdateApplied =
        state.batchProgress >= getTrainingBatchSize() || endOfEpoch;
      if (state.lastUpdateApplied) {
        const appliedBatchSize = state.batchProgress;
        state.network.applyAccumulatedGradients(appliedBatchSize);
        state.lastBatchSize = appliedBatchSize;
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
    drawClassificationMap();
    drawLoss();
    drawParameterHistory();
    renderBatchMatrix();
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
    rememberSnapshot();
  }

  function previousStage() {
    if (state.history.length <= 1) return;
    stopPlaying();
    state.history.pop();
    restoreSnapshot(cloneJson(state.history[state.history.length - 1]));
    updateHistoryControls();
    renderStage(state.stages[state.stageIndex] || null);
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
      elements.stepTitle.textContent = `${OPTIMIZER_NAMES[state.network.optimizer]} 修正 W 与 B`;
      elements.stepDescription.textContent = "把当前样本产生的梯度转换成更新量 ΔW / Δb，并观察参数改变后的分类效果。";
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
    if (elements.networkBatchBadge) {
      const batchSize = getConfiguredBatchSize();
      const progress = stage && stage.type === "update"
        ? state.lastUpdateApplied ? state.lastBatchSize : state.batchProgress
        : Math.min(state.batchProgress + 1, batchSize);
      elements.networkBatchBadge.textContent = `m=${batchSize} · ${Math.max(1, progress)}/${batchSize}`;
    }
    document.body.classList.toggle("backward-stage", Boolean(stage && (stage.type === "backward" || stage.type === "update")));

    [...elements.phaseRail.children].forEach((segment, index) => {
      segment.classList.toggle("done", state.stageIndex >= 0 && index < state.stageIndex);
      segment.classList.toggle("current", index === state.stageIndex);
    });
    renderCalculation(stage);
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

  function drawData(canvas = elements.dataCanvas, { highlightCurrent = true } = {}) {
    if (!canvas) return;
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
      const isCurrent = highlightCurrent && index === state.sampleIndex && state.stageIndex >= 0;
      ctx.arc(x, y, isCurrent ? 8 : 5.2, 0, Math.PI * 2);
      ctx.fillStyle = point.y === 1 ? "#10a37f" : "#d97745";
      ctx.globalAlpha = isCurrent ? 1 : 0.72;
      ctx.fill();
      if (isCurrent) {
        ctx.strokeStyle = "#202123";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function predictSampleWithCurrentNetwork(point) {
    if (!state.network) return 0.5;
    let activation = point.x.slice();
    for (let layer = 1; layer < state.network.sizes.length; layer += 1) {
      activation = state.network.weights[layer].map((row, neuron) => {
        const z = row.reduce((sum, weight, source) => sum + weight * activation[source], state.network.biases[layer][neuron]);
        return sigmoid(z);
      });
    }
    return activation[0] ?? 0.5;
  }

  function drawClassificationMap(
    canvas = elements.classificationCanvas,
    labelElement = elements.classificationAccuracyLabel,
    { highlightCurrent = true } = {}
  ) {
    if (!canvas || !state.network) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const margin = 24;
    let correctCount = 0;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fafaf8";
    ctx.fillRect(0, 0, width, height);
    drawGrid(ctx, width, height, margin);

    ctx.fillStyle = "#4b4d49";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillText("W / b 当前状态下，对全部样本的预测效果", margin, 18);

    state.data.forEach((point, index) => {
      const prediction = predictSampleWithCurrentNetwork(point);
      const predictedLabel = prediction >= 0.5 ? 1 : 0;
      const correct = predictedLabel === point.y;
      if (correct) correctCount += 1;

      const x = margin + ((point.x[0] + 1) / 2) * (width - margin * 2);
      const y = height - margin - ((point.x[1] + 1) / 2) * (height - margin * 2);
      const isCurrent = highlightCurrent && index === state.sampleIndex && state.stageIndex >= 0;

      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 8 : 5.2, 0, Math.PI * 2);
      ctx.fillStyle = point.y === 1 ? "rgba(16, 163, 127, .22)" : "rgba(217, 119, 69, .22)";
      ctx.fill();
      ctx.strokeStyle = correct ? "#10a37f" : "#ef4444";
      ctx.lineWidth = correct ? 2.4 : 2.8;
      ctx.stroke();

      if (!correct) {
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 4);
        ctx.lineTo(x + 4, y + 4);
        ctx.moveTo(x + 4, y - 4);
        ctx.lineTo(x - 4, y + 4);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      if (isCurrent) {
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.strokeStyle = "#202123";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    const accuracy = state.data.length ? correctCount / state.data.length : 0;
    if (labelElement) {
      labelElement.textContent = `Accuracy ${(accuracy * 100).toFixed(1)}% · ${correctCount}/${state.data.length}`;
    }
    ctx.fillStyle = "#202123";
    ctx.font = "800 13px Inter, sans-serif";
    ctx.fillText(`Accuracy ${(accuracy * 100).toFixed(1)}%`, width - margin - 112, 18);
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
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const margin = { left: 76, right: 76, top: 20, bottom: 34 };
    ctx.clearRect(0, 0, width, height);

    const dashboardMode = document.body.dataset.viewMode === "dashboard";
    if (elements.lossAverageLabel) {
      elements.lossAverageLabel.textContent = dashboardMode ? "最后 Epoch 平均 Loss" : `最近 ${state.data.length} 个样本平均 Loss`;
    }
    if (elements.accuracyAverageLabel) {
      elements.accuracyAverageLabel.textContent = dashboardMode ? "最后 Epoch Accuracy" : `最近 ${state.data.length} 个样本准确率`;
    }
    const metricPoints = dashboardMode
      ? state.epochHistory.map((point) => ({
        step: point.epoch,
        loss: point.loss,
        accuracy: point.accuracy,
      }))
      : state.metricHistory.slice();
    if (!dashboardMode) {
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
    ctx.textBaseline = "top";
    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillStyle = "#10a37f";
    ctx.textAlign = "left";
    ctx.fillText("Loss", margin.left, 0);
    ctx.fillStyle = "#7c5ce7";
    ctx.textAlign = "right";
    ctx.fillText("Accuracy", width - margin.right, 0);
    ctx.font = '18px "SFMono-Regular", Consolas, monospace';
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8a8b86";
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
      ctx.fillText(
        dashboardMode ? "点击“开始训练”后，每个 Epoch 的 Loss / Accuracy 会出现在这里" : "完成第一次参数更新后，平均 Loss 曲线会出现在这里",
        width / 2,
        height / 2
      );
      elements.averageLoss.textContent = "—";
      elements.averageAccuracy.textContent = "—";
      updateDashboardStats();
      return;
    }

    const maxLossStep = Math.max(1, metricPoints[metricPoints.length - 1].step);
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
    const epoch = dashboardMode ? maxLossStep : state.processedSamples / state.data.length;
    const epochLabel = epoch >= 100
      ? epoch.toFixed(1)
      : epoch.toFixed(2).replace(/\.?0+$/, "");
    ctx.textAlign = "right";
    ctx.fillText(epochLabel, width - margin.right, height - margin.bottom + 10);

    elements.averageLoss.textContent = format(state.currentAverageLoss);
    elements.averageAccuracy.textContent = `${(state.currentAverageAccuracy * 100).toFixed(1)}%`;
    updateDashboardStats();
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
    if (!elements.inspector) return;
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
  if (elements.prev) elements.prev.addEventListener("click", previousStage);
  elements.next.addEventListener("click", nextStage);
  elements.viewModeButtons.forEach((button) => {
    button.addEventListener("click", () => setViewMode(button.dataset.viewMode));
  });
  if (elements.matrixBatchSize) {
    elements.matrixBatchSize.addEventListener("change", () => updateMatrixBatchSize(elements.matrixBatchSize.value));
  }
  if (elements.dashboardBatchSize) {
    elements.dashboardBatchSize.addEventListener("change", () => updateDashboardBatchSize(elements.dashboardBatchSize.value));
  }
  if (elements.dashboardTrain) {
    elements.dashboardTrain.addEventListener("click", trainDashboardEpochs);
  }
  if (elements.dashboardReset) {
    elements.dashboardReset.addEventListener("click", resetDashboardTraining);
  }

  rebuild();
})();
