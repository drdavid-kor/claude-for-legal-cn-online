const PRESETS = {
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4.1" },
  siliconflow: { baseUrl: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" }
};

const state = {
  mode: "demo",
  scenarios: [],
  skills: [],
  selectedScenarioId: null,
  selectedSkillId: null,
  apiKeyMemory: ""
};

const $ = (id) => document.getElementById(id);

function setStatus(message) {
  $("status").textContent = message || "";
}

function selectedScenario() {
  return state.scenarios.find((scenario) => scenario.id === state.selectedScenarioId) || state.scenarios[0];
}

function selectedSkill() {
  return state.skills.find((skill) => skill.id === state.selectedSkillId) || filteredSkills()[0] || state.skills[0];
}

function activeTarget() {
  return state.mode === "expert" ? selectedSkill() : selectedScenario();
}

function setMode(mode) {
  state.mode = mode;
  $("demoMode").classList.toggle("active", mode === "demo");
  $("expertMode").classList.toggle("active", mode === "expert");
  $("expertControls").classList.toggle("hidden", mode !== "expert");
  $("selectorTitle").textContent = mode === "expert" ? "选择技能" : "选择场景";
  $("selectorHint").textContent = mode === "expert"
    ? "专家模式显示律师实务技能，可按领域和关键词筛选。"
    : "演示模式提供精选高频场景，适合快速试用。";
  renderSelector();
  updateInputPlaceholder();
}

function updateInputPlaceholder() {
  if (state.mode === "expert") {
    const skill = selectedSkill();
    $("userInput").placeholder = skill
      ? `请粘贴要交给「${skill.title}」技能处理的事实、合同条款、制度文本或问题。`
      : "请先选择一个专家技能。";
    return;
  }

  const scenario = selectedScenario();
  if (scenario) $("userInput").placeholder = scenario.examplePrompt;
}

function renderSelector() {
  if (state.mode === "expert") return renderSkills();
  return renderScenarios();
}

function renderScenarios() {
  const list = $("selectorList");
  list.innerHTML = "";
  for (const scenario of state.scenarios) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `scenario-card${scenario.id === state.selectedScenarioId ? " active" : ""}`;
    card.innerHTML = `<span></span><b></b><p></p>`;
    card.querySelector("span").textContent = scenario.practiceArea;
    card.querySelector("b").textContent = scenario.title;
    card.querySelector("p").textContent = scenario.description;
    card.addEventListener("click", () => {
      state.selectedScenarioId = scenario.id;
      renderScenarios();
      updateInputPlaceholder();
    });
    list.appendChild(card);
  }
}

function filteredSkills() {
  const query = $("skillSearch").value.trim().toLowerCase();
  const practiceArea = $("practiceFilter").value;
  return state.skills.filter((skill) => {
    const matchesPractice = !practiceArea || skill.practiceArea === practiceArea;
    const haystack = `${skill.title} ${skill.practiceArea} ${skill.pluginTitle} ${skill.skillPath} ${skill.description} ${skill.keywords}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesPractice && matchesQuery;
  });
}

function renderSkills() {
  const list = $("selectorList");
  const skills = filteredSkills();
  list.innerHTML = "";

  if (!skills.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的技能。请调整搜索词或领域筛选。";
    list.appendChild(empty);
    return;
  }

  if (!skills.some((skill) => skill.id === state.selectedSkillId)) {
    state.selectedSkillId = skills[0].id;
  }

  for (const skill of skills) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `scenario-card skill-card${skill.id === state.selectedSkillId ? " active" : ""}`;
    card.innerHTML = `<span></span><b></b><p></p><small></small>`;
    card.querySelector("span").textContent = `${skill.practiceArea} · ${skill.pluginTitle}`;
    card.querySelector("b").textContent = skill.title;
    card.querySelector("p").textContent = skill.description;
    card.querySelector("small").textContent = skill.skillPath;
    card.addEventListener("click", () => {
      state.selectedSkillId = skill.id;
      renderSkills();
      updateInputPlaceholder();
    });
    list.appendChild(card);
  }
}

function populatePracticeFilter() {
  const select = $("practiceFilter");
  const areas = [...new Set(state.skills.map((skill) => skill.practiceArea))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  for (const area of areas) {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    select.appendChild(option);
  }
}

function saveSessionIfRequested() {
  if ($("rememberTab").checked) {
    sessionStorage.setItem("clfco.baseUrl", $("baseUrl").value);
    sessionStorage.setItem("clfco.model", $("model").value);
    sessionStorage.setItem("clfco.apiKey", state.apiKeyMemory);
  } else {
    sessionStorage.removeItem("clfco.baseUrl");
    sessionStorage.removeItem("clfco.model");
    sessionStorage.removeItem("clfco.apiKey");
  }
}

function restoreSession() {
  const baseUrl = sessionStorage.getItem("clfco.baseUrl");
  const model = sessionStorage.getItem("clfco.model");
  const apiKey = sessionStorage.getItem("clfco.apiKey");
  if (baseUrl || model || apiKey) {
    $("rememberTab").checked = true;
    if (baseUrl) $("baseUrl").value = baseUrl;
    if (model) $("model").value = model;
    if (apiKey) {
      state.apiKeyMemory = apiKey;
      $("apiKey").value = apiKey;
    }
  }
}

function clearAll() {
  state.apiKeyMemory = "";
  $("baseUrl").value = "";
  $("model").value = "";
  $("apiKey").value = "";
  $("userInput").value = "";
  $("output").textContent = "等待生成。";
  $("rememberTab").checked = false;
  sessionStorage.removeItem("clfco.baseUrl");
  sessionStorage.removeItem("clfco.model");
  sessionStorage.removeItem("clfco.apiKey");
  setStatus("已清空本页数据。");
}

async function loadScenarios() {
  const response = await fetch("/api/scenarios", { cache: "no-store" });
  const data = await response.json();
  state.scenarios = data.scenarios || [];
  state.selectedScenarioId = state.scenarios[0]?.id || null;
}

async function loadSkills() {
  const response = await fetch("/api/skills", { cache: "no-store" });
  const data = await response.json();
  state.skills = data.skills || [];
  state.selectedSkillId = state.skills[0]?.id || null;
  populatePracticeFilter();
}

async function generate() {
  const target = activeTarget();
  if (!target) return setStatus(state.mode === "expert" ? "未找到可用技能。" : "未找到可用场景。");
  state.apiKeyMemory = $("apiKey").value;
  saveSessionIfRequested();

  const payload = {
    baseUrl: $("baseUrl").value,
    model: $("model").value,
    apiKey: state.apiKeyMemory,
    userInput: $("userInput").value
  };
  if (state.mode === "expert") payload.skillId = target.id;
  else payload.scenarioId = target.id;

  setStatus("正在调用你配置的模型服务……");
  $("generate").disabled = true;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "请求失败");
    $("output").textContent = data.content;
    setStatus("已生成。请先由合格律师复核后再使用。");
  } catch (error) {
    $("output").textContent = "生成失败。";
    setStatus(error.message || String(error));
  } finally {
    $("generate").disabled = false;
  }
}

async function copyOutput() {
  await navigator.clipboard.writeText($("output").textContent || "");
  setStatus("已复制 Markdown。仍需律师复核。");
}

function fillExample() {
  if (state.mode === "expert") {
    const skill = selectedSkill();
    if (skill) {
      $("userInput").value = `请使用「${skill.title}」技能处理以下事项，并输出供中国律师复核的结构化草稿：\n\n【事实/文本】\n（在此粘贴合同条款、事项背景、制度文本、监管文件或问题）`;
    }
    return;
  }
  const scenario = selectedScenario();
  if (scenario) $("userInput").value = scenario.examplePrompt;
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  $("skillSearch").addEventListener("input", () => {
    renderSkills();
    updateInputPlaceholder();
  });
  $("practiceFilter").addEventListener("change", () => {
    renderSkills();
    updateInputPlaceholder();
  });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = PRESETS[button.dataset.preset];
      $("baseUrl").value = preset.baseUrl;
      $("model").value = preset.model;
      saveSessionIfRequested();
    });
  });
  $("apiKey").addEventListener("input", () => {
    state.apiKeyMemory = $("apiKey").value;
    saveSessionIfRequested();
  });
  $("baseUrl").addEventListener("input", saveSessionIfRequested);
  $("model").addEventListener("input", saveSessionIfRequested);
  $("rememberTab").addEventListener("change", saveSessionIfRequested);
  $("fillExample").addEventListener("click", fillExample);
  $("clearAll").addEventListener("click", clearAll);
  $("generate").addEventListener("click", generate);
  $("copyOutput").addEventListener("click", copyOutput);
}

restoreSession();
bindEvents();
Promise.all([loadScenarios(), loadSkills()])
  .then(() => {
    renderSelector();
    updateInputPlaceholder();
  })
  .catch((error) => setStatus(error.message || String(error)));
