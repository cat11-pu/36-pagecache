import fs from "node:fs";
import { run } from "./pager.js";
import { flush, recover } from "./flush.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/pages.json", "utf8"));
const ops = typeof spec.crash_at === "number"
  ? spec.ops.slice(0, spec.crash_at)
  : spec.ops;
const state = run(ops, spec.capacity);
const written = flush(state.dirty, spec.flush_budget);
const back = recover(written.remaining, spec.flushed_before || []);
const out = render(spec);

emit("驻留页 =", state.resident);
emit("脏页 =", state.dirty);
emit("本次回写的页 =", written.flushed);
emit("淘汰的页 =", state.evicted);
emit("恢复时重放的页 =", back.replayed);
emit("恢复时丢掉的页 =", back.lost);
emit("引用计数下溢次数 =", state.underflow);
emit("没有可淘汰页的错误码 =", spec.no_victim_code);


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "驻留页": [
    "p0",
    "p3",
    "p4"
  ],
  "脏页": [
    "p4"
  ],
  "本次回写的页": [
    "p4"
  ],
  "淘汰的页": [
    "p1",
    "p2"
  ],
  "恢复时重放的页": [],
  "恢复时丢掉的页": [],
  "引用计数下溢次数": 0,
  "没有可淘汰页的错误码": "E_NO_VICTIM"
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
