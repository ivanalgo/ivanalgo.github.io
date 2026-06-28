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
  const stageDescriptions = {
    IF: "取指", ID: "译码 / 读寄存器", EX: "执行", MEM: "访存", WB: "写回",
    Fetch: "取指", Decode: "译码", Rename: "寄存器重命名", Dispatch: "分配 ROB / RS",
    Issue: "等待操作数", Execute: "功能单元执行", Memory: "Load / Store", Writeback: "广播结果", Retire: "顺序提交",
  };
  const colors = ["#10a37f", "#7c5ce7", "#3976d9", "#d97745", "#d45c68", "#1a8ca5", "#8b6a38", "#627a3b"];

  const elements = {
    mode: $("#modeSelect"), preset: $("#presetSelect"), width: $("#widthSelect"),
    predictor: $("#predictorSelect"), editor: $("#programEditor"), load: $("#loadButton"),
    step: $("#stepButton"), run: $("#runButton"), speed: $("#speedSelect"), error: $("#parseError"),
    metrics: $("#metrics"), pipeline: $("#pipeline"), pipelineTitle: $("#pipelineTitle"),
    pipelineDescription: $("#pipelineDescription"), timeline: $("#timeline"), events: $("#events"),
    scoreboard: $("#scoreboard"), rob: $("#rob"), predictorTable: $("#predictor"),
    hardware: $("#hardwareDiagram"), hardwareTitle: $("#hardwareTitle"),
    hardwareDescription: $("#hardwareDescription"),
  };
  let simulator = null;
  let timer = null;

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

  function load() {
    stop();
    try {
      const program = window.X86Pipeline.parseProgram(elements.editor.value);
      simulator = new window.X86Pipeline.Simulator(program, {
        mode: elements.mode.value,
        issueWidth: elements.width.value,
        predictor: elements.predictor.value,
      });
      elements.error.textContent = "";
      render();
    } catch (error) {
      elements.error.textContent = error.message;
    }
  }

  function step() {
    if (!simulator || simulator.halted) return;
    simulator.step();
    render();
    if (simulator.halted) stop();
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
  }

  function dynamicEntry(dyn) {
    const dependencies = dyn.instr.srcRegs.map((reg) => {
      if (dyn.sourceTags[reg]) return `${reg}←${dyn.sourceTags[reg]}(wait)`;
      const value = dyn.sourceValues[reg] ?? simulator.regs[reg];
      const origin = dyn.sourceOrigins[reg] ? `@${dyn.sourceOrigins[reg]}` : "";
      return `${reg}=${displayValue(value)}${origin}`;
    }).join(" · ");
    const result = dyn.result === null ? "" : `<small>result=${escapeHtml(displayValue(dyn.result))}</small>`;
    return `<div class="hw-entry"><b>#${dyn.seq} ${escapeHtml(dyn.instr.op)}</b>
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
    return `<div class="topology-level ${className}"><div class="topology-label">${label}</div><div class="topology-blocks">${blocks.join("")}</div></div>`;
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

  function renderHardware() {
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
      elements.hardware.innerHTML = movementStrip()
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
    elements.hardware.innerHTML = `<div class="ooo-topology-shell"><div class="ooo-main">${mainTopology}</div>${architecturalSide}</div>`;
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
          <div class="inst-card ${dyn.stall ? "wait" : ""}" style="--c:${colors[(dyn.seq - 1) % colors.length]}">
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
  }

  elements.preset.addEventListener("change", () => {
    elements.editor.value = presets[elements.preset.value];
    load();
  });
  [elements.mode, elements.width, elements.predictor].forEach((element) => element.addEventListener("change", load));
  elements.load.addEventListener("click", load);
  elements.step.addEventListener("click", step);
  elements.run.addEventListener("click", toggleRun);
  elements.editor.value = presets.dependency;
  load();
})();
