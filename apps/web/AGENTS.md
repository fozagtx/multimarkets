<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ===================================================
# MultiMarkets — absolute agent rules
# ===================================================

## UI copy rules (non-negotiable)

Never put engineering language in the product UI.

### Banned in the product UI

Buttons, titles, subtitles, empty states, toasts, tooltips, badges, nav labels, hero copy, footers, and any string a user can see must **not** include:

- seeded / seed data / no seeded / unseeded
- mock / fake / fixture / bootstrap
- invariant / registry / runtime
- API / agents service / LLM / OpenRouter / env var names
- “no mock”, “realtime from …”, stack-trace style status lines
- HashKey testnet (or chain IDs) as chrome labels unless the user is **actively** switching network
- Internal codenames, PR notes, or builder status written as product copy

### Required tone

- UI only describes **what the user does and sees** in plain English.
- Prefer short product / conversion copy over accurate-but-jargony labels.
- Examples:
  - **Good:** “Add two characters, then create a match.”
  - **Bad:** “No seeded personas.”
  - **Good:** “Can’t reach the service. Try again.”
  - **Bad:** “Agent API offline at localhost:8787.”

### Where tech truth belongs

System truth (seeds, mocks, keys, RPC, chain 133, OpenRouter, etc.) goes **only** in:

- code comments
- README / docs for developers
- `.env.example`
- PR notes aimed at engineers

If you almost write a tech status line into the UI, **rewrite for a non-dev user first**.

### One-liner

**No eng jargon in the UI — product language only.**

## Product DNA (quick)

- Soft Structuralism: light surfaces, black ink, blue accent `#5B7CFA`
- App shell + ProMax-style sidebar for app routes; landing is separate
- Characters are **user-registered only** (no demo Trump/Elon in the product list)
- Live data from the agents package when running; never invent fake chat in the UI as if it were real
- Default chain: HashKey **testnet 133** (config/docs — not repeated as UI spam)
