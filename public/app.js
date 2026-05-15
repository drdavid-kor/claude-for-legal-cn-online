const PRESETS = {
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4.1" },
  siliconflow: { baseUrl: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" }
};

const state = {
  scenarios: [],
  selectedScenarioId: null,
  apiKeyMemory: ""
};

const $ = (id) => document.getElementById(id);

function setStatus(message) {
  $("status").textContent = message || "";
}

function selectedScenario() {
  return state.scenarios.find((scenario) => scenario.id === state.selectedScenarioId) || state.scenarios[0];
}

function renderScenarios() {
  const list = $("scenarioList");
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
      $("userInput").placeholder = scenario.examplePrompt;
    });
    list.appendChild(card);
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
  renderScenarios();
  if (state.scenarios[0]) $("userInput").placeholder = state.scenarios[0].examplePrompt;
}

async function generate() {
  const scenario = selectedScenario();
  if (!scenario) return setStatus("未找到可用场景。");
  state.apiKeyMemory = $("apiKey").value;
  saveSessionIfRequested();

  const payload = {
    scenarioId: scenario.id,
    baseUrl: $("baseUrl").value,
    model: $("model").value,
    apiKey: state.apiKeyMemory,
    userInput: $("userInput").value
  };

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

function bindEvents() {
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
  $("fillExample").addEventListener("click", () => {
    const scenario = selectedScenario();
    if (scenario) $("userInput").value = scenario.examplePrompt;
  });
  $("clearAll").addEventListener("click", clearAll);
  $("generate").addEventListener("click", generate);
  $("copyOutput").addEventListener("click", copyOutput);
}

restoreSession();
bindEvents();
loadScenarios().catch((error) => setStatus(error.message || String(error)));
