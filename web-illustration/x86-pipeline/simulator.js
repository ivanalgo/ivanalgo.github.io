(function () {
  "use strict";

  const REGISTERS = ["RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "R8", "R9"];
  const CLASSIC_STAGES = ["IF", "ID", "EX", "MEM", "WB"];
  const OOO_STAGES = ["Fetch", "Decode", "Rename", "Dispatch", "Issue", "Execute", "Memory", "Writeback", "Retire"];
  const LATENCY = { IMUL: 3, MUL: 3, MOV: 1, ADD: 1, SUB: 1, AND: 1, OR: 1, XOR: 1, CMP: 1, JMP: 1, JZ: 1, JNZ: 1, NOP: 1 };

  function isRegister(value) {
    return REGISTERS.includes(String(value || "").toUpperCase());
  }

  function isMemory(value) {
    return /^\[(?:0x[\da-f]+|\d+)\]$/i.test(String(value || "").trim());
  }

  function numberValue(value) {
    const text = String(value || "").trim();
    return /^-?0x/i.test(text) ? Number.parseInt(text, 16) : Number(text);
  }

  function memoryAddress(value) {
    return numberValue(String(value).trim().slice(1, -1));
  }

  function isStore(instr) {
    return instr.op === "MOV" && isMemory(instr.args[0]);
  }

  function isLoad(instr) {
    return instr.op === "MOV" && isRegister(instr.args[0]) && isMemory(instr.args[1]);
  }

  function parseProgram(source) {
    const labels = {};
    const rows = [];
    source.split(/\r?\n/).forEach((raw, lineIndex) => {
      const clean = raw.replace(/;.*/, "").trim();
      if (!clean) return;
      let rest = clean;
      const labelMatch = rest.match(/^([A-Za-z_]\w*):\s*(.*)$/);
      if (labelMatch) {
        labels[labelMatch[1].toLowerCase()] = rows.length;
        rest = labelMatch[2].trim();
      }
      if (rest) rows.push({ text: rest, line: lineIndex + 1 });
    });

    return rows.map((row, pc) => {
      const match = row.text.match(/^([A-Za-z]+)\s*(.*)$/);
      if (!match) throw new Error(`第 ${row.line} 行无法解析`);
      const op = match[1].toUpperCase();
      const args = match[2] ? match[2].split(",").map((item) => item.trim().toUpperCase()) : [];
      const supported = ["MOV", "ADD", "SUB", "IMUL", "MUL", "AND", "OR", "XOR", "CMP", "JMP", "JZ", "JNZ", "NOP"];
      if (!supported.includes(op)) throw new Error(`第 ${row.line} 行：暂不支持 ${op}`);
      if (["JMP", "JZ", "JNZ"].includes(op)) {
        const key = String(args[0] || "").toLowerCase();
        if (labels[key] === undefined && !Number.isFinite(numberValue(key))) {
          throw new Error(`第 ${row.line} 行：找不到标签 ${args[0]}`);
        }
      }

      const dstReg = op === "CMP"
        ? "FLAGS"
        : ["MOV", "ADD", "SUB", "IMUL", "MUL", "AND", "OR", "XOR"].includes(op) && isRegister(args[0])
          ? args[0]
          : null;
      const srcRegs = [];
      if (["ADD", "SUB", "IMUL", "MUL", "AND", "OR", "XOR"].includes(op) && isRegister(args[0])) srcRegs.push(args[0]);
      if (["MOV", "ADD", "SUB", "IMUL", "MUL", "AND", "OR", "XOR"].includes(op) && isRegister(args[1])) srcRegs.push(args[1]);
      if (op === "MOV" && isMemory(args[0]) && isRegister(args[1])) srcRegs.push(args[1]);
      if (op === "CMP") args.slice(0, 2).forEach((arg) => { if (isRegister(arg)) srcRegs.push(arg); });
      if (["JZ", "JNZ"].includes(op)) srcRegs.push("FLAGS");

      return {
        pc,
        op,
        args,
        text: row.text,
        dstReg,
        srcRegs: [...new Set(srcRegs)],
        target: ["JMP", "JZ", "JNZ"].includes(op)
          ? (labels[String(args[0]).toLowerCase()] ?? numberValue(args[0]))
          : null,
        latency: LATENCY[op] || 1,
        memory: args.some(isMemory),
        branch: ["JMP", "JZ", "JNZ"].includes(op),
      };
    });
  }

  class Simulator {
    constructor(program, options = {}) {
      this.program = program;
      this.mode = options.mode || "classic";
      this.issueWidth = Number(options.issueWidth) || 2;
      this.predictorMode = options.predictor || "two-bit";
      this.stages = this.mode === "classic" ? CLASSIC_STAGES : OOO_STAGES;
      this.regs = Object.fromEntries(REGISTERS.map((reg) => [reg, 0]));
      this.regs.FLAGS = { zf: false, sf: false };
      const architecturalNames = [...REGISTERS, "FLAGS"];
      this.prf = {};
      this.rat = {};
      this.committedMap = {};
      architecturalNames.forEach((reg, index) => {
        const physical = `P${index}`;
        this.prf[physical] = { value: this.regs[reg], ready: true, owner: null };
        this.rat[reg] = physical;
        this.committedMap[reg] = physical;
      });
      this.freeList = Array.from({ length: 128 - architecturalNames.length }, (_, index) =>
        `P${index + architecturalNames.length}`
      );
      this.memory = { 100: 13, 104: 0, 108: 7 };
      this.cycle = 0;
      this.pc = 0;
      this.nextSeq = 1;
      this.active = [];
      this.all = [];
      this.rob = [];
      this.rs = [];
      this.predictor = {};
      this.retired = 0;
      this.stalls = 0;
      this.flushes = 0;
      this.branches = 0;
      this.mispredicts = 0;
      this.events = ["处理器已复位，等待第一个时钟周期。"];
      this.lastTransitions = [];
      this.halted = false;
    }

    predict(instr) {
      if (!instr.branch) return false;
      if (instr.op === "JMP") return true;
      if (this.predictorMode === "static") return false;
      return (this.predictor[instr.pc] ?? 1) >= 2;
    }

    updatePredictor(instr, taken) {
      if (!instr.branch || instr.op === "JMP") return;
      const old = this.predictor[instr.pc] ?? 1;
      this.predictor[instr.pc] = Math.max(0, Math.min(3, old + (taken ? 1 : -1)));
    }

    fetchOne(stage) {
      if (this.pc < 0 || this.pc >= this.program.length) return null;
      const instr = this.program[this.pc];
      const dyn = {
        seq: this.nextSeq++,
        instr,
        stage,
        remaining: instr.latency,
        predictedTaken: this.predict(instr),
        predictedTarget: instr.target,
        sourceValues: {},
        sourceTags: {},
        sourceOrigins: {},
        pdst: null,
        oldPdst: null,
        result: null,
        ready: false,
        timeline: {},
        stall: "",
      };
      this.pc = dyn.predictedTaken ? instr.target : instr.pc + 1;
      this.active.push(dyn);
      this.all.push(dyn);
      return dyn;
    }

    operandValue(operand, values = this.regs) {
      if (isRegister(operand)) return values[operand] ?? this.regs[operand] ?? 0;
      if (isMemory(operand)) return this.memory[memoryAddress(operand)] ?? 0;
      return numberValue(operand);
    }

    compute(dyn) {
      const { op, args } = dyn.instr;
      const values = { ...this.regs, ...dyn.sourceValues };
      const left = this.operandValue(args[0], values);
      const right = this.operandValue(args[1], values);
      if (op === "MOV") return isMemory(args[0]) ? { address: memoryAddress(args[0]), value: right } : right;
      if (op === "ADD") return left + right;
      if (op === "SUB") return left - right;
      if (op === "IMUL" || op === "MUL") return left * right;
      if (op === "AND") return left & right;
      if (op === "OR") return left | right;
      if (op === "XOR") return left ^ right;
      if (op === "CMP") {
        const result = left - right;
        return { zf: result === 0, sf: result < 0 };
      }
      if (op === "JMP") return true;
      if (op === "JZ") return Boolean(values.FLAGS && values.FLAGS.zf);
      if (op === "JNZ") return !Boolean(values.FLAGS && values.FLAGS.zf);
      return null;
    }

    commit(dyn) {
      const { instr, result } = dyn;
      if (instr.dstReg) {
        this.regs[instr.dstReg] = result;
        if (this.mode === "ooo" && dyn.pdst) {
          this.committedMap[instr.dstReg] = dyn.pdst;
          if (dyn.oldPdst && dyn.oldPdst !== dyn.pdst) this.releasePhysical(dyn.oldPdst);
        }
      }
      if (instr.op === "MOV" && isMemory(instr.args[0]) && result) this.memory[result.address] = result.value;
      this.retired += 1;
      dyn.stage = "Retired";
    }

    resolveBranch(dyn) {
      const actualTaken = Boolean(dyn.result);
      this.branches += 1;
      this.updatePredictor(dyn.instr, actualTaken);
      if (actualTaken !== dyn.predictedTaken) {
        this.mispredicts += 1;
        this.flushes += 1;
        const younger = this.active.filter((item) => item.seq > dyn.seq);
        younger.forEach((item) => {
          item.stage = "Flushed";
          item.timeline[this.cycle] = "FL";
        });
        this.active = this.active.filter((item) => item.seq <= dyn.seq);
        this.rob = this.rob.filter((item) => item.seq <= dyn.seq);
        this.rs = this.rs.filter((item) => item.seq <= dyn.seq);
        this.rebuildRat();
        younger.forEach((item) => { if (item.pdst) this.releasePhysical(item.pdst); });
        this.pc = actualTaken ? dyn.instr.target : dyn.instr.pc + 1;
        this.events.unshift(`C${this.cycle}: #${dyn.seq} 分支预测错误，冲刷 ${younger.length} 条年轻指令。`);
      } else {
        this.events.unshift(`C${this.cycle}: #${dyn.seq} 分支预测正确。`);
      }
    }

    rebuildRat() {
      this.rat = { ...this.committedMap };
      this.rob.forEach((entry) => {
        if (entry.instr.dstReg && entry.pdst) this.rat[entry.instr.dstReg] = entry.pdst;
      });
    }

    releasePhysical(physical) {
      if (!physical || this.freeList.includes(physical)) return;
      const stillMapped = Object.values(this.rat).includes(physical)
        || Object.values(this.committedMap).includes(physical);
      if (!stillMapped) {
        this.prf[physical] = { value: null, ready: false, owner: null };
        this.freeList.push(physical);
      }
    }

    step() {
      if (this.halted) return;
      const before = new Map(this.all.map((dyn) => [dyn.seq, dyn.stage]));
      this.cycle += 1;
      if (this.mode === "classic") this.stepClassic();
      else this.stepOOO();
      this.active.forEach((dyn) => {
        if (!dyn.timeline[this.cycle]) dyn.timeline[this.cycle] = dyn.stall ? "ST" : dyn.stage;
      });
      this.lastTransitions = this.all
        .filter((dyn) => (before.get(dyn.seq) || "Program") !== dyn.stage)
        .map((dyn) => ({
          seq: dyn.seq,
          from: before.get(dyn.seq) || "Program",
          to: dyn.stage,
          text: dyn.instr.text,
        }));
      this.events = this.events.slice(0, 8);
      this.halted = this.pc >= this.program.length && this.active.length === 0 && this.rob.length === 0;
    }

    stepClassic() {
      this.active.forEach((dyn) => { dyn.stall = ""; });
      const at = (stage) => this.active.find((dyn) => dyn.stage === stage);
      const wb = at("WB");
      if (wb) {
        this.commit(wb);
        this.active = this.active.filter((dyn) => dyn !== wb);
      }
      const mem = at("MEM");
      if (mem && !at("WB")) mem.stage = "WB";
      const ex = at("EX");
      if (ex) {
        ex.remaining -= 1;
        if (ex.remaining <= 0 && !at("MEM")) {
          ex.result = this.compute(ex);
          if (ex.instr.branch) this.resolveBranch(ex);
          ex.stage = "MEM";
        } else if (ex.remaining > 0) {
          ex.stall = `${ex.instr.op} 还需 ${ex.remaining} 周期`;
        }
      }
      const id = at("ID");
      if (id && !at("EX")) {
        const registerBlock = id.instr.srcRegs.find((reg) =>
          this.active.some((older) => older.seq < id.seq && older.instr.dstReg === reg)
        );
        const blocked = registerBlock || (
          isLoad(id.instr)
          && this.active.some((older) => older.seq < id.seq && isStore(older.instr))
          ? "older STORE"
          : null
        );
        if (blocked) {
          id.stall = `RAW：等待 ${blocked}`;
          this.stalls += 1;
        } else {
          id.instr.srcRegs.forEach((reg) => { id.sourceValues[reg] = this.regs[reg]; });
          id.stage = "EX";
          id.remaining = id.instr.latency;
        }
      }
      const fetched = at("IF");
      if (fetched && !at("ID")) fetched.stage = "ID";
      if (!at("IF")) this.fetchOne("IF");
    }

    allocateOOO(dyn) {
      if (this.rob.length >= 16 || this.rs.length >= 10) return false;
      if (dyn.instr.dstReg && this.freeList.length === 0) return false;
      dyn.instr.srcRegs.forEach((reg) => {
        const physical = this.rat[reg];
        const committed = physical === this.committedMap[reg];
        const entry = this.prf[physical];
        if (committed) {
          dyn.sourceValues[reg] = this.regs[reg];
          dyn.sourceOrigins[reg] = "ARF";
        } else if (entry && entry.ready) {
          dyn.sourceValues[reg] = entry.value;
          dyn.sourceOrigins[reg] = physical;
        } else {
          dyn.sourceTags[reg] = physical;
          dyn.sourceOrigins[reg] = physical;
        }
      });
      if (dyn.instr.dstReg) {
        dyn.oldPdst = this.rat[dyn.instr.dstReg];
        dyn.pdst = this.freeList.shift();
        this.rat[dyn.instr.dstReg] = dyn.pdst;
        this.prf[dyn.pdst] = { value: null, ready: false, owner: dyn.seq };
      }
      this.rob.push(dyn);
      this.rs.push(dyn);
      dyn.stage = "Dispatch";
      return true;
    }

    broadcast(dyn) {
      if (dyn.pdst) {
        this.prf[dyn.pdst] = { value: dyn.result, ready: true, owner: dyn.seq };
      }
      this.rs.forEach((waiting) => {
        Object.entries(waiting.sourceTags).forEach(([reg, tag]) => {
          if (tag === dyn.pdst) {
            waiting.sourceValues[reg] = dyn.result;
            waiting.sourceOrigins[reg] = dyn.pdst;
            delete waiting.sourceTags[reg];
          }
        });
      });
    }

    stepOOO() {
      this.active.forEach((dyn) => { dyn.stall = ""; });

      let retiredThisCycle = 0;
      while (this.rob[0] && this.rob[0].ready && retiredThisCycle < this.issueWidth) {
        const head = this.rob.shift();
        this.commit(head);
        this.active = this.active.filter((dyn) => dyn !== head);
        retiredThisCycle += 1;
      }

      this.active.filter((dyn) => dyn.stage === "Writeback").forEach((dyn) => {
        dyn.ready = true;
        dyn.stage = "Retire";
        this.broadcast(dyn);
        this.rs = this.rs.filter((entry) => entry !== dyn);
      });
      this.active.filter((dyn) => dyn.stage === "Memory").forEach((dyn) => { dyn.stage = "Writeback"; });
      this.active.filter((dyn) => dyn.stage === "Execute").forEach((dyn) => {
        if (!this.active.includes(dyn)) return;
        dyn.remaining -= 1;
        if (dyn.remaining <= 0) {
          dyn.result = this.compute(dyn);
          if (dyn.instr.branch) this.resolveBranch(dyn);
          dyn.stage = dyn.instr.memory ? "Memory" : "Writeback";
        }
      });

      const usedUnits = new Set();
      const unit = (dyn) => dyn.instr.memory ? "MEM" : (["IMUL", "MUL"].includes(dyn.instr.op) ? "MUL" : dyn.instr.branch ? "BR" : "ALU");
      const ready = this.rs
        .filter((dyn) =>
          dyn.stage === "Issue"
          && Object.keys(dyn.sourceTags).length === 0
          && (!isLoad(dyn.instr) || !this.rob.some((older) => older.seq < dyn.seq && isStore(older.instr)))
          && (!dyn.instr.branch || !this.rob.some((older) => older.seq < dyn.seq && older.instr.branch && !older.ready))
        )
        .sort((a, b) => a.seq - b.seq);
      let issued = 0;
      ready.forEach((dyn) => {
        const fu = unit(dyn);
        if (issued >= this.issueWidth || usedUnits.has(fu)) return;
        usedUnits.add(fu);
        dyn.stage = "Execute";
        dyn.remaining = dyn.instr.latency;
        issued += 1;
      });

      this.active.filter((dyn) => dyn.stage === "Dispatch").forEach((dyn) => { dyn.stage = "Issue"; });
      const renameCapacity = this.issueWidth;
      this.active.filter((dyn) => dyn.stage === "Rename").slice(0, renameCapacity).forEach((dyn) => {
        if (!this.allocateOOO(dyn)) {
          dyn.stall = this.rob.length >= 16
            ? "ROB 已满"
            : this.rs.length >= 10
              ? "Scheduler / RS 已满"
              : "Free List 无可用物理寄存器";
          this.stalls += 1;
        }
      });
      const renameCount = this.active.filter((dyn) => dyn.stage === "Rename").length;
      this.active.filter((dyn) => dyn.stage === "Decode")
        .slice(0, Math.max(0, this.issueWidth - renameCount))
        .forEach((dyn) => { dyn.stage = "Rename"; });
      const decodeCount = this.active.filter((dyn) => dyn.stage === "Decode").length;
      this.active.filter((dyn) => dyn.stage === "Fetch")
        .slice(0, Math.max(0, this.issueWidth - decodeCount))
        .forEach((dyn) => { dyn.stage = "Decode"; });

      const fetchCount = this.active.filter((dyn) => dyn.stage === "Fetch").length;
      for (let slot = fetchCount; slot < this.issueWidth; slot += 1) {
        if (!this.fetchOne("Fetch")) break;
      }
    }

    stageItems(stage) {
      return this.active.filter((dyn) => dyn.stage === stage);
    }

    scoreboard() {
      return [...REGISTERS, "FLAGS"].map((reg) => {
        const tag = this.mode === "ooo" ? this.rat[reg] : null;
        const pending = this.mode === "classic"
          ? this.active.find((dyn) => dyn.instr.dstReg === reg)
          : this.rob.find((entry) => entry.pdst === tag);
        return {
          reg,
          value: this.regs[reg],
          producer: pending ? (this.mode === "ooo" ? `${pending.pdst} / ROB#${pending.seq}` : `#${pending.seq}`) : "—",
          state: pending ? (this.mode === "ooo" ? "重命名 / 等待提交" : "等待写回") : "架构值有效",
        };
      });
    }

    predictorRows() {
      return this.program.filter((instr) => instr.branch).map((instr) => {
        const counter = instr.op === "JMP" ? 3 : (this.predictor[instr.pc] ?? 1);
        return { pc: instr.pc, text: instr.text, counter, prediction: counter >= 2 ? "Taken" : "Not taken" };
      });
    }
  }

  window.X86Pipeline = {
    Simulator,
    parseProgram,
    REGISTERS,
    CLASSIC_STAGES,
    OOO_STAGES,
  };
})();
