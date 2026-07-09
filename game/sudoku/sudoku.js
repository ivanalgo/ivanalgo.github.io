(function () {
  "use strict";

  const N = 9;
  const SIZE = 81;
  const FULL_MASK = 0x3fe;
  const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const DIFFICULTIES = {
    intro: { label: "入门级", clues: 44 },
    middle: { label: "中级", clues: 36 },
    hard: { label: "高级", clues: 30 },
    expert: { label: "骨灰级", clues: 25 },
  };

  const boardEl = document.getElementById("sudoku-board");
  const timerEl = document.getElementById("timer");
  const filledCountEl = document.getElementById("filled-count");
  const messageEl = document.getElementById("game-message");
  const difficultyButtons = document.getElementById("difficulty-buttons");
  const numberPad = document.getElementById("number-pad");
  const noteModeButton = document.getElementById("note-mode-button");
  const candidateToggle = document.getElementById("candidate-toggle");
  const newGameButton = document.getElementById("new-game-button");
  const resetButton = document.getElementById("reset-button");
  const undoButton = document.getElementById("undo-button");
  const checkButton = document.getElementById("check-button");
  const eraseButton = document.getElementById("erase-button");
  const fillCandidatesButton = document.getElementById("fill-candidates-button");
  const clearCandidatesButton = document.getElementById("clear-candidates-button");
  const hintButton = document.getElementById("hint-button");
  const applyHintButton = document.getElementById("apply-hint-button");
  const techniqueNameEl = document.getElementById("technique-name");
  const techniqueCopyEl = document.getElementById("technique-copy");

  const rows = [];
  const cols = [];
  const boxes = [];
  const units = [];
  const cellUnits = Array.from({ length: SIZE }, () => []);
  const peers = Array.from({ length: SIZE }, () => new Set());

  for (let r = 0; r < N; r += 1) {
    const row = [];
    for (let c = 0; c < N; c += 1) row.push(rcToIndex(r, c));
    rows.push(row);
    units.push(row);
  }

  for (let c = 0; c < N; c += 1) {
    const col = [];
    for (let r = 0; r < N; r += 1) col.push(rcToIndex(r, c));
    cols.push(col);
    units.push(col);
  }

  for (let br = 0; br < N; br += 3) {
    for (let bc = 0; bc < N; bc += 3) {
      const box = [];
      for (let r = br; r < br + 3; r += 1) {
        for (let c = bc; c < bc + 3; c += 1) box.push(rcToIndex(r, c));
      }
      boxes.push(box);
      units.push(box);
    }
  }

  units.forEach((unit) => {
    unit.forEach((cell) => {
      cellUnits[cell].push(unit);
      unit.forEach((peer) => {
        if (peer !== cell) peers[cell].add(peer);
      });
    });
  });

  const state = {
    difficulty: "intro",
    puzzle: new Array(SIZE).fill(0),
    solution: new Array(SIZE).fill(0),
    values: new Array(SIZE).fill(0),
    candidates: new Array(SIZE).fill(null),
    selected: 0,
    noteMode: false,
    showCandidates: true,
    startedAt: Date.now(),
    elapsedBeforePause: 0,
    history: [],
    hint: null,
    checked: false,
    busy: false,
  };

  let timerId = null;

  function rcToIndex(r, c) {
    return r * N + c;
  }

  function rowOf(index) {
    return Math.floor(index / N);
  }

  function colOf(index) {
    return index % N;
  }

  function boxOf(index) {
    return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
  }

  function digitBit(digit) {
    return 1 << digit;
  }

  function hasDigit(mask, digit) {
    return Boolean(mask & digitBit(digit));
  }

  function bitCount(mask) {
    let count = 0;
    let value = mask;
    while (value) {
      value &= value - 1;
      count += 1;
    }
    return count;
  }

  function maskDigits(mask) {
    return DIGITS.filter((digit) => hasDigit(mask, digit));
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function cloneArray(arr) {
    return Array.from(arr);
  }

  function computeLegalMask(cell, values) {
    if (values[cell]) return 0;
    let used = 0;
    peers[cell].forEach((peer) => {
      const digit = values[peer];
      if (digit) used |= digitBit(digit);
    });
    return FULL_MASK & ~used;
  }

  function visibleCandidateMask(cell) {
    const noteMask = state.candidates[cell];
    if (noteMask !== null) return noteMask;
    return computeLegalMask(cell, state.values);
  }

  function logicCandidateMasks() {
    return state.values.map((value, cell) => {
      if (value) return 0;
      const legal = computeLegalMask(cell, state.values);
      const noteMask = state.candidates[cell];
      return noteMask === null ? legal : noteMask & legal;
    });
  }

  function isGiven(cell) {
    return state.puzzle[cell] !== 0;
  }

  function pushHistory() {
    state.history.push({
      values: cloneArray(state.values),
      candidates: cloneArray(state.candidates),
      selected: state.selected,
      checked: state.checked,
    });
    if (state.history.length > 120) state.history.shift();
  }

  function restore(snapshot) {
    state.values = cloneArray(snapshot.values);
    state.candidates = cloneArray(snapshot.candidates);
    state.selected = snapshot.selected;
    state.checked = snapshot.checked;
    clearHint();
    render();
  }

  function generateSolvedBoard() {
    const board = new Array(SIZE).fill(0);
    const rowMasks = new Array(N).fill(0);
    const colMasks = new Array(N).fill(0);
    const boxMasks = new Array(N).fill(0);

    function solve() {
      let bestCell = -1;
      let bestMask = 0;
      let bestCount = 10;

      for (let cell = 0; cell < SIZE; cell += 1) {
        if (board[cell]) continue;
        const mask = FULL_MASK & ~(rowMasks[rowOf(cell)] | colMasks[colOf(cell)] | boxMasks[boxOf(cell)]);
        const count = bitCount(mask);
        if (count < bestCount) {
          bestCell = cell;
          bestMask = mask;
          bestCount = count;
          if (count === 1) break;
        }
      }

      if (bestCell === -1) return true;
      if (bestCount === 0) return false;

      for (const digit of shuffle(maskDigits(bestMask))) {
        const bit = digitBit(digit);
        const r = rowOf(bestCell);
        const c = colOf(bestCell);
        const b = boxOf(bestCell);
        board[bestCell] = digit;
        rowMasks[r] |= bit;
        colMasks[c] |= bit;
        boxMasks[b] |= bit;

        if (solve()) return true;

        board[bestCell] = 0;
        rowMasks[r] &= ~bit;
        colMasks[c] &= ~bit;
        boxMasks[b] &= ~bit;
      }

      return false;
    }

    solve();
    return board;
  }

  function countSolutions(puzzle, limit) {
    const board = cloneArray(puzzle);
    const rowMasks = new Array(N).fill(0);
    const colMasks = new Array(N).fill(0);
    const boxMasks = new Array(N).fill(0);
    let count = 0;

    for (let cell = 0; cell < SIZE; cell += 1) {
      const digit = board[cell];
      if (!digit) continue;
      const bit = digitBit(digit);
      const r = rowOf(cell);
      const c = colOf(cell);
      const b = boxOf(cell);
      if ((rowMasks[r] & bit) || (colMasks[c] & bit) || (boxMasks[b] & bit)) return 0;
      rowMasks[r] |= bit;
      colMasks[c] |= bit;
      boxMasks[b] |= bit;
    }

    function solve() {
      if (count >= limit) return;
      let bestCell = -1;
      let bestMask = 0;
      let bestCount = 10;

      for (let cell = 0; cell < SIZE; cell += 1) {
        if (board[cell]) continue;
        const mask = FULL_MASK & ~(rowMasks[rowOf(cell)] | colMasks[colOf(cell)] | boxMasks[boxOf(cell)]);
        const size = bitCount(mask);
        if (size < bestCount) {
          bestCell = cell;
          bestMask = mask;
          bestCount = size;
          if (size === 1) break;
        }
      }

      if (bestCell === -1) {
        count += 1;
        return;
      }

      if (bestCount === 0) return;

      for (const digit of maskDigits(bestMask)) {
        const bit = digitBit(digit);
        const r = rowOf(bestCell);
        const c = colOf(bestCell);
        const b = boxOf(bestCell);
        board[bestCell] = digit;
        rowMasks[r] |= bit;
        colMasks[c] |= bit;
        boxMasks[b] |= bit;

        solve();

        board[bestCell] = 0;
        rowMasks[r] &= ~bit;
        colMasks[c] &= ~bit;
        boxMasks[b] &= ~bit;
        if (count >= limit) return;
      }
    }

    solve();
    return count;
  }

  function makePuzzle(solution, difficultyKey) {
    const targetClues = DIFFICULTIES[difficultyKey].clues;
    const puzzle = cloneArray(solution);
    const seen = new Set();
    const pairs = shuffle(Array.from({ length: SIZE }, (_, index) => index))
      .map((index) => {
        const mirror = SIZE - 1 - index;
        const id = [Math.min(index, mirror), Math.max(index, mirror)].join("-");
        if (seen.has(id)) return null;
        seen.add(id);
        return index === mirror ? [index] : [index, mirror];
      })
      .filter(Boolean);

    let clues = SIZE;
    for (const pair of pairs) {
      if (clues - pair.length < targetClues) continue;
      const removed = pair.map((cell) => puzzle[cell]);
      pair.forEach((cell) => {
        puzzle[cell] = 0;
      });

      if (countSolutions(puzzle, 2) === 1) {
        clues -= pair.length;
      } else {
        pair.forEach((cell, index) => {
          puzzle[cell] = removed[index];
        });
      }
    }

    if (clues > targetClues) {
      for (const cell of shuffle(Array.from({ length: SIZE }, (_, index) => index))) {
        if (clues <= targetClues) break;
        if (!puzzle[cell]) continue;
        const removed = puzzle[cell];
        puzzle[cell] = 0;
        if (countSolutions(puzzle, 2) === 1) {
          clues -= 1;
        } else {
          puzzle[cell] = removed;
        }
      }
    }

    return puzzle;
  }

  function startNewGame(difficultyKey) {
    state.busy = true;
    state.difficulty = difficultyKey;
    document.body.classList.add("loading");
    setMessage(`${DIFFICULTIES[difficultyKey].label} · 生成中`);
    updateDifficultyButtons();

    window.setTimeout(() => {
      const solution = generateSolvedBoard();
      const puzzle = makePuzzle(solution, difficultyKey);
      state.solution = solution;
      state.puzzle = puzzle;
      state.values = cloneArray(puzzle);
      state.candidates = new Array(SIZE).fill(null);
      state.selected = puzzle.findIndex((value) => value === 0);
      if (state.selected < 0) state.selected = 0;
      state.history = [];
      state.checked = false;
      state.hint = null;
      state.startedAt = Date.now();
      state.elapsedBeforePause = 0;
      state.busy = false;
      document.body.classList.remove("loading");
      setMessage(`${DIFFICULTIES[difficultyKey].label} · ${puzzle.filter(Boolean).length} 个已知数`);
      render();
    }, 30);
  }

  function selectCell(cell) {
    if (cell < 0 || cell >= SIZE) return;
    state.selected = cell;
    render();
  }

  function setValue(digit) {
    const cell = state.selected;
    if (isGiven(cell) || state.busy) return;

    if (state.noteMode) {
      toggleCandidate(cell, digit);
      return;
    }

    pushHistory();
    state.values[cell] = state.values[cell] === digit ? 0 : digit;
    state.candidates[cell] = null;
    cleanPeers(cell, digit);
    state.checked = false;
    clearHint();
    render();
    checkCompletion();
  }

  function cleanPeers(cell, digit) {
    if (!digit) return;
    const bit = digitBit(digit);
    peers[cell].forEach((peer) => {
      if (state.candidates[peer] !== null) state.candidates[peer] &= ~bit;
    });
  }

  function toggleCandidate(cell, digit) {
    if (state.values[cell] || isGiven(cell) || state.busy) return;
    pushHistory();
    const bit = digitBit(digit);
    const current = state.candidates[cell] === null ? visibleCandidateMask(cell) : state.candidates[cell];
    state.candidates[cell] = current & bit ? current & ~bit : current | bit;
    state.checked = false;
    clearHint();
    render();
  }

  function eraseSelected() {
    const cell = state.selected;
    if (isGiven(cell) || state.busy) return;
    pushHistory();
    if (state.values[cell]) {
      state.values[cell] = 0;
      state.candidates[cell] = null;
    } else {
      state.candidates[cell] = 0;
    }
    state.checked = false;
    clearHint();
    render();
  }

  function fillAllCandidates() {
    pushHistory();
    for (let cell = 0; cell < SIZE; cell += 1) {
      state.candidates[cell] = state.values[cell] ? null : computeLegalMask(cell, state.values);
    }
    state.showCandidates = true;
    candidateToggle.checked = true;
    clearHint();
    render();
  }

  function clearAllCandidates() {
    pushHistory();
    for (let cell = 0; cell < SIZE; cell += 1) {
      if (!state.values[cell]) state.candidates[cell] = 0;
    }
    clearHint();
    render();
  }

  function resetGame() {
    pushHistory();
    state.values = cloneArray(state.puzzle);
    state.candidates = new Array(SIZE).fill(null);
    state.checked = false;
    state.hint = null;
    state.startedAt = Date.now();
    state.elapsedBeforePause = 0;
    setMessage(`${DIFFICULTIES[state.difficulty].label} · 已重置`);
    render();
  }

  function undo() {
    const snapshot = state.history.pop();
    if (!snapshot) {
      setMessage("没有可撤销步骤");
      return;
    }
    restore(snapshot);
    setMessage("已撤销");
  }

  function checkBoard() {
    state.checked = true;
    const wrongCells = state.values.reduce((sum, value, cell) => {
      return sum + (value && value !== state.solution[cell] ? 1 : 0);
    }, 0);
    if (wrongCells === 0) {
      setMessage("当前填写正确");
    } else {
      setMessage(`${wrongCells} 个格子需要修正`);
    }
    render();
  }

  function checkCompletion() {
    const complete = state.values.every((value, cell) => value === state.solution[cell]);
    if (complete) {
      setMessage(`完成 · ${timerEl.textContent}`);
      state.checked = true;
      render();
    }
  }

  function conflictCells() {
    const conflicts = new Set();
    for (const unit of units) {
      const seen = new Map();
      for (const cell of unit) {
        const digit = state.values[cell];
        if (!digit) continue;
        if (!seen.has(digit)) {
          seen.set(digit, [cell]);
        } else {
          seen.get(digit).push(cell);
        }
      }
      seen.forEach((cells) => {
        if (cells.length > 1) cells.forEach((cell) => conflicts.add(cell));
      });
    }
    return conflicts;
  }

  function findNakedSingle(masks) {
    for (let cell = 0; cell < SIZE; cell += 1) {
      if (bitCount(masks[cell]) === 1) {
        const digit = maskDigits(masks[cell])[0];
        return {
          type: "fill",
          name: "唯一候选",
          copy: `R${rowOf(cell) + 1}C${colOf(cell) + 1} 只剩 ${digit}。`,
          focus: [cell],
          placements: [{ cell, digit }],
          eliminations: [],
        };
      }
    }
    return null;
  }

  function findHiddenSingle(masks) {
    for (const unit of units) {
      for (const digit of DIGITS) {
        const cells = unit.filter((cell) => hasDigit(masks[cell], digit));
        if (cells.length === 1) {
          const cell = cells[0];
          return {
            type: "fill",
            name: "隐性唯一",
            copy: `${unitName(unit)} 中只有 R${rowOf(cell) + 1}C${colOf(cell) + 1} 能放 ${digit}。`,
            focus: [cell],
            placements: [{ cell, digit }],
            eliminations: [],
          };
        }
      }
    }
    return null;
  }

  function findNakedPair(masks) {
    for (const unit of units) {
      const pairs = new Map();
      for (const cell of unit) {
        const mask = masks[cell];
        if (bitCount(mask) !== 2) continue;
        const key = String(mask);
        if (!pairs.has(key)) pairs.set(key, []);
        pairs.get(key).push(cell);
      }

      for (const [key, cells] of pairs.entries()) {
        if (cells.length !== 2) continue;
        const mask = Number(key);
        const eliminations = unit
          .filter((cell) => !cells.includes(cell) && (masks[cell] & mask))
          .flatMap((cell) => maskDigits(masks[cell] & mask).map((digit) => ({ cell, digit })));
        if (eliminations.length) {
          return {
            type: "eliminate",
            name: "数对删减",
            copy: `${unitName(unit)} 的 ${cellName(cells[0])}、${cellName(cells[1])} 锁定 ${maskDigits(mask).join("/")}。`,
            focus: cells,
            placements: [],
            eliminations,
          };
        }
      }
    }
    return null;
  }

  function findPointing(masks) {
    for (const box of boxes) {
      for (const digit of DIGITS) {
        const cells = box.filter((cell) => hasDigit(masks[cell], digit));
        if (cells.length < 2) continue;
        const sameRow = cells.every((cell) => rowOf(cell) === rowOf(cells[0]));
        const sameCol = cells.every((cell) => colOf(cell) === colOf(cells[0]));

        if (sameRow) {
          const row = rows[rowOf(cells[0])];
          const eliminations = row
            .filter((cell) => !box.includes(cell) && hasDigit(masks[cell], digit))
            .map((cell) => ({ cell, digit }));
          if (eliminations.length) {
            return {
              type: "eliminate",
              name: "区块排除",
              copy: `${unitName(box)} 的 ${digit} 被锁定在第 ${rowOf(cells[0]) + 1} 行。`,
              focus: cells,
              placements: [],
              eliminations,
            };
          }
        }

        if (sameCol) {
          const col = cols[colOf(cells[0])];
          const eliminations = col
            .filter((cell) => !box.includes(cell) && hasDigit(masks[cell], digit))
            .map((cell) => ({ cell, digit }));
          if (eliminations.length) {
            return {
              type: "eliminate",
              name: "区块排除",
              copy: `${unitName(box)} 的 ${digit} 被锁定在第 ${colOf(cells[0]) + 1} 列。`,
              focus: cells,
              placements: [],
              eliminations,
            };
          }
        }
      }
    }
    return null;
  }

  function findBoxLineReduction(masks) {
    const lineUnits = rows.concat(cols);
    for (const unit of lineUnits) {
      for (const digit of DIGITS) {
        const cells = unit.filter((cell) => hasDigit(masks[cell], digit));
        if (cells.length < 2) continue;
        const sameBox = cells.every((cell) => boxOf(cell) === boxOf(cells[0]));
        if (!sameBox) continue;
        const box = boxes[boxOf(cells[0])];
        const eliminations = box
          .filter((cell) => !unit.includes(cell) && hasDigit(masks[cell], digit))
          .map((cell) => ({ cell, digit }));
        if (eliminations.length) {
          return {
            type: "eliminate",
            name: "行列锁定",
            copy: `${unitName(unit)} 的 ${digit} 只能落在 ${unitName(box)}。`,
            focus: cells,
            placements: [],
            eliminations,
          };
        }
      }
    }
    return null;
  }

  function findXWing(masks) {
    for (const digit of DIGITS) {
      const rowPairs = rows
        .map((row, rowIndex) => ({
          rowIndex,
          cols: row.filter((cell) => hasDigit(masks[cell], digit)).map(colOf),
        }))
        .filter((item) => item.cols.length === 2);

      for (let i = 0; i < rowPairs.length; i += 1) {
        for (let j = i + 1; j < rowPairs.length; j += 1) {
          if (rowPairs[i].cols.join(",") !== rowPairs[j].cols.join(",")) continue;
          const [c1, c2] = rowPairs[i].cols;
          const focus = [rcToIndex(rowPairs[i].rowIndex, c1), rcToIndex(rowPairs[i].rowIndex, c2), rcToIndex(rowPairs[j].rowIndex, c1), rcToIndex(rowPairs[j].rowIndex, c2)];
          const eliminations = rows
            .flatMap((row, r) => (r === rowPairs[i].rowIndex || r === rowPairs[j].rowIndex ? [] : [rcToIndex(r, c1), rcToIndex(r, c2)]))
            .filter((cell) => hasDigit(masks[cell], digit))
            .map((cell) => ({ cell, digit }));
          if (eliminations.length) {
            return {
              type: "eliminate",
              name: "X-Wing",
              copy: `${digit} 在第 ${rowPairs[i].rowIndex + 1}/${rowPairs[j].rowIndex + 1} 行形成矩形。`,
              focus,
              placements: [],
              eliminations,
            };
          }
        }
      }

      const colPairs = cols
        .map((col, colIndex) => ({
          colIndex,
          rows: col.filter((cell) => hasDigit(masks[cell], digit)).map(rowOf),
        }))
        .filter((item) => item.rows.length === 2);

      for (let i = 0; i < colPairs.length; i += 1) {
        for (let j = i + 1; j < colPairs.length; j += 1) {
          if (colPairs[i].rows.join(",") !== colPairs[j].rows.join(",")) continue;
          const [r1, r2] = colPairs[i].rows;
          const focus = [rcToIndex(r1, colPairs[i].colIndex), rcToIndex(r2, colPairs[i].colIndex), rcToIndex(r1, colPairs[j].colIndex), rcToIndex(r2, colPairs[j].colIndex)];
          const eliminations = cols
            .flatMap((col, c) => (c === colPairs[i].colIndex || c === colPairs[j].colIndex ? [] : [rcToIndex(r1, c), rcToIndex(r2, c)]))
            .filter((cell) => hasDigit(masks[cell], digit))
            .map((cell) => ({ cell, digit }));
          if (eliminations.length) {
            return {
              type: "eliminate",
              name: "X-Wing",
              copy: `${digit} 在第 ${colPairs[i].colIndex + 1}/${colPairs[j].colIndex + 1} 列形成矩形。`,
              focus,
              placements: [],
              eliminations,
            };
          }
        }
      }
    }
    return null;
  }

  function findHint() {
    const masks = logicCandidateMasks();
    const detectors = [findNakedSingle, findHiddenSingle, findNakedPair, findPointing, findBoxLineReduction, findXWing];
    for (const detector of detectors) {
      const hint = detector(masks);
      if (hint) return hint;
    }
    return null;
  }

  function scanHint() {
    const hint = findHint();
    state.hint = hint;
    if (hint) {
      techniqueNameEl.textContent = hint.name;
      techniqueCopyEl.textContent = hint.copy;
      applyHintButton.disabled = false;
      setMessage(`${hint.name} · 已高亮`);
    } else {
      techniqueNameEl.textContent = "暂无可见技巧";
      techniqueCopyEl.textContent = "当前候选状态下没有扫描到可应用技巧。";
      applyHintButton.disabled = true;
      setMessage("没有扫描到可应用技巧");
    }
    render();
  }

  function applyHint() {
    if (!state.hint) return;
    pushHistory();
    if (state.hint.type === "fill") {
      for (const item of state.hint.placements) {
        state.values[item.cell] = item.digit;
        state.candidates[item.cell] = null;
        cleanPeers(item.cell, item.digit);
      }
    } else {
      for (const item of state.hint.eliminations) {
        if (state.values[item.cell]) continue;
        const current = state.candidates[item.cell] === null ? visibleCandidateMask(item.cell) : state.candidates[item.cell];
        state.candidates[item.cell] = current & ~digitBit(item.digit);
      }
      state.showCandidates = true;
      candidateToggle.checked = true;
    }
    clearHint();
    render();
    checkCompletion();
  }

  function clearHint() {
    state.hint = null;
    techniqueNameEl.textContent = "等待扫描";
    techniqueCopyEl.textContent = "尚未扫描。";
    applyHintButton.disabled = true;
  }

  function unitName(unit) {
    if (rows.includes(unit)) return `第 ${rows.indexOf(unit) + 1} 行`;
    if (cols.includes(unit)) return `第 ${cols.indexOf(unit) + 1} 列`;
    return `第 ${boxes.indexOf(unit) + 1} 宫`;
  }

  function cellName(cell) {
    return `R${rowOf(cell) + 1}C${colOf(cell) + 1}`;
  }

  function setMessage(text) {
    messageEl.textContent = text;
  }

  function updateDifficultyButtons() {
    difficultyButtons.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.difficulty === state.difficulty);
    });
  }

  function render() {
    const selectedValue = state.values[state.selected];
    const conflictSet = conflictCells();
    const hintFocus = new Set(state.hint ? state.hint.focus : []);
    const hintEliminateCells = new Set(state.hint ? state.hint.eliminations.map((item) => item.cell) : []);
    const hintTargets = new Set(state.hint ? state.hint.placements.map((item) => `${item.cell}:${item.digit}`) : []);
    const hintEliminations = new Set(state.hint ? state.hint.eliminations.map((item) => `${item.cell}:${item.digit}`) : []);

    boardEl.innerHTML = "";
    for (let cell = 0; cell < SIZE; cell += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.dataset.cell = String(cell);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${cellName(cell)} ${state.values[cell] || "空"}`);

      if (colOf(cell) === 2 || colOf(cell) === 5) button.classList.add("thick-right");
      if (rowOf(cell) === 2 || rowOf(cell) === 5) button.classList.add("thick-bottom");
      if (isGiven(cell)) button.classList.add("given");
      if (!isGiven(cell) && state.values[cell]) button.classList.add("user-value");
      if (cell === state.selected) button.classList.add("selected");
      if (cell !== state.selected && peers[state.selected].has(cell)) button.classList.add("peer");
      if (selectedValue && state.values[cell] === selectedValue && cell !== state.selected) button.classList.add("same");
      if (state.checked && state.values[cell] && state.values[cell] !== state.solution[cell]) button.classList.add("wrong");
      if (conflictSet.has(cell)) button.classList.add("conflict");
      if (hintFocus.has(cell)) button.classList.add("hint-focus");
      if (hintEliminateCells.has(cell)) button.classList.add("hint-eliminate");

      if (state.values[cell]) {
        const value = document.createElement("span");
        value.className = "value";
        value.textContent = String(state.values[cell]);
        button.appendChild(value);
      } else if (state.showCandidates) {
        const grid = document.createElement("span");
        grid.className = "candidates";
        const mask = visibleCandidateMask(cell);
        for (const digit of DIGITS) {
          const mark = document.createElement("span");
          mark.className = "candidate";
          mark.dataset.cell = String(cell);
          mark.dataset.digit = String(digit);
          if (hasDigit(mask, digit)) {
            mark.textContent = String(digit);
            mark.classList.add("filled");
          }
          if (hintTargets.has(`${cell}:${digit}`)) mark.classList.add("target");
          if (hintEliminations.has(`${cell}:${digit}`)) mark.classList.add("eliminate");
          grid.appendChild(mark);
        }
        button.appendChild(grid);
      }

      boardEl.appendChild(button);
    }

    filledCountEl.textContent = `${state.values.filter(Boolean).length}/81`;
    noteModeButton.classList.toggle("active", state.noteMode);
    noteModeButton.setAttribute("aria-pressed", String(state.noteMode));
    candidateToggle.checked = state.showCandidates;
    undoButton.disabled = state.history.length === 0;
  }

  function updateTimer() {
    const seconds = Math.max(0, Math.floor((Date.now() - state.startedAt + state.elapsedBeforePause) / 1000));
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = `${mins}:${secs}`;
  }

  function moveSelection(key) {
    let r = rowOf(state.selected);
    let c = colOf(state.selected);
    if (key === "ArrowUp") r = Math.max(0, r - 1);
    if (key === "ArrowDown") r = Math.min(8, r + 1);
    if (key === "ArrowLeft") c = Math.max(0, c - 1);
    if (key === "ArrowRight") c = Math.min(8, c + 1);
    selectCell(rcToIndex(r, c));
  }

  boardEl.addEventListener("click", (event) => {
    const candidate = event.target.closest(".candidate");
    if (candidate && candidate.dataset.digit) {
      const cell = Number(candidate.dataset.cell);
      const digit = Number(candidate.dataset.digit);
      selectCell(cell);
      toggleCandidate(cell, digit);
      return;
    }

    const cellButton = event.target.closest(".cell");
    if (!cellButton) return;
    selectCell(Number(cellButton.dataset.cell));
  });

  boardEl.addEventListener("contextmenu", (event) => {
    const cellButton = event.target.closest(".cell");
    if (!cellButton) return;
    event.preventDefault();
    const cell = Number(cellButton.dataset.cell);
    selectCell(cell);
    state.noteMode = !state.noteMode;
    render();
  });

  numberPad.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-number]");
    if (!button) return;
    setValue(Number(button.dataset.number));
  });

  difficultyButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-difficulty]");
    if (!button || button.dataset.difficulty === state.difficulty) return;
    startNewGame(button.dataset.difficulty);
  });

  noteModeButton.addEventListener("click", () => {
    state.noteMode = !state.noteMode;
    render();
  });

  candidateToggle.addEventListener("change", () => {
    state.showCandidates = candidateToggle.checked;
    render();
  });

  newGameButton.addEventListener("click", () => startNewGame(state.difficulty));
  resetButton.addEventListener("click", resetGame);
  undoButton.addEventListener("click", undo);
  checkButton.addEventListener("click", checkBoard);
  eraseButton.addEventListener("click", eraseSelected);
  fillCandidatesButton.addEventListener("click", fillAllCandidates);
  clearCandidatesButton.addEventListener("click", clearAllCandidates);
  hintButton.addEventListener("click", scanHint);
  applyHintButton.addEventListener("click", applyHint);

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key >= "1" && event.key <= "9") {
      setValue(Number(event.key));
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      eraseSelected();
      return;
    }
    if (event.key === "n" || event.key === "N") {
      state.noteMode = !state.noteMode;
      render();
      return;
    }
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      moveSelection(event.key);
    }
  });

  updateDifficultyButtons();
  timerId = window.setInterval(updateTimer, 1000);
  startNewGame("intro");

  window.addEventListener("beforeunload", () => {
    if (timerId) window.clearInterval(timerId);
  });
})();
