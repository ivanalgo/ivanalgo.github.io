(function () {
  "use strict";

  const STORAGE_KEY = "x86PipelineExperiment";
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

  const preset = document.querySelector("#presetSelect");
  const width = document.querySelector("#widthSelect");
  const predictor = document.querySelector("#predictorSelect");
  const editor = document.querySelector("#programEditor");
  const error = document.querySelector("#parseError");
  const generate = document.querySelector("#generateButton");

  function readSavedConfig() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
    } catch (_) {
      return {};
    }
  }

  const saved = readSavedConfig();
  preset.value = presets[saved.preset] ? saved.preset : "dependency";
  width.value = ["1", "2", "4"].includes(String(saved.width)) ? String(saved.width) : "2";
  predictor.value = saved.predictor === "static" ? "static" : "two-bit";
  editor.value = saved.program || presets[preset.value];

  preset.addEventListener("change", () => {
    editor.value = presets[preset.value];
    error.textContent = "";
  });

  generate.addEventListener("click", () => {
    try {
      window.X86Pipeline.parseProgram(editor.value);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: "ooo",
        preset: preset.value,
        width: Number(width.value),
        predictor: predictor.value,
        program: editor.value,
      }));
      window.location.href = "./demo.html";
    } catch (parseError) {
      error.textContent = parseError.message;
      editor.focus();
    }
  });
})();
