# OpenRouter API Examples For Repo Review

This file shows exact request patterns for reviewing this repo with Claude Opus 4.7 through OpenRouter.

Official docs:

- https://openrouter.ai/docs/api-reference/chat-completion
- https://openrouter.ai/docs/api-reference/overview
- https://openrouter.ai/anthropic/claude-opus-4.7

## 1. Export the API key

```bash
export OPENROUTER_API_KEY='replace-me'
```

## 2. Build a local repo context file

Run from the repo root:

```bash
{
  echo '===== docs/review/repo-brief.md ====='
  cat docs/review/repo-brief.md
  echo
  echo '===== README.md ====='
  sed -n '1,260p' README.md
  echo
  echo '===== docs/reviewer-checklist.md ====='
  cat docs/reviewer-checklist.md
  echo
  echo '===== packages/contracts/src/schemas.ts ====='
  sed -n '1,320p' packages/contracts/src/schemas.ts
  echo
  echo '===== services/gateway/src/hermes/structuredBody.ts ====='
  sed -n '1,280p' services/gateway/src/hermes/structuredBody.ts
  echo
  echo '===== services/gateway/src/lib/hermesClient.ts ====='
  sed -n '1,360p' services/gateway/src/lib/hermesClient.ts
  echo
  echo '===== services/gateway/src/routes/requests.ts ====='
  sed -n '1,220p' services/gateway/src/routes/requests.ts
  echo
  echo '===== services/gateway/src/routes/uploads.ts ====='
  sed -n '1,220p' services/gateway/src/routes/uploads.ts
  echo
  echo '===== services/gateway/src/routes/writeback.ts ====='
  sed -n '1,260p' services/gateway/src/routes/writeback.ts
  echo
  echo '===== apps/google-sheets-addon/src/Code.gs ====='
  sed -n '1,320p' apps/google-sheets-addon/src/Code.gs
  echo
  echo '===== apps/google-sheets-addon/html/Sidebar.js.html ====='
  sed -n '1,320p' apps/google-sheets-addon/html/Sidebar.js.html
  echo
  echo '===== apps/excel-addin/src/taskpane/taskpane.js ====='
  sed -n '620,980p' apps/excel-addin/src/taskpane/taskpane.js
} > /tmp/hermes-review-context.txt
```

## 3. Build the OpenRouter request payload

Run from the repo root:

```bash
jq -n \
  --rawfile system prompts/openrouter-claude-opus-4.7-system.md \
  --rawfile user prompts/openrouter-claude-opus-4.7-user.md \
  --rawfile context /tmp/hermes-review-context.txt \
  '{
    model: "anthropic/claude-opus-4.7",
    temperature: 0,
    max_tokens: 4000,
    messages: [
      { role: "system", content: $system },
      { role: "user", content: ($user + "\n\n" + $context) }
    ]
  }' > /tmp/openrouter-hermes-review-request.json
```

## 4. Send the review request

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: https://local.repo.review" \
  -H "X-OpenRouter-Title: Hermes Spreadsheet Suite Review" \
  -d @/tmp/openrouter-hermes-review-request.json \
  -o /tmp/openrouter-hermes-review-response.json
```

## 5. Read only the review text

```bash
jq -r '.choices[0].message.content' /tmp/openrouter-hermes-review-response.json
```

## 6. Minimal one-shot version

```bash
jq -n \
  --rawfile system prompts/openrouter-claude-opus-4.7-system.md \
  --rawfile user prompts/openrouter-claude-opus-4.7-user.md \
  --rawfile context /tmp/hermes-review-context.txt \
  '{model:"anthropic/claude-opus-4.7",temperature:0,max_tokens:4000,messages:[{role:"system",content:$system},{role:"user",content:($user + "\n\n" + $context)}]}' \
| curl https://openrouter.ai/api/v1/chat/completions \
    -H "Authorization: Bearer '"'"$OPENROUTER_API_KEY"'"'" \
    -H "Content-Type: application/json" \
    -H "HTTP-Referer: https://local.repo.review" \
    -H "X-OpenRouter-Title: Hermes Spreadsheet Suite Review" \
    -d @- \
| jq -r '.choices[0].message.content'
```

## Notes

- Keep `temperature: 0` for deterministic review tone.
- If the context file gets too large, split the review into multiple passes.
- Start with contracts + gateway + one host if you want the highest signal per token.
