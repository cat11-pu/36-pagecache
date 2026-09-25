// flush.js：按预算回写脏页与崩溃恢复
export function flush(dirty, budget) {
  const limit = Math.max(0, Math.min(budget, dirty.length));
  return {
    flushed: dirty.slice(0, limit),
    remaining: dirty.slice(limit)
  };
}

export function recover(dirty, flushedBefore) {
  // dirty：本次没回写完的页；flushedBefore：日志里确认已落盘的页
  const logged = new Set(flushedBefore);
  const replayed = [];
  const lost = [];
  for (const page of dirty) {
    if (logged.has(page)) replayed.push(page);
    else lost.push(page);
  }
  return { replayed: replayed, lost: lost };
}
