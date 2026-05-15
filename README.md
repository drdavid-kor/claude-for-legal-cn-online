# Claude for Legal CN Online

A standalone BYOK online tool for trying China-localized legal skills in a browser.

This repository is designed to live separately from `claude-for-legal-cn`. In this delivery scaffold it sits under `deliveries/` because the current sandbox cannot create the sibling repo directly. Move this folder to:

```text
/Users/hezhiheng/src/claude-for-legal-cn-online
```

Then run the bootstrap script to initialize Git and attach the skills repo as a submodule.

## What It Does

- Mandarin-first guided chat for Chinese lawyers.
- Bring-your-own OpenAI-compatible API endpoint, model, and key.
- Presets for OpenRouter, SiliconFlow, and DeepSeek.
- No accounts, no database, no server-side storage of keys, prompts, responses, or matter facts.
- Text/paste-only MVP; no file upload.
- Cloudflare Workers + Static Assets deployment target.

## Quick Start After Moving

```bash
cd /Users/hezhiheng/src/claude-for-legal-cn-online
bash scripts/bootstrap-submodule.sh
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

Returns curated scenario metadata:

```json
{
  "scenarios": [
    {
      "id": "commercial_saas_data_export",
      "title": "商事合同审查",
      "practiceArea": "商事合同",
      "description": "SaaS/采购合同，重点关注数据出境与责任限制。",
      "examplePrompt": "...",
      "skillPath": "commercial-legal/skills/review/SKILL.md",
      "referencePaths": ["references/china-legal-foundation.md"]
    }
  ]
}
```

### `POST /api/chat`

Request:

```json
{
  "scenarioId": "commercial_saas_data_export",
  "baseUrl": "https://openrouter.ai/api/v1",
  "model": "openai/gpt-4.1",
  "apiKey": "sk-...",
  "userInput": "审查这份 SaaS 合同..."
}
```

Response:

```json
{
  "content": "...markdown...",
  "provider": "custom",
  "model": "openai/gpt-4.1",
  "scenarioId": "commercial_saas_data_export"
}
```

## Deploy

```bash
npm run deploy
```

The default deployment target is Cloudflare Workers + Static Assets.

## Legal Safety

This tool produces lawyer-review drafts only. It does not provide legal advice, does not verify live legal sources, and must not be used to file, submit, sign, send, or rely on legal work without review by a qualified lawyer.
