# Agents runtime — requirements & success criteria

**Package:** `@multimarkets/agents` (`packages/agents`)  
**Goal:** Live multi-character debates with real LLM replies. **No mock chat. No seeded fighters.**

---

## 1. Requirements (must)

| ID | Requirement |
|----|-------------|
| R-1 | Server loads **only** `characters/master.json` as the referee. No Trump/Elon/demo fighters on disk. |
| R-2 | Fighters exist **only** after `POST /agents` (user-registered). |
| R-3 | `GET /agents` never returns `master`. |
| R-4 | A room needs **≥ 2 different** character ids; `master` cannot be a fighter. |
| R-5 | Debate messages come from a **real** OpenAI-compatible LLM (`OPENROUTER_API_KEY` preferred, else xAI/OpenAI). |
| R-6 | Missing LLM key → **clear error** on start (`503` + `LLM_NOT_CONFIGURED`). Never invent lines. |
| R-7 | Host notes are real `system` messages on the transcript. |
| R-8 | SSE stream emits room events (`snapshot`, `message`, `turn_change`, `debate_end`, …). |
| R-9 | CORS allows the web app origin in dev/prod. |
| R-10 | `/health` always returns process liveness; `/ready` is **200 only** when master + LLM are configured. |

---

## 2. Environment (deploy checklist)

```bash
# Required for debates
OPENROUTER_API_KEY=sk-or-…          # preferred
# OR XAI_API_KEY=… / OPENAI_API_KEY=…

OPENROUTER_MODEL=openai/gpt-4o-mini  # optional
PORT=8787

# Recommended
SETTLEMENT_HMAC_SECRET=long-random-string

# Optional
HASHKEY_RPC_URL=https://testnet.hsk.xyz
HSP_COORDINATOR_URL=
```

Copy from `.env.example`. **Do not commit secrets.**

Web app must point at the same host:

```bash
# apps/web/.env.local
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8787   # or production URL
```

---

## 3. Success criteria (pass / fail)

| ID | Criterion | How verified |
|----|-----------|--------------|
| **SC-1** | `GET /health` → `ok: true` | smoke |
| **SC-2** | `GET /agents` excludes master | smoke |
| **SC-3** | Register two characters via `POST /agents` | smoke |
| **SC-4** | Invalid room (1 fighter / master) rejected | smoke |
| **SC-5** | Valid `POST /rooms` returns room id + status | smoke |
| **SC-6** | Host note appears as system message | smoke |
| **SC-7** | With LLM key: `POST …/start` yields **real** persona/master content within 120s (no mock) | smoke (skipped if `/ready` false) |
| **SC-8** | Without LLM key: `POST …/start` → **503** + clear message | manual / start path |
| **SC-9** | `GET /ready` → **503** without key; **200** with key + master | curl |
| **SC-10** | Typecheck clean | `npm run typecheck` |

**Deploy gate:** SC-1–SC-6 + SC-8–SC-10 always. **SC-7 required** on any environment that should run live debates.

---

## 4. HTTP surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + diagnostics (`ready`, `personas`, `llm.configured`) |
| GET | `/ready` | Readiness probe (LLM + master) |
| GET | `/agents` | List fighters only |
| POST | `/agents` | Register character |
| POST | `/rooms` | Create match |
| GET | `/rooms` | List rooms |
| GET | `/rooms/:id` | Room + messages |
| POST | `/rooms/:id/start` | Start debate (requires LLM) |
| POST | `/rooms/:id/notes` | Host note |
| GET | `/rooms/:id/stream` | SSE |

---

## 5. Run & smoke

```bash
cd packages/agents
cp -n .env.example .env   # then set OPENROUTER_API_KEY
npm install
npm run typecheck
npm run dev               # http://localhost:8787

# another terminal
npm run smoke
# or: node scripts/smoke.mjs http://localhost:8787
```

Expected without key: SC-1–SC-6 pass, SC-7 skipped, `/ready` 503.  
Expected with key: SC-7 pass (live model call — not free).

---

## 6. Failure modes (no mocks)

| Symptom | Cause | Fix |
|---------|--------|-----|
| Start 503 `LLM_NOT_CONFIGURED` | Missing key | Set `OPENROUTER_API_KEY`, restart agents |
| Create 400 unknown character | Id not registered | Register via UI Characters or `POST /agents` |
| Empty character list | By design | Users add characters; no seed fighters |
| Room failed mid-debate | Provider error / timeout | Check OpenRouter dashboard, model id, billing |
| CORS errors from Next | Origin blocked | Ensure agents CORS allows web origin |

---

## 7. Explicit non-goals

- No simulated persona speech when LLM is down  
- No preloaded celebrity fighters  
- No fake settlement outcomes without a real vote path when settlement runs  
