// app.js：渲染结果
import { run } from "./pager.js";
import { flush, recover } from "./flush.js";

export function render(spec) {
  // crash_at：崩溃发生在该步（从 0 起），该步及其后的操作均未完成
  const ops = typeof spec.crash_at === "number"
    ? spec.ops.slice(0, spec.crash_at)
    : spec.ops;
  const state = run(ops, spec.capacity);
  const written = flush(state.dirty, spec.flush_budget);
  const back = recover(written.remaining, spec.flushed_before || []);
  return { resident: state.resident, dirty: state.dirty, flushed: written.flushed,
           evicted: state.evicted, replayed: back.replayed, lost: back.lost,
           underflow: state.underflow };
}
