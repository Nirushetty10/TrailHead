const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("./data/trailhead.db");

console.dir(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all(),
  { depth: null }
);
