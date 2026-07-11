import { RuntimeStore } from "./persistence/RuntimeStore.js";
import { loadDotEnv } from "./server.js";

await loadDotEnv();
const store = RuntimeStore.connect();

try {
  await store.migrate();
  console.log("[@multimarkets/agents] database migration complete");
} finally {
  await store.close();
}
