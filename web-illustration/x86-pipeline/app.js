(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const presets = {
    dependency: `; 独立 LOAD 可以越过长延迟 IMUL
MOV RAX, 4
MOV RBX, 2
MOV RCX, RAX
ADD RCX, RBX
IMUL RCX, RBX
MOV RDX, [100]
SUB RDX, RCX
MOV [104], RDX`,
    branch: `; 第一次 JZ 默认预测 Not-taken，实际 Taken
MOV RAX, 3
MOV RBX, 3
CMP RAX, RBX
JZ equal
MOV RCX, 0
JMP done
equal: MOV RCX, 1
done: ADD RCX, 5`,
    memory: `; 地址使用简化的绝对寻址
MOV RAX, [100]
MOV RBX, [108]
ADD RAX, RBX
IMUL RAX, 2
MOV [104], RAX
MOV RCX, [104]`,
  };
  const presetNames = {
    dependency: "数据依赖与并行",
    branch: "分支预测与冲刷",
    memory: "Load / Store",
  };
  const predictorNames = {
    "two-bit": "2-bit 饱和计数器",
    static: "静态 Not-taken",
  };
  let savedConfig = {};
  try {
    savedConfig = JSON.parse(sessionStorage.getItem("x86PipelineExperiment")) || {};
  } catch (_) {
    savedConfig = {};
  }
  const experiment = {
    preset: presets[savedConfig.preset] ? savedConfig.preset : "dependency",
    width: [1, 2, 4].includes(Number(savedConfig.width)) ? Number(savedConfig.width) : 2,
    predictor: savedConfig.predictor === "static" ? "static" : "two-bit",
    program: savedConfig.program || presets.dependency,
  };
  const stageDescriptions = {
    IF: "取指", ID: "译码 / 读寄存器", EX: "执行", MEM: "访存", WB: "写回",
    Fetch: "取指", Decode: "译码", Rename: "寄存器重命名", Dispatch: "分配 ROB / RS",
    Issue: "等待操作数", Execute: "功能单元执行", Memory: "Load / Store", Writeback: "广播结果", Retire: "顺序提交",
  };
  const colors = ["#10a37f", "#7c5ce7", "#3976d9", "#d97745", "#d45c68", "#1a8ca5", "#8b6a38", "#627a3b"];
  const deviceColors = {
    pc: "#0f8f72",
    fetch: "#168bb5",
    decode: "#4f79d8",
    rat: "#7659c7",
    freelist: "#9a62c9",
    prf: "#6747b8",
    rob: "#58677f",
    scheduler: "#c87832",
    alu0: "#2f6fce",
    alu1: "#168c9f",
    mul: "#d15368",
    branch: "#9a61bd",
    agu: "#d87a36",
    loadq: "#d99033",
    storeq: "#b8663f",
    dcache: "#c66f3e",
    cdb: "#7254cf",
    retire: "#397466",
    arf: "#68717f",
  };

  const elements = {
    load: $("#loadButton"), back: $("#backButton"), step: $("#stepButton"), run: $("#runButton"),
    speed: $("#speedSelect"), error: $("#parseError"), rightCycle: $("#rightCycle"),
    flowTooltip: $("#flowTooltip"),
    summaryPreset: $("#summaryPreset"), summaryWidth: $("#summaryWidth"),
    summaryPredictor: $("#summaryPredictor"),
    metrics: $("#metrics"), pipeline: $("#pipeline"), pipelineTitle: $("#pipelineTitle"),
    pipelineDescription: $("#pipelineDescription"), timeline: $("#timeline"), events: $("#events"),
    scoreboard: $("#scoreboard"), rob: $("#rob"), predictorTable: $("#predictor"),
    hardware: $("#hardwareDiagram"), hardwareTitle: $("#hardwareTitle"),
    hardwareDescription: $("#hardwareDescription"),
    hardwareViewport: $("#hardwareViewport"), uopInspector: $("#uopInspector"),
    fitView: $("#fitViewButton"),
    actualSize: $("#actualSizeButton"), zoomOut: $("#zoomOutButton"),
    zoomIn: $("#zoomInButton"), zoomLabel: $("#zoomLabel"),
    follow: $("#followButton"), activePath: $("#activePathButton"),
    topologyView: $("#topologyViewButton"), detailView: $("#detailViewButton"),
  };
  let simulator = null;
  let timer = null;
  let stateHistory = [];
  let currentFlowDetails = {};
  const viewState = {
    mode: "fit",
    scale: 1,
    follow: false,
    activeOnly: false,
    selectedSeq: null,
    selectedDevice: null,
    selectedLink: null,
    diagramMode: "topology",
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function displayValue(value) {
    if (value && typeof value === "object" && "address" in value) return `[${value.address}]=${value.value}`;
    if (value && typeof value === "object") return `ZF=${Number(value.zf)} SF=${Number(value.sf)}`;
    return String(value);
  }

  function stop() {
    clearTimeout(timer);
    timer = null;
    elements.run.textContent = "▶ 自动运行";
  }

  function cloneState(value) {
    return structuredClone(value);
  }

  function captureState() {
    return cloneState(simulator);
  }

  function restoreState(snapshot) {
    const restored = cloneState(snapshot);
    Object.keys(simulator).forEach((key) => { delete simulator[key]; });
    Object.assign(simulator, restored);
  }

  function load() {
    stop();
    try {
      const program = window.X86Pipeline.parseProgram(experiment.program);
      simulator = new window.X86Pipeline.Simulator(program, {
        mode: "ooo",
        issueWidth: experiment.width,
        predictor: experiment.predictor,
      });
      viewState.selectedSeq = null;
      viewState.selectedDevice = null;
      viewState.selectedLink = null;
      elements.error.textContent = "";
      stateHistory = [captureState()];
      elements.summaryPreset.textContent = presetNames[experiment.preset];
      elements.summaryWidth.textContent = `${experiment.width}-wide`;
      elements.summaryPredictor.textContent = predictorNames[experiment.predictor];
      render();
    } catch (error) {
      elements.error.textContent = error.message;
    }
  }

  function step() {
    if (!simulator || simulator.halted) return;
    simulator.step();
    stateHistory.push(captureState());
    render();
    if (simulator.halted) stop();
  }

  function back() {
    stop();
    if (stateHistory.length <= 1) return;
    stateHistory.pop();
    restoreState(stateHistory[stateHistory.length - 1]);
    if (viewState.selectedSeq !== null && !simulator.all.some((dyn) => dyn.seq === viewState.selectedSeq)) {
      viewState.selectedSeq = null;
      viewState.follow = false;
    }
    render();
  }

  function toggleRun() {
    if (timer) {
      stop();
      return;
    }
    elements.run.textContent = "Ⅱ 暂停";
    const loop = () => {
      step();
      if (simulator && !simulator.halted && !timer) return;
      if (simulator && !simulator.halted) timer = setTimeout(loop, Number(elements.speed.value));
    };
    timer = setTimeout(loop, 0);
  }

  function renderMetrics() {
    const ipc = simulator.cycle ? simulator.retired / simulator.cycle : 0;
    const accuracy = simulator.branches ? (simulator.branches - simulator.mispredicts) / simulator.branches : 1;
    const values = [
      ["Cycle", simulator.cycle],
      ["已提交指令", simulator.retired],
      ["IPC", ipc.toFixed(2)],
      ["流水线停顿", simulator.stalls],
      ["冲刷次数", simulator.flushes],
      ["预测准确率", `${(accuracy * 100).toFixed(1)}%`],
    ];
    elements.metrics.innerHTML = values.map(([label, value]) =>
      `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`
    ).join("");
    elements.rightCycle.textContent = simulator.cycle;
    elements.back.disabled = stateHistory.length <= 1;
    elements.step.disabled = simulator.halted;
  }

  function dynamicEntry(dyn) {
    const dependencies = dyn.instr.srcRegs.map((reg) => {
      if (dyn.sourceTags[reg]) return `${reg}←${dyn.sourceTags[reg]}(wait)`;
      const value = dyn.sourceValues[reg] ?? simulator.regs[reg];
      const origin = dyn.sourceOrigins[reg] ? `@${dyn.sourceOrigins[reg]}` : "";
      return `${reg}=${displayValue(value)}${origin}`;
    }).join(" · ");
    const result = dyn.result === null ? "" : `<small>result=${escapeHtml(displayValue(dyn.result))}</small>`;
    return `<div class="hw-entry" data-seq="${dyn.seq}"><b>#${dyn.seq} ${escapeHtml(dyn.instr.op)}</b>
      <small>${escapeHtml(dyn.instr.text)}</small>
      ${dependencies ? `<em>${escapeHtml(dependencies)}</em>` : ""}
      ${dyn.instr.dstReg ? `<small>dst=${dyn.instr.dstReg}${simulator.mode === "ooo" ? ` → ${dyn.pdst || "待分配"} · ROB#${dyn.seq}` : ""}</small>` : ""}
      ${simulator.mode === "ooo" && ["Dispatch", "Issue"].includes(dyn.stage) ? `<small>ready=${Object.keys(dyn.sourceTags).length === 0 ? "yes" : "no"}</small>` : ""}
      ${dyn.remaining > 0 && dyn.stage === "Execute" ? `<small>剩余 ${dyn.remaining} Cycle</small>` : ""}
      ${dyn.stall ? `<small>${escapeHtml(dyn.stall)}</small>` : ""}${result}</div>`;
  }

  function textEntry(title, detail = "") {
    return `<div class="hw-entry"><b>${escapeHtml(title)}</b>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>`;
  }

  function hardwareBlock(title, subtitle, entries, kind = "") {
    return `<div class="hw-block ${kind} ${entries.length ? "active" : ""}">
      <div class="hw-head"><b>${title}</b><small>${subtitle}</small></div>
      <div class="hw-content">${entries.length ? entries.slice(0, 6).join("") : '<div class="hw-empty">本周期为空</div>'}</div>
    </div>`;
  }

  function arrow(label) {
    return `<div class="hw-arrow">→${label ? `<small>${label}</small>` : ""}</div>`;
  }

  function flow(label, blocks, labels = []) {
    return `<div class="hw-flow"><div class="hw-lane-label">${label}</div>${blocks.map((block, index) =>
      `${index ? arrow(labels[index - 1] || "") : ""}${block}`
    ).join("")}</div>`;
  }

  function movedTo(...stages) {
    return simulator.lastTransitions.some((move) => stages.includes(move.to));
  }

  function topologyLevel(label, blocks, className = "") {
    return `<div class="topology-level ${className}" data-level="${escapeHtml(label)}"><div class="topology-label">${label}</div><div class="topology-blocks">${blocks.join("")}</div></div>`;
  }

  function verticalConnector(label, active, shape = "single") {
    const paths = shape === "fanout"
      ? '<path d="M500 0 V20 M500 20 H100 V58 M500 20 H300 V58 M500 20 V58 M500 20 H700 V58 M500 20 H900 V58"/>'
      : shape === "merge"
        ? '<path d="M100 0 V24 H500 M300 0 V24 H500 M500 0 V58 M700 0 V24 H500 M900 0 V24 H500"/>'
        : '<path d="M500 0 V58"/>';
    return `<div class="topology-connector ${active ? "active" : ""}">
      <svg viewBox="0 0 1000 60" preserveAspectRatio="none">${paths}</svg>
      <span>${label}</span>
    </div>`;
  }

  function movementStrip() {
    const moves = simulator.lastTransitions;
    return `<div class="clock-movements"><b>Cycle ${simulator.cycle} 数据移动</b>
      ${moves.length ? moves.map((move) => `<span class="${move.to === "Flushed" ? "flushed" : ""}">#${move.seq} ${move.from} → ${move.to}</span>`).join("") : "<span>尚未产生状态迁移</span>"}
    </div>`;
  }

  function renderDetailedHardware() {
    const stageEntries = (stage) => simulator.stageItems(stage).map(dynamicEntry);
    const registerSnapshot = window.X86Pipeline.REGISTERS
      .map((reg) => `${reg}=${simulator.regs[reg]}`).join(" · ");
    const predictorState = simulator.predictorRows()
      .map((row) => `PC${row.pc}:${row.counter.toString(2).padStart(2, "0")}`)
      .join(" · ");

    if (simulator.mode === "classic") {
      elements.hardwareTitle.textContent = "经典核心 · Top-down 数据通路";
      elements.hardwareDescription.textContent = "指令从顶部取入，逐级向下；紫色框是跨 Cycle 保存状态的流水寄存器。";
      const exEntries = stageEntries("EX");
      const classicTopology = movementStrip()
        + topologyLevel("NEXT PC", [hardwareBlock("PC + Branch Predictor", "下个取指地址", [textEntry(`PC = ${simulator.pc}`, predictorState || "无分支记录")])])
        + verticalConnector("predicted PC", movedTo("IF"))
        + topologyLevel("FETCH", [hardwareBlock("L1 I-Cache / IF", "instruction bytes", stageEntries("IF"), "memory")])
        + verticalConnector("instruction + PC", movedTo("ID"))
        + topologyLevel("PIPELINE REGISTER", [hardwareBlock("IF / ID", "锁存 instruction、PC", stageEntries("ID"), "buffer wide")])
        + verticalConnector("decoded fields", movedTo("EX"))
        + topologyLevel("DECODE", [
          hardwareBlock("Decoder", "opcode / control bits", stageEntries("ID")),
          hardwareBlock("Register File", "读取源寄存器", stageEntries("ID").length ? stageEntries("ID") : [textEntry("Committed values", registerSnapshot)], "commit"),
        ])
        + verticalConnector("control + operands", movedTo("EX"))
        + topologyLevel("PIPELINE REGISTER", [hardwareBlock("ID / EX", "src values、dst、control", exEntries, "buffer wide")])
        + verticalConnector("operands", movedTo("MEM"), "fanout")
        + topologyLevel("EXECUTION UNITS", [
          hardwareBlock("Integer ALU", "ADD / SUB / logic", simulator.stageItems("EX").filter((dyn) => !dyn.instr.branch && dyn.instr.op !== "CMP" && !["IMUL", "MUL"].includes(dyn.instr.op)).map(dynamicEntry), "compute"),
          hardwareBlock("MUL Unit", "3-cycle IMUL", simulator.stageItems("EX").filter((dyn) => ["IMUL", "MUL"].includes(dyn.instr.op)).map(dynamicEntry), "compute"),
          hardwareBlock("Branch Unit", "CMP / Jcc resolve", simulator.stageItems("EX").filter((dyn) => dyn.instr.branch || dyn.instr.op === "CMP").map(dynamicEntry), "compute"),
        ])
        + verticalConnector("result / address", movedTo("MEM"), "merge")
        + topologyLevel("PIPELINE REGISTER", [hardwareBlock("EX / MEM", "ALU result、address、store data", stageEntries("MEM"), "buffer wide")])
        + verticalConnector("memory request", movedTo("WB"))
        + topologyLevel("MEMORY", [hardwareBlock("L1 D-Cache / MEM", "Load / Store data", simulator.active.filter((dyn) => dyn.instr.memory && ["EX", "MEM"].includes(dyn.stage)).map(dynamicEntry), "memory wide")])
        + verticalConnector("load / ALU result", movedTo("WB"))
        + topologyLevel("PIPELINE REGISTER", [hardwareBlock("MEM / WB", "dst + writeback value", stageEntries("WB"), "buffer wide")])
        + verticalConnector("commit value", movedTo("Retired"))
        + topologyLevel("ARCHITECTURAL STATE", [hardwareBlock("Architectural Register File", "程序可见状态", [textEntry("Committed values", registerSnapshot)], "commit wide")]);
      elements.hardware.innerHTML = `<div class="topology-canvas">${classicTopology}</div>`;
      return;
    }

    elements.hardwareTitle.textContent = "乱序核心 · Top-down 微架构与结果回送";
    elements.hardwareDescription.textContent = "Scheduler / RS 是同一个等待与选择结构；RAT 映射到 PRF，ROB 只维护程序顺序、完成位与退休信息。";
    const ratEntries = Object.entries(simulator.rat).map(([reg, physical]) => textEntry(reg, `→ ${physical}`));
    const robEntries = simulator.rob.map((entry, index) =>
      textEntry(`${index === 0 ? "HEAD · " : ""}#${entry.seq} ${entry.instr.op}`,
        `${entry.instr.dstReg || "无目标"}→${entry.pdst || "—"} · old=${entry.oldPdst || "—"} · ${entry.ready ? "done" : entry.stage}`)
    );
    const mappedPhysical = new Set([...Object.values(simulator.rat), ...Object.values(simulator.committedMap)]);
    const physicalEntries = Object.entries(simulator.prf)
      .filter(([physical, entry]) => mappedPhysical.has(physical) || entry.owner)
      .map(([physical, entry]) => textEntry(physical,
        `${entry.ready ? `ready · ${displayValue(entry.value)}` : "not ready"}${entry.owner ? ` · producer #${entry.owner}` : " · committed"}`));
    const freeEntries = simulator.freeList.slice(0, 12).map((physical) => textEntry(physical, "free"));
    const issueEntries = simulator.rs.filter((dyn) => ["Dispatch", "Issue"].includes(dyn.stage));
    const executing = simulator.stageItems("Execute");
    const loads = simulator.rob.filter((dyn) => dyn.instr.op === "MOV" && /^\[/.test(dyn.instr.args[1] || ""));
    const stores = simulator.rob.filter((dyn) => dyn.instr.op === "MOV" && /^\[/.test(dyn.instr.args[0] || ""));
    const justDispatched = new Set(simulator.lastTransitions.filter((move) => move.to === "Dispatch").map((move) => move.seq));
    const arfReadActive = simulator.active.some((dyn) =>
      justDispatched.has(dyn.seq) && Object.values(dyn.sourceOrigins).includes("ARF")
    );
    const arfCommitActive = movedTo("Retired");
    const broadcasting = simulator.lastTransitions
      .filter((move) => move.from === "Writeback" && move.to === "Retire")
      .map((move) => simulator.all.find((dyn) => dyn.seq === move.seq))
      .filter(Boolean);

    const mainTopology = movementStrip()
      + topologyLevel("PREDICTION", [hardwareBlock("PC + 2-bit BPU", "direction + target", [textEntry(`PC = ${simulator.pc}`, predictorState || "Weak Not-taken")])])
      + verticalConnector("predicted PC", movedTo("Fetch"))
      + topologyLevel("FETCH", [
        hardwareBlock("L1 I-Cache", "instruction bytes", stageEntries("Fetch"), "memory"),
        hardwareBlock("Fetch Buffer", "解耦取指与译码", stageEntries("Fetch"), "buffer"),
      ])
      + verticalConnector("x86 instruction bytes", movedTo("Decode"))
      + topologyLevel("DECODE", [hardwareBlock("Decode Queue", "x86 → μops", stageEntries("Decode"), "buffer wide")])
      + verticalConnector("decoded μops", movedTo("Rename"))
      + topologyLevel("RENAME / ALLOCATION", [
        hardwareBlock("RAT", "RAX → physical register", [...stageEntries("Rename"), ...ratEntries], "buffer"),
        hardwareBlock("Free List", "allocate new Pdst", freeEntries, "buffer"),
        hardwareBlock("Physical Register File", "P0–P127 value + ready", physicalEntries, "buffer wide"),
        hardwareBlock("ROB · one circular buffer", "tail allocate / head retire", robEntries, "buffer wide"),
      ])
      + verticalConnector("renamed μop + Psrc/Pdst", movedTo("Dispatch", "Issue"))
      + topologyLevel("SCHEDULING", [hardwareBlock("Scheduler / Reservation Station", "Issue Queue · wakeup + select", issueEntries.map(dynamicEntry), "buffer scheduler")])
      + verticalConnector("selected ready μops", movedTo("Execute"), "fanout")
      + topologyLevel("EXECUTION PORTS", [
        hardwareBlock("Integer ALU 0", "ADD / SUB / logic", executing.filter((dyn) => !dyn.instr.memory && !dyn.instr.branch && !["IMUL", "MUL"].includes(dyn.instr.op) && dyn.seq % 2 === 0).map(dynamicEntry), "compute"),
        hardwareBlock("Integer ALU 1", "second integer port", executing.filter((dyn) => !dyn.instr.memory && !dyn.instr.branch && !["IMUL", "MUL"].includes(dyn.instr.op) && dyn.seq % 2 === 1).map(dynamicEntry), "compute"),
        hardwareBlock("MUL Unit", "3-cycle pipeline", executing.filter((dyn) => ["IMUL", "MUL"].includes(dyn.instr.op)).map(dynamicEntry), "compute"),
        hardwareBlock("Branch Unit", "CMP / Jcc verify", executing.filter((dyn) => dyn.instr.branch || dyn.instr.op === "CMP").map(dynamicEntry), "compute"),
        hardwareBlock("AGU", "address generation", executing.filter((dyn) => dyn.instr.memory).map(dynamicEntry), "compute"),
      ])
      + verticalConnector("address + store data", movedTo("Memory"), "merge")
      + topologyLevel("MEMORY ORDERING", [
        hardwareBlock("Load Queue", "等待更老 Store", loads.map(dynamicEntry), "memory"),
        hardwareBlock("Store Queue", "Retire 时写内存", stores.map(dynamicEntry), "memory"),
        hardwareBlock("L1 D-Cache", "load data / store line", stageEntries("Memory"), "memory"),
      ])
      + verticalConnector("ALU result / load data", movedTo("Writeback"))
      + topologyLevel("RESULT BROADCAST", [hardwareBlock("CDB / Writeback Bus", "Pdst tag + result", broadcasting.map(dynamicEntry), "compute wide")])
      + `<div class="feedback-wire ${broadcasting.length ? "active" : ""}">↺ CDB 将 Pdst + result 广播回 Scheduler / RS；匹配 Psrc tag 的项把 ready 置为 yes</div>`
      + verticalConnector("write PRF + set ROB done bit", broadcasting.length > 0)
      + topologyLevel("IN-ORDER RETIRE", [
        hardwareBlock("Retirement Control", "读取同一个 ROB 的 Head", simulator.rob[0] ? [dynamicEntry(simulator.rob[0])] : [], "commit wide"),
        hardwareBlock("Free Old Pdst", "retire 后归还 Free List", simulator.rob[0] && simulator.rob[0].oldPdst ? [textEntry(simulator.rob[0].oldPdst, "等待 Head retire")] : [], "buffer"),
      ]);

    const committedMappings = Object.entries(simulator.committedMap)
      .map(([reg, physical]) => textEntry(reg, `${displayValue(simulator.regs[reg])} · committed ${physical}`));
    const architecturalSide = `<aside class="arf-side ${arfReadActive ? "read-active" : ""} ${arfCommitActive ? "commit-active" : ""}">
      <div class="arf-read-link">← Rename 读取 committed source value</div>
      <div class="arf-panel">
        <span>PROGRAM-VISIBLE STATE</span>
        <h3>Architectural Register File</h3>
        <p>只保存已退休状态；speculative result 不会直接写入这里。</p>
        <div class="hw-content">${committedMappings.join("")}</div>
      </div>
      <div class="arf-commit-link">← ROB Head Retire / Commit 写入</div>
    </aside>`;
    elements.hardware.innerHTML = `<div class="topology-canvas"><div class="ooo-topology-shell"><div class="ooo-main">${mainTopology}</div>${architecturalSide}</div></div>`;
  }

  function deviceForDyn(dyn) {
    if (!dyn) return "";
    if (simulator.mode === "classic") {
      return { IF: "icache", ID: "decode", EX: "alu", MEM: "dcache", WB: "arf" }[dyn.stage] || "pc";
    }
    if (dyn.stage === "Fetch") return "fetch";
    if (dyn.stage === "Decode") return "decode";
    if (dyn.stage === "Rename") return "rat";
    if (["Dispatch", "Issue"].includes(dyn.stage)) return "scheduler";
    if (dyn.stage === "Execute") {
      if (dyn.instr.memory) return "agu";
      if (dyn.instr.branch || dyn.instr.op === "CMP") return "branch";
      if (["IMUL", "MUL"].includes(dyn.instr.op)) return "mul";
      return dyn.seq % 2 ? "alu1" : "alu0";
    }
    if (dyn.stage === "Memory") return dyn.instr.op === "MOV" && /^\[/.test(dyn.instr.args[0] || "") ? "storeq" : "loadq";
    if (dyn.stage === "Writeback") return "cdb";
    if (dyn.stage === "Retire") return "rob";
    return "retire";
  }

  function deviceTokens(device, explicit = null) {
    const items = explicit || simulator.active.filter((dyn) => deviceForDyn(dyn) === device);
    return items.slice(0, 5).map((dyn) =>
      `<span class="device-token" data-seq="${dyn.seq}" style="--token:${colors[(dyn.seq - 1) % colors.length]}">#${dyn.seq}</span>`
    ).join("");
  }

  function topologyDevice(id, title, subtitle, status, x, y, width = 180, height = 90, kind = "", explicit = null) {
    const tokens = deviceTokens(id, explicit);
    return `<button class="device-node ${kind} ${tokens ? "active" : ""}" data-device="${id}"
      style="left:${x}px;top:${y}px;width:${width}px;height:${height}px;--device-color:${deviceColors[id] || "#10a37f"}">
      <span class="device-title">${title}</span>
      <small>${subtitle}</small>
      <b>${status}</b>
      <div class="device-tokens">${tokens}</div>
    </button>`;
  }

  function previousState() {
    return stateHistory.length > 1 ? stateHistory[stateHistory.length - 2] : null;
  }

  function stateDyn(state, seq) {
    return state?.all?.find((dyn) => dyn.seq === seq);
  }

  function linkEffect(id, dyn) {
    const before = previousState();
    const prior = stateDyn(before, dyn.seq);
    const result = dyn.result === null ? "—" : displayValue(dyn.result);
    const unitNames = {
      "sched-alu0": "Integer ALU 0",
      "sched-alu1": "Integer ALU 1",
      "sched-mul": "MUL Unit",
      "sched-branch": "Branch Unit",
      "sched-agu": "AGU",
    };
    if (id === "pc-fetch") return `Fetch Buffer 新增 #${dyn.seq}（PC ${dyn.instr.pc}）`;
    if (id === "fetch-decode") return `Decode Queue 接收 #${dyn.seq}，准备拆分 ${dyn.instr.op} μop`;
    if (id === "decode-rat") return `Rename 入口接收 #${dyn.seq}，等待分配物理寄存器`;
    if (id === "rat-free") return `Free List 弹出 ${dyn.pdst}；空闲项 ${before?.freeList?.length ?? "—"} → ${simulator.freeList.length}`;
    if (id === "free-prf") return `PRF[${dyn.pdst}] 新建为 ready=false，owner=#${dyn.seq}`;
    if (id === "rat-scheduler") {
      const sources = dyn.instr.srcRegs.map((reg) =>
        dyn.sourceTags[reg] ? `${reg}:${dyn.sourceTags[reg]} waiting` : `${reg} ready`
      ).join("，") || "无源寄存器";
      return `Scheduler / RS 新增 #${dyn.seq}；${sources}`;
    }
    if (id === "rat-rob") return `ROB Tail 追加 #${dyn.seq}；占用 ${before?.rob?.length ?? "—"} → ${simulator.rob.length}`;
    if (unitNames[id]) return `${unitNames[id]} 接收 #${dyn.seq}；remaining=${dyn.remaining}`;
    if (id === "agu-loadq") return `Load Queue 接收 #${dyn.seq}；地址/数据结果=${result}`;
    if (id === "agu-storeq") return `Store Queue 接收 #${dyn.seq}；地址/数据=${result}`;
    if (id === "loadq-dcache") return `L1 D-Cache 完成 #${dyn.seq} Load；result=${result}`;
    if (id === "storeq-dcache") return `L1 D-Cache 完成 #${dyn.seq} Store 排序；result=${result}`;
    if (["alu0-cdb", "alu1-cdb", "mul-cdb", "branch-cdb", "dcache-cdb"].includes(id)) {
      return `CDB 输入锁存 #${dyn.seq} 的 result=${result}`;
    }
    if (id === "cdb-prf") {
      const oldReady = prior?.pdst && before?.prf?.[prior.pdst]?.ready;
      return `PRF[${dyn.pdst}] 写入 ${result}；ready ${Boolean(oldReady)} → true`;
    }
    if (id === "cdb-scheduler") {
      const woken = (before?.rs || []).filter((waiting) =>
        Object.values(waiting.sourceTags || {}).includes(dyn.pdst)
      ).map((waiting) => `#${waiting.seq}`);
      return woken.length
        ? `Scheduler 匹配 ${dyn.pdst}，唤醒 ${woken.join("、")}`
        : `Scheduler 收到 ${dyn.pdst} 广播，本周期没有等待者`;
    }
    if (id === "cdb-rob") return `ROB#${dyn.seq} 写入完成位；ready ${Boolean(prior?.ready)} → true`;
    if (id === "rob-retire") return `Retirement Control 移除 ROB Head #${dyn.seq}；retired ${before?.retired ?? "—"} → ${simulator.retired}`;
    if (id === "retire-arf") {
      const reg = dyn.instr.dstReg;
      return `Architectural RF[${reg}]：${displayValue(before?.regs?.[reg])} → ${displayValue(simulator.regs[reg])}`;
    }
    if (id === "arf-rat") {
      const regs = Object.entries(dyn.sourceOrigins).filter(([, origin]) => origin === "ARF").map(([reg]) => reg);
      return `Rename 从 Architectural RF 读取 ${regs.join("、") || "已提交源值"}`;
    }
    return `#${dyn.seq}：${prior?.stage || "Program"} → ${dyn.stage}`;
  }

  function topologyWire(id, path, label, activity = false) {
    const flow = typeof activity === "object"
      ? activity
      : { active: Boolean(activity), color: "#10a37f", detail: "" };
    const color = flow.color || "#10a37f";
    const style = `--flow-color:${color}`;
    const marker = flow.active ? `arrow-${color.replace("#", "")}` : "arrow";
    const seqs = Array.isArray(flow.seqs) ? flow.seqs.join(",") : "";
    const detail = flow.active && Array.isArray(flow.items)
      ? flow.items.map((dyn) => `#${dyn.seq} ${dyn.instr.text}\n${linkEffect(id, dyn)}`).join("\n\n")
      : flow.detail || "";
    if (flow.active) currentFlowDetails[id] = detail;
    const title = flow.active && detail ? `<title>${escapeHtml(detail)}</title>` : "";
    return `<path class="device-wire ${flow.active ? "active" : ""}" style="${style}" data-link="${id}" data-flow-seqs="${seqs}" d="${path}" marker-end="url(#${marker})">${title}</path>
      <path class="wire-hit ${flow.active ? "active" : ""}" style="${style}" data-link="${id}" data-flow-seqs="${seqs}" d="${path}"></path>
      <text class="wire-label ${flow.active ? "active" : ""}" style="${style}" x="${label.x}" y="${label.y}">${label.text}</text>`;
  }

  function topologyArrowDefs() {
    const markers = [["arrow", "#b9bcb7"], ...new Map(
      Object.values(deviceColors).map((color) => [`arrow-${color.replace("#", "")}`, color])
    ).entries()];
    return `<defs>${markers.map(([id, color]) =>
      `<marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="${color}"/></marker>`
    ).join("")}</defs>`;
  }

  function renderClassicTopology() {
    const active = (to) => movedTo(to);
    const nodes = [
      topologyDevice("pc", "PC + BPU", "next address", `PC ${simulator.pc}`, 450, 25),
      topologyDevice("icache", "L1 I-Cache / IF", "instruction bytes", `${simulator.stageItems("IF").length}/1`, 450, 145, 180, 95, "memory"),
      topologyDevice("ifid", "IF / ID", "pipeline register", `${simulator.stageItems("ID").length}/1`, 450, 275, 180, 85, "storage", simulator.stageItems("ID")),
      topologyDevice("decode", "Decoder + Register File", "decode / operand read", `${simulator.stageItems("ID").length} active`, 450, 395, 180, 100),
      topologyDevice("idex", "ID / EX", "operands + control", `${simulator.stageItems("EX").length}/1`, 450, 535, 180, 85, "storage", simulator.stageItems("EX")),
      topologyDevice("alu", "ALU / MUL / Branch", "execute", `${simulator.stageItems("EX").length} busy`, 450, 655, 180, 100, "compute"),
      topologyDevice("dcache", "L1 D-Cache / MEM", "load / store", `${simulator.stageItems("MEM").length} active`, 450, 795, 180, 95, "memory", simulator.stageItems("MEM")),
      topologyDevice("arf", "Architectural Register File", "committed state", "8 GPR + FLAGS", 800, 795, 230, 110, "commit", simulator.stageItems("WB")),
    ].join("");
    const wires = [
      topologyWire("pc-fetch", "M540 115 V145", { x: 550, y: 135, text: "PC" }, active("IF")),
      topologyWire("fetch-ifid", "M540 240 V275", { x: 550, y: 262, text: "instruction" }, active("ID")),
      topologyWire("ifid-decode", "M540 360 V395", { x: 550, y: 382, text: "fields" }, active("EX")),
      topologyWire("decode-idex", "M540 495 V535", { x: 550, y: 520, text: "operands" }, active("EX")),
      topologyWire("idex-ex", "M540 620 V655", { x: 550, y: 642, text: "control" }, active("MEM")),
      topologyWire("ex-mem", "M540 755 V795", { x: 550, y: 780, text: "result/address" }, active("WB")),
      topologyWire("mem-wb", "M630 842 H800", { x: 690, y: 832, text: "writeback" }, active("WB")),
    ].join("");
    return `<div class="topology-canvas compact-topology"><div class="chip-topology" style="width:1120px;height:940px">
      <svg class="device-wires" viewBox="0 0 1120 940">${topologyArrowDefs()}${wires}</svg>${nodes}
    </div></div>`;
  }

  function renderOooTopology() {
    const broadcasting = simulator.lastTransitions
      .filter((move) => move.from === "Writeback" && move.to === "Retire")
      .map((move) => simulator.all.find((dyn) => dyn.seq === move.seq)).filter(Boolean);
    const transitionItems = (from, to, predicate = () => true) => simulator.lastTransitions
      .filter((move) => move.from === from && move.to === to)
      .map((move) => simulator.all.find((dyn) => dyn.seq === move.seq))
      .filter((dyn) => dyn && predicate(dyn));
    const flow = (from, to, color, predicate) => {
      const items = transitionItems(from, to, predicate);
      return {
        active: items.length > 0,
        color,
        seqs: items.map((dyn) => dyn.seq),
        items,
        detail: items.map((dyn) => `#${dyn.seq} ${dyn.instr.text}: ${from} → ${to}`).join(" · "),
      };
    };
    const isStoreDyn = (dyn) => dyn.instr.op === "MOV" && /^\[/.test(dyn.instr.args[0] || "");
    const isLoadDyn = (dyn) => dyn.instr.memory && !isStoreDyn(dyn);
    const unitIs = (device) => (dyn) => {
      if (dyn.instr.memory) return device === "agu";
      if (dyn.instr.branch || dyn.instr.op === "CMP") return device === "branch";
      if (["IMUL", "MUL"].includes(dyn.instr.op)) return device === "mul";
      return device === (dyn.seq % 2 ? "alu1" : "alu0");
    };
    const prfUsed = Object.values(simulator.prf).filter((entry) => entry.owner || entry.ready).length;
    const nodes = [
      topologyDevice("pc", "PC + BPU", "prediction", `PC ${simulator.pc}`, 45, 35),
      topologyDevice("fetch", "Fetch Buffer", "instruction bytes", `${simulator.stageItems("Fetch").length}/${simulator.issueWidth}`, 275, 35),
      topologyDevice("decode", "Decode Queue", "x86 → μops", `${simulator.stageItems("Decode").length}/${simulator.issueWidth}`, 505, 35),
      topologyDevice("rat", "RAT", "RAX → Pn", `${Object.keys(simulator.rat).length} mappings`, 735, 35, 180, 95, "storage"),
      topologyDevice("freelist", "Free List", "allocate Pdst", `${simulator.freeList.length}/128 free`, 965, 35, 180, 95, "storage"),
      topologyDevice("prf", "Physical Register File", "value + ready", `${prfUsed}/128 used`, 1200, 35, 210, 95, "storage", broadcasting),
      topologyDevice("rob", "Reorder Buffer", "one circular buffer", `${simulator.rob.length}/16 · Head ${simulator.rob[0] ? `#${simulator.rob[0].seq}` : "—"}`, 960, 190, 260, 110, "storage", simulator.rob),
      topologyDevice("scheduler", "Scheduler / Reservation Station", "Issue Queue · wakeup/select", `${simulator.rs.length}/10 occupied`, 520, 210, 330, 120, "storage", simulator.rs.filter((dyn) => ["Dispatch", "Issue"].includes(dyn.stage))),
      topologyDevice("alu0", "Integer ALU 0", "port 0", `${simulator.active.filter((dyn) => deviceForDyn(dyn) === "alu0").length} busy`, 90, 440, 180, 95, "compute"),
      topologyDevice("alu1", "Integer ALU 1", "port 1", `${simulator.active.filter((dyn) => deviceForDyn(dyn) === "alu1").length} busy`, 310, 440, 180, 95, "compute"),
      topologyDevice("mul", "MUL Unit", "3-cycle", `${simulator.active.filter((dyn) => deviceForDyn(dyn) === "mul").length} busy`, 530, 440, 180, 95, "compute"),
      topologyDevice("branch", "Branch Unit", "verify prediction", `${simulator.active.filter((dyn) => deviceForDyn(dyn) === "branch").length} busy`, 750, 440, 180, 95, "compute"),
      topologyDevice("agu", "AGU", "address generation", `${simulator.active.filter((dyn) => deviceForDyn(dyn) === "agu").length} busy`, 970, 440, 180, 95, "compute"),
      topologyDevice("loadq", "Load Queue", "memory ordering", `${simulator.rob.filter((dyn) => dyn.instr.op === "MOV" && /^\[/.test(dyn.instr.args[1] || "")).length} entries`, 870, 620, 180, 95, "memory"),
      topologyDevice("storeq", "Store Queue", "commit stores", `${simulator.rob.filter((dyn) => dyn.instr.op === "MOV" && /^\[/.test(dyn.instr.args[0] || "")).length} entries`, 1090, 620, 180, 95, "memory"),
      topologyDevice("dcache", "L1 D-Cache", "load / store data", `${simulator.stageItems("Memory").length} active`, 980, 770, 180, 95, "memory", simulator.stageItems("Memory")),
      topologyDevice("cdb", "CDB / Writeback Bus", "Pdst + result broadcast", `${broadcasting.length} broadcasting`, 410, 680, 300, 110, "broadcast", broadcasting),
      topologyDevice("retire", "Retirement Control", "read ROB Head", `${simulator.rob[0] && simulator.rob[0].ready ? "Head ready" : "waiting"}`, 520, 875, 250, 105, "commit", simulator.rob[0] ? [simulator.rob[0]] : []),
      topologyDevice("arf", "Architectural Register File", "program-visible state", "8 GPR + FLAGS", 1080, 875, 270, 105, "commit"),
    ].join("");
    const wires = [
      topologyWire("pc-fetch", "M225 82 H275", { x: 235, y: 72, text: "predicted PC" }, flow("Program", "Fetch", deviceColors.pc)),
      topologyWire("fetch-decode", "M455 82 H505", { x: 463, y: 72, text: "bytes" }, flow("Fetch", "Decode", deviceColors.fetch)),
      topologyWire("decode-rat", "M685 82 H735", { x: 695, y: 72, text: "μops" }, flow("Decode", "Rename", deviceColors.decode)),
      topologyWire("rat-free", "M915 82 H965", { x: 920, y: 72, text: "allocate" }, flow("Rename", "Dispatch", deviceColors.rat, (dyn) => Boolean(dyn.pdst))),
      topologyWire("free-prf", "M1145 82 H1200", { x: 1150, y: 72, text: "Pdst" }, flow("Rename", "Dispatch", deviceColors.freelist, (dyn) => Boolean(dyn.pdst))),
      topologyWire("rat-scheduler", "M825 130 V170 H685 V210", { x: 700, y: 165, text: "Psrc/Pdst" }, flow("Rename", "Dispatch", deviceColors.rat)),
      topologyWire("rat-rob", "M850 130 V175 H1090 V190", { x: 950, y: 165, text: "ROB tail allocate" }, flow("Rename", "Dispatch", deviceColors.rat)),
      topologyWire("sched-alu0", "M685 330 V380 H180 V440", { x: 190, y: 372, text: "issue" }, flow("Issue", "Execute", deviceColors.alu0, unitIs("alu0"))),
      topologyWire("sched-alu1", "M685 330 V380 H400 V440", { x: 410, y: 372, text: "issue" }, flow("Issue", "Execute", deviceColors.alu1, unitIs("alu1"))),
      topologyWire("sched-mul", "M685 330 V440", { x: 695, y: 385, text: "issue" }, flow("Issue", "Execute", deviceColors.mul, unitIs("mul"))),
      topologyWire("sched-branch", "M685 330 V380 H840 V440", { x: 845, y: 372, text: "issue" }, flow("Issue", "Execute", deviceColors.branch, unitIs("branch"))),
      topologyWire("sched-agu", "M685 330 V380 H1060 V440", { x: 1065, y: 372, text: "issue" }, flow("Issue", "Execute", deviceColors.agu, unitIs("agu"))),
      topologyWire("agu-loadq", "M1060 535 V575 H960 V620", { x: 965, y: 572, text: "load addr" }, flow("Execute", "Memory", deviceColors.agu, isLoadDyn)),
      topologyWire("agu-storeq", "M1060 535 V575 H1180 V620", { x: 1160, y: 572, text: "store addr/data" }, flow("Execute", "Memory", deviceColors.agu, isStoreDyn)),
      topologyWire("loadq-dcache", "M960 715 V745 H1070 V770", { x: 965, y: 752, text: "load request" }, flow("Memory", "Writeback", deviceColors.loadq, isLoadDyn)),
      topologyWire("storeq-dcache", "M1180 715 V745 H1070 V770", { x: 1110, y: 738, text: "store order" }, flow("Memory", "Writeback", deviceColors.storeq, isStoreDyn)),
      topologyWire("alu0-cdb", "M180 535 V610 H560 V680", { x: 190, y: 602, text: "ALU0 result" }, flow("Execute", "Writeback", deviceColors.alu0, unitIs("alu0"))),
      topologyWire("alu1-cdb", "M400 535 V610 H560 V680", { x: 405, y: 602, text: "ALU1 result" }, flow("Execute", "Writeback", deviceColors.alu1, unitIs("alu1"))),
      topologyWire("mul-cdb", "M620 535 V680", { x: 628, y: 620, text: "MUL result" }, flow("Execute", "Writeback", deviceColors.mul, unitIs("mul"))),
      topologyWire("branch-cdb", "M840 535 V610 H560 V680", { x: 742, y: 602, text: "branch result" }, flow("Execute", "Writeback", deviceColors.branch, unitIs("branch"))),
      topologyWire("dcache-cdb", "M980 817 H750 V735 H710", { x: 790, y: 726, text: "load / store result" }, flow("Memory", "Writeback", deviceColors.dcache)),
      topologyWire("cdb-prf", "M710 720 H1320 V130", { x: 1220, y: 710, text: "write Pdst" }, flow("Writeback", "Retire", deviceColors.cdb, (dyn) => Boolean(dyn.pdst))),
      topologyWire("cdb-scheduler", "M410 735 H350 V270 H520", { x: 360, y: 260, text: "wakeup broadcast" }, flow("Writeback", "Retire", deviceColors.cdb, (dyn) => Boolean(dyn.pdst))),
      topologyWire("cdb-rob", "M710 755 H900 V245 H960", { x: 810, y: 745, text: "set done" }, flow("Writeback", "Retire", deviceColors.cdb)),
      topologyWire("rob-retire", "M1090 300 V845 H645 V875", { x: 655, y: 840, text: "Head only" }, flow("Retire", "Retired", deviceColors.rob)),
      topologyWire("retire-arf", "M770 927 H1080", { x: 900, y: 917, text: "commit architectural value" }, flow("Retire", "Retired", deviceColors.retire, (dyn) => Boolean(dyn.instr.dstReg))),
      topologyWire("arf-rat", "M1215 875 V835 H1390 V155 H825 V130", { x: 1225, y: 825, text: "committed source fallback" }, flow("Rename", "Dispatch", deviceColors.arf, (dyn) => Object.values(dyn.sourceOrigins).includes("ARF"))),
    ].join("");
    return `<div class="topology-canvas compact-topology"><div class="chip-topology" style="width:1450px;height:1030px">
      <svg class="device-wires" viewBox="0 0 1450 1030">${topologyArrowDefs()}${wires}</svg>${nodes}
    </div></div>`;
  }

  function renderTopologyHardware() {
    elements.hardwareTitle.textContent = simulator.mode === "ooo"
      ? "乱序核心 · 固定器件拓扑"
      : "经典核心 · 固定器件拓扑";
    elements.hardwareDescription.textContent = "悬停活动连线查看目标组件的修改；点击器件、连线或 μop，在右侧查看完整状态。";
    elements.hardware.innerHTML = simulator.mode === "ooo" ? renderOooTopology() : renderClassicTopology();
  }

  function renderHardware() {
    currentFlowDetails = {};
    elements.flowTooltip.classList.remove("show");
    if (viewState.diagramMode === "detail") renderDetailedHardware();
    else renderTopologyHardware();
  }

  function selectedInstruction() {
    if (viewState.selectedSeq !== null) {
      const selected = simulator.all.find((dyn) => dyn.seq === viewState.selectedSeq);
      if (selected) return selected;
    }
    const lastMove = simulator.lastTransitions[simulator.lastTransitions.length - 1];
    return lastMove ? simulator.all.find((dyn) => dyn.seq === lastMove.seq) : simulator.active[0];
  }

  function renderUopInspector() {
    if (viewState.selectedDevice) {
      const id = viewState.selectedDevice;
      const node = elements.hardware.querySelector(`[data-device="${id}"]`);
      const matching = simulator.active.filter((dyn) => deviceForDyn(dyn) === id);
      let entries = matching.map((dyn) => dynamicEntry(dyn));
      if (id === "rat") entries = Object.entries(simulator.rat).map(([reg, physical]) => textEntry(reg, `→ ${physical}`));
      if (id === "freelist") entries = simulator.freeList.slice(0, 24).map((physical) => textEntry(physical, "free"));
      if (id === "prf") entries = Object.entries(simulator.prf).filter(([, entry]) => entry.owner || entry.ready).slice(0, 24).map(([physical, entry]) => textEntry(physical, `${entry.ready ? displayValue(entry.value) : "not ready"}${entry.owner ? ` · #${entry.owner}` : ""}`));
      if (id === "rob") entries = simulator.rob.map((dyn, index) => textEntry(`${index === 0 ? "HEAD · " : ""}ROB#${dyn.seq}`, `${dyn.instr.dstReg || "—"}→${dyn.pdst || "—"} · ${dyn.ready ? "done" : dyn.stage}`));
      if (id === "scheduler") entries = simulator.rs.map((dyn) => dynamicEntry(dyn));
      if (id === "arf") entries = Object.entries(simulator.regs).map(([reg, value]) => textEntry(reg, displayValue(value)));
      elements.uopInspector.innerHTML = `
        <div class="inspector-seq">HARDWARE COMPONENT</div>
        <h3>${node ? node.querySelector(".device-title").textContent : id}</h3>
        <div class="inspector-stage">${node ? node.querySelector("b").textContent : ""}</div>
        <div class="device-detail-list">${entries.join("") || '<div class="inspector-empty">本周期没有保存的 μop 或数据。</div>'}</div>`;
      return;
    }
    if (viewState.selectedLink) {
      const path = elements.hardware.querySelector(`[data-link="${viewState.selectedLink}"]`);
      const seqs = new Set(String(path?.dataset.flowSeqs || "").split(",").filter(Boolean).map(Number));
      const matchingMoves = simulator.lastTransitions.filter((move) => seqs.has(move.seq));
      elements.uopInspector.innerHTML = `
        <div class="inspector-seq">DATA PATH</div>
        <h3>${viewState.selectedLink}</h3>
        <div class="inspector-stage">${path && path.classList.contains("active") ? "本周期正在传输" : "本周期空闲"}</div>
        <div class="device-detail-list">${matchingMoves.map((move) => textEntry(`#${move.seq} ${move.text}`, `${move.from} → ${move.to}`)).join("") || '<div class="inspector-empty">这条连线在本周期没有数据移动。</div>'}</div>`;
      return;
    }
    const dyn = selectedInstruction();
    if (!dyn) {
      elements.uopInspector.innerHTML = '<div class="inspector-empty">点击图中的 μop，查看它的当前位置、物理寄存器和依赖。</div>';
      return;
    }
    const sources = dyn.instr.srcRegs.map((reg) => {
      const waiting = dyn.sourceTags[reg];
      const value = dyn.sourceValues[reg];
      return `<div><span>${reg}</span><strong>${waiting ? `${waiting} · waiting` : `${displayValue(value ?? simulator.regs[reg])} @${dyn.sourceOrigins[reg] || "ARF"}`}</strong></div>`;
    }).join("");
    const recentTimeline = Object.entries(dyn.timeline).slice(-7)
      .map(([cycle, stage]) => `<span>C${cycle} ${stage}</span>`).join("");
    elements.uopInspector.innerHTML = `
      <div class="inspector-seq">μop #${dyn.seq} · PC ${dyn.instr.pc}</div>
      <h3>${escapeHtml(dyn.instr.text)}</h3>
      <div class="inspector-stage">${dyn.stage}</div>
      <div class="inspector-fields">
        ${sources || "<div><span>Sources</span><strong>无寄存器输入</strong></div>"}
        <div><span>Pdst</span><strong>${dyn.pdst || "—"}</strong></div>
        <div><span>ROB</span><strong>#${dyn.seq} · ${dyn.ready ? "done" : "not ready"}</strong></div>
        <div><span>Result</span><strong>${dyn.result === null ? "—" : escapeHtml(displayValue(dyn.result))}</strong></div>
      </div>
      <div class="inspector-timeline">${recentTimeline}</div>`;
  }

  function markSelectedInstruction() {
    document.querySelectorAll(".selected").forEach((node) => node.classList.remove("selected"));
    if (viewState.selectedDevice) {
      elements.hardware.querySelector(`[data-device="${viewState.selectedDevice}"]`)?.classList.add("selected");
    }
    if (viewState.selectedLink) {
      elements.hardware.querySelector(`[data-link="${viewState.selectedLink}"]`)?.classList.add("selected");
    }
    if (viewState.selectedSeq === null) return;
    document.querySelectorAll(`[data-seq="${viewState.selectedSeq}"]`).forEach((node) => node.classList.add("selected"));
  }

  function updateViewButtons() {
    elements.topologyView.classList.toggle("active", viewState.diagramMode === "topology");
    elements.detailView.classList.toggle("active", viewState.diagramMode === "detail");
    elements.fitView.classList.toggle("active", viewState.mode === "fit");
    elements.actualSize.classList.toggle("active", viewState.mode === "actual");
    elements.follow.classList.toggle("active", viewState.follow);
    elements.activePath.classList.toggle("active", viewState.activeOnly);
    elements.zoomLabel.textContent = `${Math.round(viewState.scale * 100)}%`;
  }

  function centerOn(target) {
    if (!target) return;
    const viewportRect = elements.hardwareViewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    elements.hardwareViewport.scrollTo({
      left: elements.hardwareViewport.scrollLeft + targetRect.left - viewportRect.left - viewportRect.width / 2 + targetRect.width / 2,
      top: elements.hardwareViewport.scrollTop + targetRect.top - viewportRect.top - viewportRect.height / 2 + targetRect.height / 2,
      behavior: "smooth",
    });
  }

  function applyCanvasView() {
    const canvas = elements.hardware.querySelector(".topology-canvas");
    if (!canvas) return;
    canvas.style.transform = "none";
    const naturalWidth = canvas.scrollWidth;
    const naturalHeight = canvas.scrollHeight;
    if (viewState.mode === "fit") {
      viewState.scale = Math.min(1, Math.max(0.28, (elements.hardwareViewport.clientWidth - 30) / naturalWidth));
    } else if (viewState.mode === "actual") {
      viewState.scale = 1;
    }
    canvas.style.transform = `scale(${viewState.scale})`;
    canvas.style.transformOrigin = "top left";
    elements.hardware.style.width = `${naturalWidth * viewState.scale}px`;
    elements.hardware.style.height = `${naturalHeight * viewState.scale}px`;
    elements.hardwareViewport.classList.toggle("active-only", viewState.activeOnly);
    updateViewButtons();
    if (viewState.follow && viewState.selectedSeq !== null) {
      centerOn(elements.hardware.querySelector(`[data-seq="${viewState.selectedSeq}"]`));
    }
  }

  function renderPipeline() {
    const ooo = simulator.mode === "ooo";
    elements.pipelineTitle.textContent = ooo ? "乱序九级流水线" : "经典五级流水线";
    elements.pipelineDescription.textContent = ooo
      ? "指令可在 Issue / Execute 阶段越过彼此，但架构状态只从 ROB 头部顺序提交。"
      : "每一级最多容纳一条指令；RAW 依赖会冻结 ID，后续取指也随之停顿。";
    elements.pipeline.style.gridTemplateColumns = `repeat(${simulator.stages.length}, minmax(120px, 1fr))`;
    elements.pipeline.innerHTML = simulator.stages.map((stage) => {
      const items = simulator.stageItems(stage);
      return `<div class="stage">
        <div class="stage-head"><b>${stage}</b><small>${stageDescriptions[stage]}</small></div>
        <div class="stage-body">${items.length ? items.map((dyn) => `
          <div class="inst-card ${dyn.stall ? "wait" : ""}" data-seq="${dyn.seq}" style="--c:${colors[(dyn.seq - 1) % colors.length]}">
            <b>#${dyn.seq} · PC ${dyn.instr.pc}</b>
            ${escapeHtml(dyn.instr.text)}
            ${dyn.stall ? `<small>${escapeHtml(dyn.stall)}</small>` : ""}
          </div>`).join("") : '<div class="empty">空</div>'}
        </div>
      </div>`;
    }).join("");
  }

  function renderTimeline() {
    const firstCycle = Math.max(1, simulator.cycle - 15);
    const cycles = Array.from({ length: Math.max(1, simulator.cycle - firstCycle + 1) }, (_, index) => firstCycle + index);
    const instructions = simulator.all.slice(-14);
    elements.timeline.innerHTML = `<table class="timing-table"><thead><tr><th>指令</th>${cycles.map((cycle) => `<th>C${cycle}</th>`).join("")}</tr></thead>
      <tbody>${instructions.map((dyn) => `<tr><td><b>#${dyn.seq}</b> ${escapeHtml(dyn.instr.text)}</td>${cycles.map((cycle) => {
        const value = dyn.timeline[cycle] || "";
        const className = String(value).replace(/\s.*/, "");
        return `<td class="cycle cell-${className}">${escapeHtml(value)}</td>`;
      }).join("")}</tr>`).join("") || '<tr><td>尚未取指</td></tr>'}</tbody></table>`;
  }

  function renderScoreboard() {
    elements.scoreboard.innerHTML = `<table class="data-table"><thead><tr><th>寄存器</th><th>架构值</th><th>生产者</th><th>状态</th></tr></thead><tbody>
      ${simulator.scoreboard().map((row) => `<tr><td><b>${row.reg}</b></td><td>${displayValue(row.value)}</td><td>${row.producer}</td><td class="${row.producer === "—" ? "ready" : "waiting"}">${row.state}</td></tr>`).join("")}
    </tbody></table>`;
  }

  function renderROB() {
    if (simulator.mode !== "ooo") {
      elements.rob.innerHTML = '<div class="empty">经典五级模式没有 ROB；切换到 OOO 查看顺序提交。</div>';
      return;
    }
    elements.rob.innerHTML = `<table class="data-table"><thead><tr><th>Tag</th><th>指令</th><th>目标</th><th>结果</th><th>状态</th></tr></thead><tbody>
      ${simulator.rob.map((entry, index) => `<tr><td>${index === 0 ? "HEAD · " : ""}#${entry.seq}</td><td>${escapeHtml(entry.instr.text)}</td><td>${entry.instr.dstReg ? `${entry.instr.dstReg}→${entry.pdst}` : "—"}</td><td>${entry.ready ? displayValue(entry.result) : "—"}</td><td class="${entry.ready ? "ready" : "waiting"}">${entry.ready ? "可提交" : entry.stage}</td></tr>`).join("") || '<tr><td colspan="5">ROB 空</td></tr>'}
    </tbody></table>`;
  }

  function renderPredictor() {
    const rows = simulator.predictorRows();
    elements.predictorTable.innerHTML = `<table class="data-table"><thead><tr><th>PC</th><th>分支</th><th>2-bit</th><th>下次预测</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${row.pc}</td><td>${escapeHtml(row.text)}</td><td>${row.counter.toString(2).padStart(2, "0")}</td><td><span class="predictor-pill">${row.prediction}</span></td></tr>`).join("") || '<tr><td colspan="4">程序中没有分支</td></tr>'}
    </tbody></table>`;
  }

  function renderEvents() {
    const headline = simulator.halted
      ? `C${simulator.cycle}: 程序已完成，所有指令均已提交。`
      : `C${simulator.cycle}: PC=${simulator.pc}，流水线内 ${simulator.active.length} 条指令。`;
    elements.events.innerHTML = [headline, ...simulator.events].slice(0, 7)
      .map((event) => `<div class="event">${escapeHtml(event)}</div>`).join("");
  }

  function render() {
    renderMetrics();
    renderHardware();
    renderPipeline();
    renderTimeline();
    renderScoreboard();
    renderROB();
    renderPredictor();
    renderEvents();
    renderUopInspector();
    markSelectedInstruction();
    requestAnimationFrame(applyCanvasView);
  }

  elements.load.addEventListener("click", load);
  elements.back.addEventListener("click", back);
  elements.step.addEventListener("click", step);
  elements.run.addEventListener("click", toggleRun);
  elements.fitView.addEventListener("click", () => {
    viewState.mode = "fit";
    viewState.follow = false;
    applyCanvasView();
  });
  elements.actualSize.addEventListener("click", () => {
    viewState.mode = "actual";
    viewState.follow = false;
    applyCanvasView();
  });
  elements.zoomOut.addEventListener("click", () => {
    viewState.mode = "custom";
    viewState.scale = Math.max(0.25, viewState.scale - 0.1);
    applyCanvasView();
  });
  elements.zoomIn.addEventListener("click", () => {
    viewState.mode = "custom";
    viewState.scale = Math.min(1.5, viewState.scale + 0.1);
    applyCanvasView();
  });
  elements.follow.addEventListener("click", () => {
    viewState.follow = !viewState.follow;
    if (viewState.follow) {
      const dyn = selectedInstruction();
      viewState.selectedSeq = dyn ? dyn.seq : null;
      viewState.mode = "custom";
      viewState.scale = Math.max(0.75, viewState.scale);
    }
    markSelectedInstruction();
    renderUopInspector();
    applyCanvasView();
  });
  elements.activePath.addEventListener("click", () => {
    viewState.activeOnly = !viewState.activeOnly;
    applyCanvasView();
  });
  const selectUop = (event) => {
    const node = event.target.closest("[data-seq]");
    if (!node) return false;
    viewState.selectedSeq = Number(node.dataset.seq);
    viewState.selectedDevice = null;
    viewState.selectedLink = null;
    viewState.follow = true;
    viewState.mode = "custom";
    viewState.scale = Math.max(0.75, viewState.scale);
    markSelectedInstruction();
    renderUopInspector();
    applyCanvasView();
    return true;
  };
  elements.hardware.addEventListener("click", (event) => {
    if (selectUop(event)) return;
    const device = event.target.closest("[data-device]");
    if (device) {
      viewState.selectedDevice = device.dataset.device;
      viewState.selectedLink = null;
      viewState.selectedSeq = null;
      viewState.follow = false;
      markSelectedInstruction();
      renderUopInspector();
      updateViewButtons();
      return;
    }
    const link = event.target.closest("[data-link]");
    if (link) {
      viewState.selectedLink = link.dataset.link;
      viewState.selectedDevice = null;
      viewState.selectedSeq = null;
      viewState.follow = false;
      markSelectedInstruction();
      renderUopInspector();
      updateViewButtons();
    }
  });
  elements.hardware.addEventListener("pointermove", (event) => {
    const wire = event.target.closest?.(".wire-hit.active, .device-wire.active");
    const detail = wire ? currentFlowDetails[wire.dataset.link] : "";
    if (!detail) {
      elements.flowTooltip.classList.remove("show");
      return;
    }
    elements.flowTooltip.textContent = detail;
    elements.flowTooltip.classList.add("show");
    const padding = 14;
    const left = Math.min(event.clientX + padding, window.innerWidth - elements.flowTooltip.offsetWidth - padding);
    const top = Math.min(event.clientY + padding, window.innerHeight - elements.flowTooltip.offsetHeight - padding);
    elements.flowTooltip.style.left = `${Math.max(padding, left)}px`;
    elements.flowTooltip.style.top = `${Math.max(padding, top)}px`;
  });
  elements.hardware.addEventListener("pointerleave", () => {
    elements.flowTooltip.classList.remove("show");
  });
  elements.pipeline.addEventListener("click", selectUop);
  elements.topologyView.addEventListener("click", () => {
    viewState.diagramMode = "topology";
    viewState.mode = "fit";
    viewState.selectedDevice = null;
    viewState.selectedLink = null;
    render();
  });
  elements.detailView.addEventListener("click", () => {
    viewState.diagramMode = "detail";
    viewState.mode = "fit";
    viewState.selectedDevice = null;
    viewState.selectedLink = null;
    render();
  });
  load();
})();
