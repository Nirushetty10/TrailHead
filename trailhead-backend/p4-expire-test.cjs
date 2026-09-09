const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("./data/trailhead.db");

db.prepare(`
  UPDATE actions
  SET created_at = datetime('now', '-31 minutes')
  WHERE id = ? AND tenant_id = ?
`).run("act_6db10iz4mtu01q43", "trailhead");

console.log("Action aged by 31 minutes");
