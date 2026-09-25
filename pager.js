// pager.js：页面状态与淘汰（基线：不记引用、随便淘汰）
export function run(ops, capacity) {
  const resident = [];
  const evicted = [];
  for (const op of ops) {
    if (op.op === "read" || op.op === "write") {
      if (!resident.includes(op.page)) resident.push(op.page);
    }
    if (resident.length > capacity) evicted.push(resident.shift());
  }
  return { resident: resident, dirty: [], evicted: evicted, underflow: 0 };
}
