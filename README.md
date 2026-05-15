# Claude for Legal CN Online

A standalone BYOK online tool for trying China-localized legal skills in a browser.

The app is separate from `claude-for-legal-cn` and consumes that skills repository through a pinned Git submodule at `vendor/claude-for-legal-cn`.

## What It Does

- Mandarin-first guided chat for Chinese lawyers.
- Bring-your-own OpenAI-compatible API endpoint, model, and key.
- Presets for OpenRouter, SiliconFlow, and DeepSeek.
- No accounts, no database, no server-side storage of keys, prompts, responses, or matter facts.
- Text/paste-only MVP; no file upload.
- Cloudflare Workers + Static Assets deployment target.

## Modes

### Demo Mode / 演示模式

Demo Mode keeps the original 8 curated scenarios for quick trial, including commercial contract review, PIPL rights requests, equity diligence, employment termination, litigation evidence planning, IP platform complaints, AI product launch review, and regulatory gap analysis.

Use this mode when a lawyer wants a guided starting point without choosing a specific underlying skill.

### Expert Mode / 专家模式

Expert Mode exposes lawyer-facing practice skills generated from the pinned `claude-for-legal-cn` submodule.

Included practice plugins:

- `commercial-legal`
- `corporate-legal`
- `privacy-legal`
- `litigation-legal`
- `regulatory-legal`
- `employment-legal`
- `ip-legal`
- `product-legal`
- `ai-governance-legal`

Hidden from Expert Mode by default:

- builder/admin/student/external plugins;
- setup/internal skills such as `customize`, `matter-workspace`, and `cold-start-interview`.

After updating the skills submodule, regenerate the static catalog and prompt contexts:

```bash
npm run generate:contexts
```

## Quick Start

```bash
cd /Users/hezhiheng/src/claude-for-legal-cn-online
npm install
npm test
npm run dev
```

Open the local URL printed by Wrangler.

## BYOK Privacy Model

- API key is kept in browser memory by default.
- If the user chooses “本标签页记住”, the key is stored only in `sessionStorage`.
- The Worker receives the key only for the current proxy request and does not persist it.
- Errors are sanitized and must not echo keys, full prompts, or provider authorization headers.

## API

### `GET /api/scenarios`

Returns curated Demo Mode scenario metadata.

### `GET /api/skills`

Returns Expert Mode skill metadata only. It does not return full skill prompt text.

```json
{
  "skills": [
    {
      "id": "commercial_legal__review",
      "title": "Review",
      "practiceArea": "商事合同",
      "plugin": "commercial-legal",
      "pluginTitle": "Commercial Legal",
      "skillPath": "commercial-legal/skills/review/SKILL.md",
      "description": "...",
      "keywords": "..."
    }
  ]
}
```

### `POST /api/chat`

Demo Mode request:

```json
{
  "scenarioId": "commercial_saas_data_export",
  "baseUrl": "https://openrouter.ai/api/v1",
  "model": "openai/gpt-4.1",
  "apiKey": "sk-...",
  "userInput": "审查这份 SaaS 合同..."
}
```

Expert Mode request:

```json
{
  "skillId": "commercial_legal__review",
  "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-chat",
  "apiKey": "sk-...",
  "userInput": "请审查以下合同条款..."
}
```

Response:

```json
{
  "content": "...markdown...",
  "provider": "openai-compatible",
  "model": "deepseek-chat",
  "targetKind": "skill",
  "skillId": "commercial_legal__review"
}
```

## Deploy

```bash
npm run deploy
```

The default deployment target is Cloudflare Workers + Static Assets. `predev`, `predeploy`, and `pretest` regenerate prompt contexts from the submodule.

## Legal Safety

This tool produces lawyer-review drafts only. It does not provide legal advice, does not verify live legal sources, and must not be used to file, submit, sign, send, or rely on legal work without review by a qualified lawyer.
