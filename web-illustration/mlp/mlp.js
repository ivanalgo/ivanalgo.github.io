(function () {
  "use strict";

  const sigmoid = (x) => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
  const SUPPORTED_OPTIMIZERS = new Set(["sgd", "momentum", "adam"]);
  const SUPPORTED_LOSSES = new Set(["mse", "bce"]);

  class MLP {
    constructor(sizes, learningRate = 0.18, optimizer = "sgd", lossFunction = "mse") {
      this.sizes = sizes.slice();
      this.learningRate = learningRate;
      this.optimizer = SUPPORTED_OPTIMIZERS.has(optimizer) ? optimizer : "sgd";
      this.lossFunction = SUPPORTED_LOSSES.has(lossFunction) ? lossFunction : "mse";
      this.optimizerStep = 0;
      this.activations = sizes.map((size) => Array(size).fill(0));
      this.zValues = sizes.map((size) => Array(size).fill(0));
      this.deltas = sizes.map((size) => Array(size).fill(0));
      this.weights = [];
      this.biases = [];
      this.weightGradients = [];
      this.biasGradients = [];
      this.weightGradientSums = [];
      this.biasGradientSums = [];
      this.weightUpdates = [];
      this.biasUpdates = [];
      this.weightFirstMoments = [];
      this.weightSecondMoments = [];
      this.biasFirstMoments = [];
      this.biasSecondMoments = [];

      for (let layer = 1; layer < sizes.length; layer += 1) {
        const scale = Math.sqrt(2 / (sizes[layer - 1] + sizes[layer]));
        this.weights[layer] = Array.from({ length: sizes[layer] }, () =>
          Array.from({ length: sizes[layer - 1] }, () => (Math.random() * 2 - 1) * scale)
        );
        this.biases[layer] = Array.from({ length: sizes[layer] }, () => (Math.random() * 2 - 1) * 0.08);
        this.weightGradients[layer] = this.weights[layer].map((row) => row.map(() => 0));
        this.biasGradients[layer] = this.biases[layer].map(() => 0);
        this.weightGradientSums[layer] = this.weights[layer].map((row) => row.map(() => 0));
        this.biasGradientSums[layer] = this.biases[layer].map(() => 0);
        this.weightUpdates[layer] = this.weights[layer].map((row) => row.map(() => 0));
        this.biasUpdates[layer] = this.biases[layer].map(() => 0);
        this.weightFirstMoments[layer] = this.weights[layer].map((row) => row.map(() => 0));
        this.weightSecondMoments[layer] = this.weights[layer].map((row) => row.map(() => 0));
        this.biasFirstMoments[layer] = this.biases[layer].map(() => 0);
        this.biasSecondMoments[layer] = this.biases[layer].map(() => 0);
      }
    }

    setInput(input) {
      this.activations[0] = input.slice();
      this.zValues[0] = input.slice();
    }

    forwardLayer(layer) {
      for (let neuron = 0; neuron < this.sizes[layer]; neuron += 1) {
        let z = this.biases[layer][neuron];
        for (let source = 0; source < this.sizes[layer - 1]; source += 1) {
          z += this.weights[layer][neuron][source] * this.activations[layer - 1][source];
        }
        this.zValues[layer][neuron] = z;
        this.activations[layer][neuron] = sigmoid(z);
      }
      return this.activations[layer];
    }

    loss(target) {
      const prediction = this.activations[this.sizes.length - 1][0];
      if (this.lossFunction === "bce") {
        const safePrediction = Math.max(1e-7, Math.min(1 - 1e-7, prediction));
        return -(target * Math.log(safePrediction) + (1 - target) * Math.log(1 - safePrediction));
      }
      return 0.5 * Math.pow(prediction - target, 2);
    }

    backwardLayer(layer, target) {
      const lastLayer = this.sizes.length - 1;

      if (layer === lastLayer) {
        for (let neuron = 0; neuron < this.sizes[layer]; neuron += 1) {
          const activation = this.activations[layer][neuron];
          const targetValue = neuron === 0 ? target : 0;
          this.deltas[layer][neuron] = this.lossFunction === "bce"
            ? activation - targetValue
            : (activation - targetValue) * activation * (1 - activation);
        }
      } else {
        for (let neuron = 0; neuron < this.sizes[layer]; neuron += 1) {
          let downstream = 0;
          for (let next = 0; next < this.sizes[layer + 1]; next += 1) {
            downstream += this.weights[layer + 1][next][neuron] * this.deltas[layer + 1][next];
          }
          const activation = this.activations[layer][neuron];
          this.deltas[layer][neuron] = downstream * activation * (1 - activation);
        }
      }

      for (let neuron = 0; neuron < this.sizes[layer]; neuron += 1) {
        this.biasGradients[layer][neuron] = this.deltas[layer][neuron];
        for (let source = 0; source < this.sizes[layer - 1]; source += 1) {
          this.weightGradients[layer][neuron][source] =
            this.deltas[layer][neuron] * this.activations[layer - 1][source];
        }
      }
    }

    accumulateGradients() {
      for (let layer = 1; layer < this.sizes.length; layer += 1) {
        for (let neuron = 0; neuron < this.sizes[layer]; neuron += 1) {
          this.biasGradientSums[layer][neuron] += this.biasGradients[layer][neuron];
          for (let source = 0; source < this.sizes[layer - 1]; source += 1) {
            this.weightGradientSums[layer][neuron][source] +=
              this.weightGradients[layer][neuron][source];
          }
        }
      }
    }

    applyAccumulatedGradients(batchCount) {
      if (batchCount <= 0) return;
      for (let layer = 1; layer < this.sizes.length; layer += 1) {
        for (let neuron = 0; neuron < this.sizes[layer]; neuron += 1) {
          this.biasGradients[layer][neuron] =
            this.biasGradientSums[layer][neuron] / batchCount;
          this.biasGradientSums[layer][neuron] = 0;
          for (let source = 0; source < this.sizes[layer - 1]; source += 1) {
            this.weightGradients[layer][neuron][source] =
              this.weightGradientSums[layer][neuron][source] / batchCount;
            this.weightGradientSums[layer][neuron][source] = 0;
          }
        }
      }
      this.applyGradients();
    }

    _calculateUpdate(gradient, firstMoment, secondMoment, step) {
      if (this.optimizer === "momentum") {
        const nextFirstMoment = 0.9 * firstMoment + gradient;
        return {
          update: -this.learningRate * nextFirstMoment,
          firstMoment: nextFirstMoment,
          secondMoment,
        };
      }

      if (this.optimizer === "adam") {
        const beta1 = 0.9;
        const beta2 = 0.999;
        const nextFirstMoment = beta1 * firstMoment + (1 - beta1) * gradient;
        const nextSecondMoment = beta2 * secondMoment + (1 - beta2) * gradient * gradient;
        const correctedFirst = nextFirstMoment / (1 - Math.pow(beta1, step));
        const correctedSecond = nextSecondMoment / (1 - Math.pow(beta2, step));
        return {
          update: -this.learningRate * correctedFirst / (Math.sqrt(correctedSecond) + 1e-8),
          firstMoment: nextFirstMoment,
          secondMoment: nextSecondMoment,
        };
      }

      return {
        update: -this.learningRate * gradient,
        firstMoment,
        secondMoment,
      };
    }

    previewWeightUpdate(layer, target, source) {
      return this._calculateUpdate(
        this.weightGradients[layer][target][source],
        this.weightFirstMoments[layer][target][source],
        this.weightSecondMoments[layer][target][source],
        this.optimizerStep + 1
      ).update;
    }

    previewBiasUpdate(layer, neuron) {
      return this._calculateUpdate(
        this.biasGradients[layer][neuron],
        this.biasFirstMoments[layer][neuron],
        this.biasSecondMoments[layer][neuron],
        this.optimizerStep + 1
      ).update;
    }

    applyGradients() {
      this.optimizerStep += 1;
      for (let layer = 1; layer < this.sizes.length; layer += 1) {
        for (let neuron = 0; neuron < this.sizes[layer]; neuron += 1) {
          const biasResult = this._calculateUpdate(
            this.biasGradients[layer][neuron],
            this.biasFirstMoments[layer][neuron],
            this.biasSecondMoments[layer][neuron],
            this.optimizerStep
          );
          this.biasFirstMoments[layer][neuron] = biasResult.firstMoment;
          this.biasSecondMoments[layer][neuron] = biasResult.secondMoment;
          this.biasUpdates[layer][neuron] = biasResult.update;
          this.biases[layer][neuron] += biasResult.update;

          for (let source = 0; source < this.sizes[layer - 1]; source += 1) {
            const weightResult = this._calculateUpdate(
              this.weightGradients[layer][neuron][source],
              this.weightFirstMoments[layer][neuron][source],
              this.weightSecondMoments[layer][neuron][source],
              this.optimizerStep
            );
            this.weightFirstMoments[layer][neuron][source] = weightResult.firstMoment;
            this.weightSecondMoments[layer][neuron][source] = weightResult.secondMoment;
            this.weightUpdates[layer][neuron][source] = weightResult.update;
            this.weights[layer][neuron][source] += weightResult.update;
          }
        }
      }
    }
  }

  window.MLP = MLP;
})();
