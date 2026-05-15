const PRESETS = {
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4.1" },
  siliconflow: { baseUrl: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V4-Flash" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" }
};

const state = {
  skills: [],
  selectedSkillId: null,
  apiKeyMemory: ""
};

const $ = (id) => document.getElementById(id);

function setStatus(message) {
  $("status").textContent = message || "";
}

function selectedSkill() {
  return state.skills.find((skill) => skill.id === state.selectedSkillId) || filteredSkills()[0] || state.skills[0];
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
  const list = $("skillList");
  const skills = filteredSkills();
  list.innerHTML = "";
  $("skillCount").textContent = String(skills.length);

  if (!skills.length) {
    state.selectedSkillId = null;
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的技能。请调整搜索词或领域筛选。";
    list.appendChild(empty);
    renderSelectedSkillSummary();
    updateInputPlaceholder();
    return;
  }

  if (!skills.some((skill) => skill.id === state.selectedSkillId)) {
    state.selectedSkillId = skills[0].id;
  }

  for (const skill of skills) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `skill-card${skill.id === state.selectedSkillId ? " active" : ""}`;
    card.innerHTML = `<span></span><b></b><p></p><small></small>`;
    card.querySelector("span").textContent = `${skill.practiceArea} · ${skill.pluginTitle}`;
    card.querySelector("b").textContent = skill.title;
    card.querySelector("p").textContent = skill.description;
    card.querySelector("small").textContent = skill.skillPath;
    card.addEventListener("click", () => {
      state.selectedSkillId = skill.id;
      renderSkills();
      renderSelectedSkillSummary();
      updateInputPlaceholder();
    });
    list.appendChild(card);
  }

  renderSelectedSkillSummary();
  updateInputPlaceholder();
}

function renderSelectedSkillSummary() {
  const skill = selectedSkill();
  const summary = $("selectedSkillSummary");
  if (!skill) {
    summary.textContent = "请先从左侧选择一个技能。";
    return;
  }
  summary.innerHTML = `<span>${skill.practiceArea}</span><strong>${skill.title}</strong><p>${skill.description}</p>`;
}

function updateInputPlaceholder() {
  const skill = selectedSkill();
  $("userInput").placeholder = skill
    ? `请粘贴要交给「${skill.title}」技能处理的事实、合同条款、制度文本或问题。`
    : "请先选择一个专家技能。";
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
  $("output").textContent = "等待生成。请选择左侧技能，在中间粘贴文本，并确认右上角模型配置。";
  $("rememberTab").checked = false;
  sessionStorage.removeItem("clfco.baseUrl");
  sessionStorage.removeItem("clfco.model");
  sessionStorage.removeItem("clfco.apiKey");
  setStatus("已清空本页数据。");
}

function openSettings() {
  $("settingsDrawer").classList.add("open");
  $("settingsDrawer").setAttribute("aria-hidden", "false");
  $("settingsBackdrop").classList.remove("hidden");
  $("openSettings").setAttribute("aria-expanded", "true");
}

function closeSettings() {
  $("settingsDrawer").classList.remove("open");
  $("settingsDrawer").setAttribute("aria-hidden", "true");
  $("settingsBackdrop").classList.add("hidden");
  $("openSettings").setAttribute("aria-expanded", "false");
}

async function loadSkills() {
  const response = await fetch("/api/skills", { cache: "no-store" });
  const data = await response.json();
  state.skills = data.skills || [];
  state.selectedSkillId = state.skills[0]?.id || null;
  populatePracticeFilter();
  renderSkills();
}

function validateBeforeGenerate(skill) {
  if (!skill) return "请先选择一个技能。";
  if (!$("baseUrl").value.trim()) return "请先在右上角“配置模型”中填写 Base URL。";
  if (!$("model").value.trim()) return "请先在右上角“配置模型”中填写 Model。";
  if (!$("apiKey").value.trim()) return "请先在右上角“配置模型”中填写 API Key。";
  if (!$("userInput").value.trim()) return "请先粘贴事项事实或文本。";
  return "";
}

async function generate() {
  const skill = selectedSkill();
  const validationError = validateBeforeGenerate(skill);
  if (validationError) {
    setStatus(validationError);
    if (validationError.includes("配置模型")) openSettings();
    return;
  }

  state.apiKeyMemory = $("apiKey").value;
  saveSessionIfRequested();

  const payload = {
    skillId: skill.id,
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

function safeFilenamePart(value) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "legal-output";
}

function saveOutputAsMarkdown() {
  const skill = selectedSkill();
  const content = $("output").textContent || "";
  if (!content.trim() || content.trim() === "生成失败。" || content.includes("等待生成")) {
    setStatus("暂无可保存的输出。请先生成结果。");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${safeFilenamePart(skill?.title || "legal-output")}-${timestamp}.md`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("已下载 Markdown。仍需律师复核。 ");
}

function fillExample() {
  const skill = selectedSkill();
  if (skill) {
    $("userInput").value = `请使用「${skill.title}」技能处理以下事项，并输出供中国律师复核的结构化草稿：\n\n【事实/文本】\n（在此粘贴合同条款、事项背景、制度文本、监管文件或问题）`;
  }
}

function bindEvents() {
  $("openSettings").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", closeSettings);
  $("settingsBackdrop").addEventListener("click", closeSettings);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSettings();
  });
  $("skillSearch").addEventListener("input", renderSkills);
  $("practiceFilter").addEventListener("change", renderSkills);
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
  $("saveOutput").addEventListener("click", saveOutputAsMarkdown);
}

restoreSession();
bindEvents();
loadSkills().catch((error) => setStatus(error.message || String(error)));
