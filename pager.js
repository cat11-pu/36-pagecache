// pager.js：页面状态与淘汰
// - read/write 装入页（write 装入的页带脏标记），命中只刷新 LRU
// - pin/unpin 维护引用计数；引用计数为 0 的页才可淘汰，按最久未使用优先
// - 容量不足且无零引用页时抛 E_NO_VICTIM；解引用未引用页记一次下溢
export function run(ops, capacity) {
  const present = new Set();              // 驻留页，迭代顺序即装入顺序
  const dirty = new Set();                // 脏页集合
  const evicted = [];                     // 淘汰顺序
  const refs = new Map();                 // page -> 引用计数（驻留页）
  const free = new Map();                 // 引用计数为 0 的页，Map 序即 LRU 序
  let underflow = 0;

  function touch(page) {
    if (refs.get(page) === 0) {
      free.delete(page);
      free.set(page, true);
    }
  }

  function evictOne() {
    const oldest = free.keys().next().value;
    if (oldest === undefined) {
      const err = new Error("no evictable page: all resident pages are pinned");
      err.code = "E_NO_VICTIM";
      throw err;
    }
    free.delete(oldest);
    present.delete(oldest);
    refs.delete(oldest);
    dirty.delete(oldest);
    evicted.push(oldest);
  }

  for (const op of ops) {
    const page = op.page;
    if (op.op === "read" || op.op === "write") {
      if (!present.has(page)) {
        if (present.size >= capacity) evictOne();
        present.add(page);
        refs.set(page, 0);
        free.set(page, true);
        if (op.op === "write") dirty.add(page);
      } else {
        touch(page);
      }
    } else if (op.op === "pin") {
      if (present.has(page)) {
        const count = refs.get(page);
        if (count === 0) free.delete(page);
        refs.set(page, count + 1);
      }
    } else if (op.op === "unpin") {
      const count = present.has(page) ? refs.get(page) : 0;
      if (count > 0) {
        const next = count - 1;
        refs.set(page, next);
        if (next === 0) free.set(page, true);
      } else {
        underflow += 1;
      }
    }
  }

  return {
    resident: [...present],
    dirty: [...dirty],
    evicted: evicted,
    underflow: underflow,
  };
}
