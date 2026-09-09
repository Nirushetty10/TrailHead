import { db } from './db/connection.js';

// Note: conversation HISTORY (the message log used for LLM context) is
// still kept in-memory per session object for now — persisting every
// message to the messages table happens separately via eventService/
// conversation tracking. This store just persists the structured facts/
// cart/verifiedOrders that need to survive a reconnect or restart.

function freshSession() {
  return {
    history: [],
    facts: { lastOrderId: null, lastCategory: null, lastBudget: null },
    cart: [],
    verifiedOrders: [],
  };
}

// In-memory cache of live session objects (mutated directly by callers,
// same pattern as before) — saveSession() is what persists it to SQLite.
const liveSessions = new Map(); // `${tenantId}:${clientId}` -> sessionObject

function key(tenantId, clientId) {
  return `${tenantId}:${clientId}`;
}

export function getSession(tenantId, clientId) {
  const k = key(tenantId, clientId);
  if (liveSessions.has(k)) return liveSessions.get(k);

  const row = db.prepare('SELECT * FROM session_state WHERE tenant_id = ? AND client_id = ?').get(tenantId, clientId);

  let session;
  if (row) {
    session = {
      history: [], // history intentionally not persisted — see note above
      facts: JSON.parse(row.facts),
      cart: JSON.parse(row.cart),
      verifiedOrders: JSON.parse(row.verified_orders),
    };
  } else {
    session = freshSession();
    db.prepare(
      `INSERT INTO session_state (tenant_id, client_id, facts, cart, verified_orders) VALUES (?, ?, ?, ?, ?)`
    ).run(tenantId, clientId, JSON.stringify(session.facts), JSON.stringify(session.cart), JSON.stringify(session.verifiedOrders));
  }

  liveSessions.set(k, session);
  return session;
}

export function saveSession(tenantId, clientId) {
  const session = liveSessions.get(key(tenantId, clientId));
  if (!session) return;

  db.prepare(
    `UPDATE session_state SET facts = ?, cart = ?, verified_orders = ?, updated_at = datetime('now')
     WHERE tenant_id = ? AND client_id = ?`
  ).run(JSON.stringify(session.facts), JSON.stringify(session.cart), JSON.stringify(session.verifiedOrders), tenantId, clientId);
}

export function deleteSession(tenantId, clientId) {
  liveSessions.delete(key(tenantId, clientId));
  db.prepare('DELETE FROM session_state WHERE tenant_id = ? AND client_id = ?').run(tenantId, clientId);
}
