import { SCENARIOS, getScenario } from "./scenarios";
import { EXPERT_SKILLS, getExpertSkill } from "./generated/expert-skills";
import {
  buildSystemPromptForScenario,
  buildSystemPromptForSkill,
  buildUserPromptForScenario,
  buildUserPromptForSkill
} from "./prompt";

type AssetFetcher = {
  fetch(request: Request): Promise<Response> | Response;
};

type Env = {
  ASSETS: AssetFetcher;
};

type ChatRequest = {
  scenarioId?: string;
  skillId?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  userInput?: string;
};

type ValidatedChatRequest = {
  targetKind: "scenario" | "skill";
  targetId: string;
  chatUrl: string;
  model: string;
  apiKey: string;
  userInput: string;
};

const MAX_INPUT_CHARS = 120_000;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return message
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9._\-]+/gi, "[redacted-key]")
    .slice(0, 500);
}

function isLocalhost(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

function normalizeChatUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) throw new Error("缺少 API Base URL");

  const url = new URL(trimmed);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost(url))) {
    throw new Error("API Base URL 必须使用 HTTPS；本地开发可使用 localhost HTTP");
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/chat/completions")) return url.toString();
  if (pathname.endsWith("/v1")) {
    url.pathname = `${pathname}/chat/completions`;
    return url.toString();
  }
  url.pathname = `${pathname}/v1/chat/completions`.replace(/\/+/g, "/");
  return url.toString();
}

function validateTarget(body: ChatRequest): { targetKind: "scenario" | "skill"; targetId: string } {
  const scenarioId = body.scenarioId?.trim() || "";
  const skillId = body.skillId?.trim() || "";

  if (!scenarioId && !skillId) throw new Error("请选择演示场景或专家技能");
  if (scenarioId && skillId) throw new Error("一次请求只能选择一个演示场景或一个专家技能");
  if (scenarioId && !getScenario(scenarioId)) throw new Error("未知场景");
  if (skillId && !getExpertSkill(skillId)) throw new Error("未知专家技能");

  return scenarioId
    ? { targetKind: "scenario", targetId: scenarioId }
    : { targetKind: "skill", targetId: skillId };
}

function validateChatRequest(body: ChatRequest): ValidatedChatRequest {
  const model = body.model?.trim() || "";
  const apiKey = body.apiKey?.trim() || "";
  const userInput = body.userInput?.trim() || "";
  const target = validateTarget(body);

  if (!model) throw new Error("缺少模型名称");
  if (!apiKey) throw new Error("缺少 API Key");
  if (!userInput) throw new Error("请先粘贴事项事实或文本");
  if (userInput.length > MAX_INPUT_CHARS) throw new Error(`输入过长；当前上限为 ${MAX_INPUT_CHARS} 字符`);

  return {
    ...target,
    chatUrl: normalizeChatUrl(body.baseUrl || ""),
    model,
    apiKey,
    userInput
  };
}

function buildProviderMessages(validated: ValidatedChatRequest) {
  if (validated.targetKind === "skill") {
    const skill = getExpertSkill(validated.targetId)!;
    return [
      { role: "system", content: buildSystemPromptForSkill(skill) },
      { role: "user", content: buildUserPromptForSkill(skill, validated.userInput) }
    ];
  }

  const scenario = getScenario(validated.targetId)!;
  return [
    { role: "system", content: buildSystemPromptForScenario(scenario) },
    { role: "user", content: buildUserPromptForScenario(scenario, validated.userInput) }
  ];
}

async function handleChat(request: Request): Promise<Response> {
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体必须是 JSON" }, 400);
  }

  let validated: ValidatedChatRequest;
  try {
    validated = validateChatRequest(body);
  } catch (error) {
    return json({ error: sanitizeError(error) }, 400);
  }

  const providerRequest = {
    model: validated.model,
    messages: buildProviderMessages(validated),
    temperature: 0.2
  };

  try {
    const providerResponse = await fetch(validated.chatUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${validated.apiKey}`
      },
      body: JSON.stringify(providerRequest)
    });

    const responseText = await providerResponse.text();
    if (!providerResponse.ok) {
      return json({ error: `模型服务返回错误：${providerResponse.status} ${sanitizeError(responseText)}` }, 502);
    }

    const providerJson = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
    const content = providerJson.choices?.[0]?.message?.content || "";
    if (!content) return json({ error: "模型服务未返回可显示内容" }, 502);

    return json({
      content,
      provider: "openai-compatible",
      model: validated.model,
      targetKind: validated.targetKind,
      scenarioId: validated.targetKind === "scenario" ? validated.targetId : undefined,
      skillId: validated.targetKind === "skill" ? validated.targetId : undefined
    });
  } catch (error) {
    return json({ error: `调用模型服务失败：${sanitizeError(error)}` }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/scenarios") {
      return json({ scenarios: SCENARIOS });
    }

    if (request.method === "GET" && url.pathname === "/api/skills") {
      return json({ skills: EXPERT_SKILLS });
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(request);
    }

    return env.ASSETS.fetch(request);
  }
};
