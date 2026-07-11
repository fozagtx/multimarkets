# Project Learnings

> Managed by `/learn`. Append-only — latest entry wins on conflicts.

## Patterns

### app-route-wallet-gate
- **Insight:** Keep the landing page public, but render no app-route content until a wallet account is connected; preserve the current route after connection.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** apps/web/src/components/app-chrome.tsx, apps/web/src/components/wallet-access-gate.tsx
- **Date:** 2026-07-11

### client-side-sidebar-navigation
- **Insight:** Strip native href values from HeroUI sidebar list items when navigation is handled by Next router, or item clicks reload the document.
- **Confidence:** 10/10
- **Source:** diagnose
- **Files:** apps/web/src/components/app-sidebar.tsx
- **Date:** 2026-07-11

### conversation-reading-control
- **Insight:** Keep the conversation feed at a fixed height, auto-follow only at the bottom, and provide an explicit jump-to-latest action for unread turns.
- **Confidence:** 10/10
- **Source:** frontend-design-guidelines
- **Files:** apps/web/src/components/ai/prompt-container-with-conversation.tsx
- **Date:** 2026-07-11

## Pitfalls

### product-copy-leaks-implementation
- **Insight:** Raw errors, deployment state, providers, networks, and other implementation details must never appear in product UI copy.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** apps/web/AGENTS.md, apps/web/src
- **Date:** 2026-07-11

### decorative-controls-mislead
- **Insight:** Do not render local-only match settings as active controls when they cannot affect the running match.
- **Confidence:** 10/10
- **Source:** product-ui-polish
- **Files:** apps/web/src/components/ai/arena-controls.tsx
- **Date:** 2026-07-11

## Preferences

### permanent-light-product-ui
- **Insight:** MultiMarkets is light-only; use light surfaces, black ink, blue accent, white selected-sidebar text, and never restore dark-mode contrast failures.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** apps/web/src/app/globals.css, apps/web/src/components/app-sidebar.tsx
- **Date:** 2026-07-11

### sidebar-control-placement
- **Insight:** Desktop sidebar compact/expand control belongs inside the sidebar, never in page-level dashboard chrome.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** apps/web/src/components/app-shell.tsx, apps/web/src/components/app-sidebar.tsx
- **Date:** 2026-07-11

## Architecture

### openrouter-only-debate-generation
- **Insight:** Debate generation is OpenRouter-only and must not regain alternate provider fallback paths.
- **Confidence:** 10/10
- **Source:** manual
- **Files:** packages/agents/src/agents/PersonaAgent.ts, packages/agents/src/types.ts
- **Date:** 2026-07-11

## Tools
