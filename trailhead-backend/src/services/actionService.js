import { db, generateId } from '../db/connection.js';

const VALID_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED', 'FAILED'];

/**
 * Replaces the in-memory `pendingActions` Map that used to live in
 * server.js. That was a real gap: a server restart mid-confirmation
 * silently lost the pending action with no trace it ever existed. Now
 * every action request is a durable row from the moment it's proposed.
 */
export function createAction(tenantId, type, payload, requestedBy) {
  const id = generateId('act');
  db.prepare(
    `INSERT INTO actions (id, tenant_id, type, status, payload, requested_by) VALUES (?, ?, ?, 'REQUESTED', ?, ?)`
  ).run(id, tenantId, type, JSON.stringify(payload), requestedBy);
  return id;
}

function rowToAction(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    payload: JSON.parse(row.payload),
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export function getAction(tenantId, actionId) {
  return rowToAction(db.prepare('SELECT * FROM actions WHERE tenant_id = ? AND id = ?').get(tenantId, actionId));
}

export function updateActionStatus(tenantId, actionId, status) {
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: 'Invalid status.' };
  const action = getAction(tenantId, actionId);
  if (!action) return { ok: false, error: 'Action not found.' };

  const isTerminal = ['APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED', 'FAILED'].includes(status);
  db.prepare(`UPDATE actions SET status = ? ${isTerminal ? ", resolved_at = datetime('now')" : ''} WHERE id = ?`).run(status, actionId);
  return { ok: true, action: { ...action, status } };
}

export function listActions(tenantId, { status } = {}) {
  const rows = status
    ? db.prepare('SELECT * FROM actions WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC').all(tenantId, status)
    : db.prepare('SELECT * FROM actions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100').all(tenantId);
  return rows.map(rowToAction);
}

// Actions left REQUESTED for too long (customer never confirmed/cancelled,
// e.g. they closed the tab) should age out rather than sit forever.
export function expireStaleActions(tenantId, olderThanMinutes = 30) {
  const stale = db
    .prepare(
      `SELECT id FROM actions WHERE tenant_id = ? AND status = 'REQUESTED' AND created_at < datetime('now', ?)`
    )
    .all(tenantId, `-${olderThanMinutes} minutes`);
  for (const { id } of stale) {
    updateActionStatus(tenantId, id, 'EXPIRED');
  }
  return stale.length;
}
