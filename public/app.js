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

function currentOutputText() {
  return $("output").textContent || "";
}

async function copyOutput() {
  await navigator.clipboard.writeText(currentOutputText());
  setStatus("已复制 Markdown。仍需律师复核。");
}

function safeFilenamePart(value) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "legal-output";
}

function outputIsDownloadable(content) {
  const trimmed = content.trim();
  return Boolean(trimmed) && trimmed !== "生成失败。" && !trimmed.includes("等待生成");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markdownBlob(content) {
  return new Blob([content], { type: "text/markdown;charset=utf-8" });
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function markdownToDocxParagraphs(content) {
  return content.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "<w:p/>";
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const text = heading?.[2] || bullet?.[1] || numbered?.[1] || trimmed;
    const bold = Boolean(heading);
    const prefix = bullet ? "• " : numbered ? "- " : "";
    return `<w:p><w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xmlEscape(prefix + text)}</w:t></w:r></w:p>`;
  }).join("");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255]);
}

function u32(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}

function concatBytes(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(dataBytes);
    const localHeader = concatBytes([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0), nameBytes
    ]);
    localParts.push(localHeader, dataBytes);

    const centralHeader = concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nameBytes
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralDirectory.length), u32(offset), u16(0)
  ]);
  return concatBytes([...localParts, centralDirectory, end]);
}

function docxBlob(content) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${markdownToDocxParagraphs(content)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", data: documentXml }
  ];
  return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function wrapCanvasText(ctx, text, maxWidth) {
  const chars = Array.from(text);
  const lines = [];
  let line = "";
  for (const char of chars) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderPdfPages(content) {
  const pages = [];
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法创建 PDF 画布。请改用 MD 或 DOCX 下载。");
  const margin = 88;
  const maxWidth = canvas.width - margin * 2;
  const lineHeight = 36;
  const maxY = canvas.height - 92;
  let y = margin;

  function newPage() {
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#9d1f1f";
    ctx.font = '700 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText("Claude for Legal CN Online · 律师复核草稿", margin, 48);
    ctx.fillStyle = "#211b16";
    ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
    y = margin;
  }

  function commitPage() {
    pages.push(canvas.toDataURL("image/jpeg", 0.92));
  }

  newPage();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim() || " ";
    if (/^#{1,3}\s+/.test(line)) {
      ctx.font = '700 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    } else {
      ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
    }
    const wrapped = wrapCanvasText(ctx, line.replace(/^#{1,3}\s+/, ""), maxWidth);
    for (const wrappedLine of wrapped.length ? wrapped : [""]) {
      if (y > maxY) {
        commitPage();
        newPage();
      }
      ctx.fillText(wrappedLine, margin, y);
      y += lineHeight;
    }
    y += 8;
  }
  commitPage();
  return pages;
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pdfBlob(content) {
  const pageImages = renderPdfPages(content);
  const encoder = new TextEncoder();
  const parts = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  const objects = [];
  const pageObjectIds = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const imageObjects = [];
  const contentObjects = [];
  pageImages.forEach((dataUrl, index) => {
    const imageId = 3 + index * 3;
    const contentId = imageId + 1;
    const pageId = imageId + 2;
    const imageBytes = base64ToBytes(dataUrl.split(",")[1]);
    const stream = `q 595 0 0 842 0 0 cm /Im${index} Do Q`;
    imageObjects.push({ id: imageId, bytes: imageBytes });
    contentObjects.push({ id: contentId, text: `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n` });
    pageObjectIds.push(pageId);
    objects.push(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> >> /Contents ${contentId} 0 R >>\nendobj\n`);
  });
  objects.splice(1, 0, `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>\nendobj\n`);

  const allObjectEntries = [];
  allObjectEntries.push({ id: 1, data: objects[0] });
  allObjectEntries.push({ id: 2, data: objects[1] });
  for (let i = 0; i < pageImages.length; i += 1) {
    const image = imageObjects[i];
    const content = contentObjects[i];
    const pageText = objects[2 + i];
    allObjectEntries.push({ id: image.id, data: `${image.id} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`, binary: image.bytes, trailer: "\nendstream\nendobj\n" });
    allObjectEntries.push({ id: content.id, data: content.text });
    allObjectEntries.push({ id: 3 + i * 3 + 2, data: pageText });
  }

  let offset = parts[0].length;
  for (const entry of allObjectEntries.sort((a, b) => a.id - b.id)) {
    offsets[entry.id] = offset;
    const head = encoder.encode(entry.data);
    parts.push(head);
    offset += head.length;
    if (entry.binary) {
      parts.push(entry.binary);
      offset += entry.binary.length;
    }
    if (entry.trailer) {
      const trailer = encoder.encode(entry.trailer);
      parts.push(trailer);
      offset += trailer.length;
    }
  }

  const xrefOffset = offset;
  const objectCount = Math.max(...allObjectEntries.map((entry) => entry.id));
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objectCount; i += 1) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encoder.encode(xref));
  return new Blob(parts, { type: "application/pdf" });
}

async function saveOutput() {
  const skill = selectedSkill();
  const content = currentOutputText();
  if (!outputIsDownloadable(content)) {
    setStatus("暂无可保存的输出。请先生成结果。");
    return;
  }

  const format = $("exportFormat").value;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const basename = `${safeFilenamePart(skill?.title || "legal-output")}-${timestamp}`;
  try {
    const blob = format === "docx" ? docxBlob(content) : format === "pdf" ? pdfBlob(content) : markdownBlob(content);
    downloadBlob(blob, `${basename}.${format}`);
    setStatus(`已下载 ${format.toUpperCase()}。仍需律师复核。`);
  } catch (error) {
    setStatus(error.message || "下载失败。请改用其他格式。");
  }
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
  $("saveOutput").addEventListener("click", saveOutput);
}

restoreSession();
bindEvents();
loadSkills().catch((error) => setStatus(error.message || String(error)));
