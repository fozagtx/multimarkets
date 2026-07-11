#!/usr/bin/env node
/**
 * No-mock smoke test against a running agents server.
 * Usage: node scripts/smoke.mjs [baseUrl]
 * Exit 0 = all required checks passed; 1 = failure.
 *
 * SC-1..SC-6 always run (no LLM required for create).
 * SC-7 (start debate + first message) runs only when /ready is true.
 */

const BASE = (process.argv[2] || process.env.AGENT_API_URL || "http://localhost:8787").replace(
  /\/$/,
  "",
);

let failed = 0;
const results = [];

function ok(id, msg) {
  results.push({ id, pass: true, msg });
  console.log(`  PASS  ${id}  ${msg}`);
}
function fail(id, msg) {
  failed += 1;
  results.push({ id, pass: false, msg });
  console.error(`  FAIL  ${id}  ${msg}`);
}

async function json(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

async function main() {
  console.log(`\n[@multimarkets/agents smoke] ${BASE}\n`);

  // SC-1 Health
  {
    const { res, body } = await json("/health");
    if (res.ok && body?.ok === true) {
      ok("SC-1", `health ok · personas=${body.personas ?? "?"} · llm=${body.llm?.configured}`);
    } else {
      fail("SC-1", `health failed status=${res.status}`);
    }
  }

  // SC-2 Master not listed as selectable agent
  {
    const { res, body } = await json("/agents");
    const agents = Array.isArray(body?.agents) ? body.agents : [];
    const hasMaster = agents.some(
      (a) => (a.id || "").toLowerCase() === "master" || (a.name || "").toLowerCase() === "master agent",
    );
    if (res.ok && !hasMaster) {
      ok("SC-2", `GET /agents returns ${agents.length} fighters (master excluded)`);
    } else {
      fail("SC-2", hasMaster ? "master leaked into /agents" : `status=${res.status}`);
    }
  }

  // SC-3 Register two characters (real registry, not seed files)
  const stamp = Date.now().toString(36);
  let idA;
  let idB;
  {
    const a = await json("/agents", {
      method: "POST",
      body: JSON.stringify({
        name: `SmokeA-${stamp}`,
        bio: ["Smoke test character A", "Speaks clearly"],
        adjectives: ["clear", "direct"],
        topics: ["markets", "tech"],
        style: { chat: ["Short sentences"], all: [] },
      }),
    });
    const b = await json("/agents", {
      method: "POST",
      body: JSON.stringify({
        name: `SmokeB-${stamp}`,
        bio: ["Smoke test character B", "Pushes back"],
        adjectives: ["skeptical", "sharp"],
        topics: ["policy", "energy"],
        style: { chat: ["Challenges claims"], all: [] },
      }),
    });
    idA = a.body?.id;
    idB = b.body?.id;
    if (a.res.status === 201 && b.res.status === 201 && idA && idB && idA !== idB) {
      ok("SC-3", `registered ${idA} + ${idB}`);
    } else {
      fail(
        "SC-3",
        `register failed a=${a.res.status} b=${b.res.status} ${JSON.stringify(a.body).slice(0, 120)}`,
      );
    }
  }

  // SC-4 Reject room with one character / master / duplicates
  {
    const one = await json("/rooms", {
      method: "POST",
      body: JSON.stringify({
        characterIds: [idA || "x"],
        topic: "t",
        marketQuestion: "q?",
      }),
    });
    const master = await json("/rooms", {
      method: "POST",
      body: JSON.stringify({
        characterIds: ["master", idA || "x"],
        topic: "t",
        marketQuestion: "q?",
      }),
    });
    if (one.res.status >= 400 && master.res.status >= 400) {
      ok("SC-4", "rejects invalid room configs");
    } else {
      fail("SC-4", `expected 4xx one=${one.res.status} master=${master.res.status}`);
    }
  }

  // SC-5 Create valid room
  let roomId;
  {
    const { res, body } = await json("/rooms", {
      method: "POST",
      body: JSON.stringify({
        characterIds: [idA, idB],
        topic: "Open models vs closed labs",
        marketQuestion: "Will open models dominate enterprise by 2027?",
        maxTurns: 4,
      }),
    });
    roomId = body?.room?.id;
    if (res.status === 201 && roomId && body.room.status) {
      ok("SC-5", `room ${roomId} status=${body.room.status}`);
    } else {
      fail("SC-5", `create room failed ${res.status} ${JSON.stringify(body).slice(0, 160)}`);
    }
  }

  // SC-6 Host note (real message, not persona speech)
  if (roomId) {
    const { res, body } = await json(`/rooms/${roomId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content: "Host: stay on the market question." }),
    });
    const msg = body?.message;
    if (res.status === 201 && msg?.role === "system" && msg?.content) {
      ok("SC-6", "host note stored on transcript");
    } else {
      fail("SC-6", `notes failed ${res.status}`);
    }
  } else {
    fail("SC-6", "skipped — no room");
  }

  // SC-7 Start + first LLM message (only if ready)
  {
    const ready = await json("/ready");
    if (!ready.res.ok || !ready.body?.ready) {
      console.log(
        `  SKIP  SC-7  LLM not configured (set OPENROUTER_API_KEY). /ready=${ready.res.status}`,
      );
      results.push({
        id: "SC-7",
        pass: true,
        msg: "skipped — LLM not configured (deploy must set key)",
        skipped: true,
      });
    } else if (!roomId) {
      fail("SC-7", "no room");
    } else {
      const start = await json(`/rooms/${roomId}/start`, { method: "POST" });
      if (!start.res.ok) {
        fail("SC-7", `start failed ${start.res.status} ${JSON.stringify(start.body).slice(0, 160)}`);
      } else {
        // Poll for persona/master message (real LLM — no mock)
        let sawSpeech = false;
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const g = await json(`/rooms/${roomId}`);
          const messages = g.body?.messages || g.body?.room?.messages || [];
          if (
            messages.some(
              (m) =>
                (m.role === "persona" || m.role === "master") &&
                typeof m.content === "string" &&
                m.content.trim().length > 0,
            )
          ) {
            sawSpeech = true;
            break;
          }
          if (g.body?.room?.status === "failed" || g.body?.status === "failed") {
            fail("SC-7", `room failed: ${g.body?.room?.error || g.body?.error || "unknown"}`);
            sawSpeech = false;
            break;
          }
          await new Promise((r) => setTimeout(r, 2500));
        }
        if (sawSpeech) {
          ok("SC-7", "start + real LLM message received (no mock)");
        } else if (!results.find((r) => r.id === "SC-7" && !r.pass)) {
          fail("SC-7", "timed out waiting for first live message");
        }
      }
    }
  }

  console.log("\n── summary ──");
  const required = results.filter((r) => r.id !== "SC-7" || !r.skipped);
  const passed = required.filter((r) => r.pass).length;
  console.log(`${passed}/${required.length} required checks passed`);
  if (failed > 0) {
    console.error("SMOKE FAILED\n");
    process.exit(1);
  }
  console.log("SMOKE PASSED\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
