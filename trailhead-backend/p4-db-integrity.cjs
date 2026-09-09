const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("./data/trailhead.db");

console.log("Actions by status:");
console.dir(
  db.prepare("SELECT tenant_id,status,COUNT(*) AS count FROM actions GROUP BY tenant_id,status ORDER BY tenant_id,status").all(),
  { depth: null }
);

console.log("AI Employees by tenant:");
console.dir(
  db.prepare("SELECT tenant_id,type,enabled,COUNT(*) AS count FROM ai_employees GROUP BY tenant_id,type,enabled ORDER BY tenant_id,type").all(),
  { depth: null }
);

console.log("Policies by tenant:");
console.dir(
  db.prepare("SELECT tenant_id,action_type,auto_approve_below,restricted_at_or_above FROM approval_policies ORDER BY tenant_id,action_type").all(),
  { depth: null }
);

console.log("Orphaned actions:");
console.dir(
  db.prepare(`
    SELECT a.id, a.tenant_id
    FROM actions a
    LEFT JOIN tenants t ON t.id = a.tenant_id
    WHERE t.id IS NULL
  `).all(),
  { depth: null }
);

console.log("Orphaned employees:");
console.dir(
  db.prepare(`
    SELECT e.id, e.tenant_id
    FROM ai_employees e
    LEFT JOIN tenants t ON t.id = e.tenant_id
    WHERE t.id IS NULL
  `).all(),
  { depth: null }
);

console.log("Orphaned policies:");
console.dir(
  db.prepare(`
    SELECT p.id, p.tenant_id
    FROM approval_policies p
    LEFT JOIN tenants t ON t.id = p.tenant_id
    WHERE t.id IS NULL
  `).all(),
  { depth: null }
);
