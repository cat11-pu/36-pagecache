// pager.js：驻留、脏页、引用计数与 LRU 淘汰
// 找牺牲品用惰性最小堆（候选带 LRU 序号与帧代际），pin/unpin 只改计数，
// 不会为淘汰而全表扫描引用计数；访问、装入、pin/unpin 均摊 O(log n)。
export function run(ops, capacity) {
  const pages = new Map();        // page -> { name, prev, next, seq, gen, ref, dirty }
  let head = null;                // LRU 队首：最久未使用
  let tail = null;                // LRU 队尾：最近使用
  const heap = [];                // 最小堆，元素 { seq, page, gen }，过期项淘汰时惰性丢弃
  let clock = 0;                  // LRU 单调时钟
  let genClock = 0;               // 帧代际：页被淘汰后重新装入即换新
  const dirtySet = new Set();     // 按首次变脏的先后保存脏页
  const evicted = [];
  let underflow = 0;

  function heapPush(entry) {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].seq <= heap[i].seq) break;
      const tmp = heap[parent];
      heap[parent] = heap[i];
      heap[i] = tmp;
      i = parent;
    }
  }

  function heapPop() {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heap.length && heap[left].seq < heap[smallest].seq) smallest = left;
        if (right < heap.length && heap[right].seq < heap[smallest].seq) smallest = right;
        if (smallest === i) break;
        const tmp = heap[smallest];
        heap[smallest] = heap[i];
        heap[i] = tmp;
        i = smallest;
      }
    }
    return top;
  }

  function detach(node) {
    if (node.prev) node.prev.next = node.next;
    else head = node.next;
    if (node.next) node.next.prev = node.prev;
    else tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  function touch(page, node) {
    // 放到 LRU 队尾，并登记一个新的淘汰候选
    node.seq = ++clock;
    heapPush({ seq: node.seq, page: page, gen: node.gen });
  }

  function evictVictim() {
    while (heap.length > 0) {
      const candidate = heapPop();
      const node = pages.get(candidate.page);
      // 过期候选：页已不在驻留、属于上一代帧、期间又被访问过、或正被引用
      if (!node || node.gen !== candidate.gen || node.seq !== candidate.seq || node.ref > 0) {
        continue;
      }
      detach(node);
      pages.delete(candidate.page);
      if (node.dirty) dirtySet.delete(candidate.page);
      evicted.push(candidate.page);
      return true;
    }
    return false;
  }

  function fault(page, makeDirty) {
    let node = pages.get(page);
    if (node) {
      detach(node);
    } else {
      if (pages.size >= capacity && !evictVictim()) {
        const error = new Error("no evictable resident page");
        error.code = "E_NO_VICTIM";
        throw error;
      }
      node = {
        name: page, prev: null, next: null,
        seq: 0, gen: ++genClock, ref: 0, dirty: false
      };
      pages.set(page, node);
    }
    node.prev = tail;
    node.next = null;
    if (tail) tail.next = node;
    else head = node;
    tail = node;
    touch(page, node);
    if (makeDirty && !node.dirty) {
      node.dirty = true;
      dirtySet.add(page);
    }
  }

  for (const op of ops) {
    const kind = op.op;
    const page = op.page;
    if (kind === "read") {
      fault(page, false);
    } else if (kind === "write") {
      fault(page, true);
    } else if (kind === "pin") {
      const node = pages.get(page);
      if (node) node.ref += 1;
    } else if (kind === "unpin") {
      const node = pages.get(page);
      if (node && node.ref > 0) {
        node.ref -= 1;
      } else {
        underflow += 1;
      }
    }
  }

  const resident = [];
  for (let node = head; node !== null; node = node.next) {
    resident.push(node.name);
  }
  return {
    resident: resident,
    dirty: Array.from(dirtySet),
    evicted: evicted,
    underflow: underflow
  };
}
