"use strict";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: "#29c8d8",
  J: "#4776dc",
  L: "#ee8a32",
  O: "#e8cf45",
  S: "#68be4b",
  T: "#a55bc4",
  Z: "#dc4d4d",
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const canvas = document.querySelector("#gameCanvas");
const context = canvas.getContext("2d");
const nextCanvas = document.querySelector("#nextCanvas");
const nextContext = nextCanvas.getContext("2d");

const scoreElement = document.querySelector("#score");
const linesElement = document.querySelector("#lines");
const levelElement = document.querySelector("#level");
const statusElement = document.querySelector("#status");
const screenMessage = document.querySelector("#screenMessage");
const messageTitle = document.querySelector("#messageTitle");
const messageHint = document.querySelector("#messageHint");
const restartButton = document.querySelector("#restartButton");
const soundButton = document.querySelector("#soundButton");
const soundLabel = document.querySelector("#soundLabel");

class SoundEngine {
  constructor() {
    this.audioContext = null;
    this.enabled = false;
    this.musicTimer = null;
    this.noteIndex = 0;
    this.melody = [
      164.81, 246.94, 220.0, 196.0, 220.0, 164.81, 164.81, 220.0,
      261.63, 246.94, 220.0, 196.0, 220.0, 246.94, 196.0, 164.81,
    ];
  }

  ensureContext() {
    if (!this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return true;
  }

  tone(frequency, duration = 0.08, volume = 0.035, type = "square") {
    if (!this.enabled || !this.ensureContext()) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  startMusic() {
    if (this.musicTimer) return;
    this.noteIndex = 0;
    this.musicTimer = window.setInterval(() => {
      if (!game.paused && !game.gameOver) {
        const note = this.melody[this.noteIndex % this.melody.length];
        this.tone(note, 0.15, 0.018, "square");
        if (this.noteIndex % 4 === 0) {
          this.tone(note / 2, 0.1, 0.012, "triangle");
        }
        this.noteIndex += 1;
      }
    }, 190);
  }

  stopMusic() {
    window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && this.ensureContext()) {
      this.startMusic();
      this.tone(523.25, 0.1, 0.04);
    } else {
      this.stopMusic();
    }
    soundButton.setAttribute("aria-pressed", String(this.enabled));
    soundButton.setAttribute(
      "aria-label",
      this.enabled ? "关闭背景音乐" : "开启背景音乐",
    );
    soundLabel.textContent = this.enabled ? "音乐：开" : "音乐：关";
  }

  move() {
    this.tone(130.81, 0.035, 0.018);
  }

  rotate() {
    this.tone(261.63, 0.05, 0.025);
  }

  drop() {
    this.tone(98.0, 0.07, 0.035, "triangle");
  }

  clear(count) {
    [392.0, 523.25, 659.25, 783.99].slice(0, Math.max(2, count)).forEach((note, index) => {
      window.setTimeout(() => this.tone(note, 0.11, 0.045), index * 70);
    });
  }

  over() {
    [196.0, 164.81, 130.81].forEach((note, index) => {
      window.setTimeout(() => this.tone(note, 0.18, 0.04, "sawtooth"), index * 130);
    });
  }
}

class TetrisGame {
  constructor() {
    this.board = [];
    this.bag = [];
    this.current = null;
    this.next = null;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.paused = false;
    this.gameOver = false;
    this.dropCounter = 0;
    this.lastTime = 0;
    this.animationFrame = null;
  }

  reset() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.paused = false;
    this.gameOver = false;
    this.dropCounter = 0;
    this.lastTime = performance.now();
    this.next = this.createPiece();
    this.spawnPiece();
    this.updateUI();
    this.hideMessage();
    this.draw();

    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame((time) => this.update(time));
  }

  refillBag() {
    const types = Object.keys(SHAPES);
    for (let index = types.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [types[index], types[randomIndex]] = [types[randomIndex], types[index]];
    }
    this.bag.push(...types);
  }

  createPiece() {
    if (this.bag.length === 0) this.refillBag();
    const type = this.bag.shift();
    const matrix = SHAPES[type].map((row) => [...row]);
    return {
      type,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: 0,
    };
  }

  spawnPiece() {
    this.current = this.next;
    this.current.x = Math.floor((COLS - this.current.matrix[0].length) / 2);
    this.current.y = 0;
    this.next = this.createPiece();
    this.drawNext();

    if (this.collides(this.current)) {
      this.endGame();
    }
  }

  collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    return matrix.some((row, rowIndex) =>
      row.some((value, columnIndex) => {
        if (!value) return false;
        const x = piece.x + columnIndex + offsetX;
        const y = piece.y + rowIndex + offsetY;
        return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x]);
      }),
    );
  }

  move(direction) {
    if (this.paused || this.gameOver) return;
    if (!this.collides(this.current, direction, 0)) {
      this.current.x += direction;
      sound.move();
      this.draw();
    }
  }

  softDrop() {
    if (this.paused || this.gameOver) return;
    if (!this.collides(this.current, 0, 1)) {
      this.current.y += 1;
      this.score += 1;
      this.dropCounter = 0;
      this.updateUI();
      this.draw();
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (this.paused || this.gameOver) return;
    let distance = 0;
    while (!this.collides(this.current, 0, distance + 1)) {
      distance += 1;
    }
    this.current.y += distance;
    this.score += distance * 2;
    sound.drop();
    this.lockPiece();
  }

  rotate() {
    if (this.paused || this.gameOver || this.current.type === "O") return;
    const source = this.current.matrix;
    const rotated = source[0].map((_, index) =>
      source.map((row) => row[index]).reverse(),
    );

    const kicks = [0, -1, 1, -2, 2];
    const validKick = kicks.find(
      (offsetX) => !this.collides(this.current, offsetX, 0, rotated),
    );

    if (validKick !== undefined) {
      this.current.matrix = rotated;
      this.current.x += validKick;
      sound.rotate();
      this.draw();
    }
  }

  lockPiece() {
    let lockedAboveBoard = false;
    this.current.matrix.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (!value) return;
        const y = this.current.y + rowIndex;
        const x = this.current.x + columnIndex;
        if (y < 0) {
          lockedAboveBoard = true;
        } else {
          this.board[y][x] = this.current.type;
        }
      });
    });

    if (lockedAboveBoard) {
      this.endGame();
      return;
    }

    const cleared = this.clearLines();
    if (cleared > 0) sound.clear(cleared);
    this.spawnPiece();
    this.dropCounter = 0;
    this.updateUI();
    this.draw();
  }

  clearLines() {
    let cleared = 0;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (this.board[row].every(Boolean)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(COLS).fill(null));
        cleared += 1;
        row += 1;
      }
    }

    if (cleared > 0) {
      // Classic scoring heavily rewards clearing several lines at once.
      const scoring = [0, 40, 100, 300, 1200];
      this.score += scoring[cleared] * this.level;
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
    }
    return cleared;
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
    this.dropCounter = 0;
    this.lastTime = performance.now();
    if (this.paused) {
      this.showMessage("已暂停", "按 P 继续");
    } else {
      this.hideMessage();
    }
    this.updateUI();
  }

  endGame() {
    this.gameOver = true;
    sound.over();
    this.showMessage("游戏结束", "按 R 或点击按钮重新开始");
    this.updateUI();
  }

  showMessage(title, hint) {
    messageTitle.textContent = title;
    messageHint.textContent = hint;
    screenMessage.hidden = false;
  }

  hideMessage() {
    screenMessage.hidden = true;
  }

  updateUI() {
    scoreElement.textContent = String(this.score).padStart(6, "0");
    linesElement.textContent = String(this.lines);
    levelElement.textContent = String(this.level);

    if (this.gameOver) {
      statusElement.textContent = "游戏结束";
      statusElement.dataset.state = "over";
    } else if (this.paused) {
      statusElement.textContent = "已暂停";
      statusElement.dataset.state = "paused";
    } else {
      statusElement.textContent = "游戏中";
      statusElement.dataset.state = "playing";
    }
  }

  dropInterval() {
    return Math.max(100, 850 - (this.level - 1) * 70);
  }

  update(time = 0) {
    const delta = Math.min(time - this.lastTime, 100);
    this.lastTime = time;

    if (!this.paused && !this.gameOver) {
      this.dropCounter += delta;
      if (this.dropCounter >= this.dropInterval()) {
        if (!this.collides(this.current, 0, 1)) {
          this.current.y += 1;
        } else {
          this.lockPiece();
        }
        this.dropCounter = 0;
        this.draw();
      }
    }

    this.animationFrame = requestAnimationFrame((nextTime) => this.update(nextTime));
  }

  ghostY() {
    let offset = 0;
    while (!this.collides(this.current, 0, offset + 1)) {
      offset += 1;
    }
    return this.current.y + offset;
  }

  drawCell(targetContext, x, y, type, size = BLOCK, alpha = 1) {
    const color = COLORS[type];
    const inset = Math.max(2, Math.floor(size * 0.08));
    targetContext.save();
    targetContext.globalAlpha = alpha;
    targetContext.fillStyle = color;
    targetContext.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    targetContext.fillStyle = "rgba(255, 255, 255, 0.28)";
    targetContext.fillRect(
      x * size + inset,
      y * size + inset,
      size - inset * 2,
      Math.max(2, Math.floor(size * 0.1)),
    );
    targetContext.fillRect(
      x * size + inset,
      y * size + inset,
      Math.max(2, Math.floor(size * 0.1)),
      size - inset * 2,
    );
    targetContext.fillStyle = "rgba(0, 0, 0, 0.24)";
    targetContext.fillRect(
      x * size + inset,
      y * size + size - inset - Math.max(2, Math.floor(size * 0.1)),
      size - inset * 2,
      Math.max(2, Math.floor(size * 0.1)),
    );
    targetContext.restore();
  }

  drawMatrix(matrix, offsetX, offsetY, type, alpha = 1) {
    matrix.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (value && offsetY + rowIndex >= 0) {
          this.drawCell(
            context,
            offsetX + columnIndex,
            offsetY + rowIndex,
            type,
            BLOCK,
            alpha,
          );
        }
      });
    });
  }

  drawGrid() {
    context.strokeStyle = "rgba(113, 135, 116, 0.13)";
    context.lineWidth = 1;
    for (let column = 1; column < COLS; column += 1) {
      context.beginPath();
      context.moveTo(column * BLOCK + 0.5, 0);
      context.lineTo(column * BLOCK + 0.5, canvas.height);
      context.stroke();
    }
    for (let row = 1; row < ROWS; row += 1) {
      context.beginPath();
      context.moveTo(0, row * BLOCK + 0.5);
      context.lineTo(canvas.width, row * BLOCK + 0.5);
      context.stroke();
    }
  }

  draw() {
    context.fillStyle = "#0b110d";
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.drawGrid();

    this.board.forEach((row, rowIndex) => {
      row.forEach((type, columnIndex) => {
        if (type) this.drawCell(context, columnIndex, rowIndex, type);
      });
    });

    if (this.current && !this.gameOver) {
      this.drawMatrix(
        this.current.matrix,
        this.current.x,
        this.ghostY(),
        this.current.type,
        0.18,
      );
      this.drawMatrix(
        this.current.matrix,
        this.current.x,
        this.current.y,
        this.current.type,
      );
    }
  }

  drawNext() {
    nextContext.fillStyle = "#0b110d";
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const size = 24;
    const width = this.next.matrix[0].length * size;
    const height = this.next.matrix.length * size;
    const offsetX = (nextCanvas.width - width) / 2;
    const offsetY = (nextCanvas.height - height) / 2;

    this.next.matrix.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (value) {
          this.drawCell(
            nextContext,
            offsetX / size + columnIndex,
            offsetY / size + rowIndex,
            this.next.type,
            size,
          );
        }
      });
    });
  }
}

const sound = new SoundEngine();
const game = new TetrisGame();

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === " " && event.target instanceof HTMLButtonElement) return;
  const handledKeys = ["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "p", "r"];
  if (handledKeys.includes(key)) event.preventDefault();

  if (key === "arrowleft") game.move(-1);
  if (key === "arrowright") game.move(1);
  if (key === "arrowdown") game.softDrop();
  if (key === "arrowup") game.rotate();
  if (key === " ") game.hardDrop();
  if (key === "p") game.togglePause();
  if (key === "r") game.reset();
});

restartButton.addEventListener("click", () => game.reset());
soundButton.addEventListener("click", () => sound.toggle());

document.addEventListener("visibilitychange", () => {
  if (document.hidden && !game.paused && !game.gameOver) {
    game.togglePause();
  }
});

canvas.addEventListener("click", () => canvas.focus());
game.reset();
