import assert from "node:assert";
import { run } from "../pager.js";
import { flush, recover } from "../flush.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const ops = [{ op: "write", page: "p0" }];

check("run returns resident", () => {
  assert.ok(Array.isArray(run(ops, 4).resident));
});

check("run reports underflow count", () => {
  assert.strictEqual(typeof run(ops, 4).underflow, "number");
});

check("flush splits flushed and remaining", () => {
  const out = flush(["p0"], 1);
  assert.ok(Array.isArray(out.flushed) && Array.isArray(out.remaining));
});

check("recover returns replayed", () => {
  assert.ok(Array.isArray(recover([], []).replayed));
});

check("render exposes evicted", () => {
  assert.ok(Array.isArray(render({ ops: ops, capacity: 4, flush_budget: 1 }).evicted));
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
