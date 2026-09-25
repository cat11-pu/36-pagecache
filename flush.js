// flush.js：回写与恢复（基线：不回写、不恢复）
export function flush(dirty, budget) {
  return { flushed: [], remaining: dirty.slice() };
}

export function recover(dirty, flushedBefore) {
  return { replayed: [], lost: [] };
}
