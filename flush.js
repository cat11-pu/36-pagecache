// flush.js：按预算回写最老脏页；崩溃后依日志重放或报丢失
export function flush(dirty, budget) {
  const limit = Math.max(0, Math.min(budget, dirty.length));
  return {
    flushed: dirty.slice(0, limit),
    remaining: dirty.slice(limit),
  };
}

export function recover(dirty, flushedBefore) {
  const logged = new Set(flushedBefore);
  const replayed = [];
  const lost = [];
  for (const page of dirty) {
    if (logged.has(page)) replayed.push(page);
    else lost.push(page);
  }
  return { replayed: replayed, lost: lost };
}
