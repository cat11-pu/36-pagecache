// app.js：渲染结果
import { run } from "./pager.js";
import { flush, recover } from "./flush.js";

export function render(spec) {
  const state = run(spec.ops, spec.capacity);
  const written = flush(state.dirty, spec.flush_budget);
  const back = recover(written.remaining, spec.flushed_before || []);
  return { resident: state.resident, dirty: state.dirty, flushed: written.flushed,
           evicted: state.evicted, replayed: back.replayed, lost: back.lost,
           underflow: state.underflow };
}
