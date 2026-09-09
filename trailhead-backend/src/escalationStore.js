import { db, generateId } from './db/connection.js';
import { recordAudit } from './services/auditLogService.js';
import { recordEvent } from './services/eventService.js';

function rowToEscalation(row) {
  return {
    id: row.id,
    type: row.type,
    orderId: row.order_id,
    reason: row.reason,
    note: row.note,
    context: row.context ? JSON.parse(row.context) : {},
    resolved: !!row.resolved,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

/**
 * `context` carries what a human agent actually needs to act without
 * re-asking the customer everything: who they are, what was discussed,
 * what's already been tried. This is the fix for the doc's Phase 2
 * requirement that escalations aren't just a bare order id + reason.
 */
export function raiseEscalation(businessId, { type, orderId, note, reason, context = {} }) {
  const id = generateId('esc');
  db.prepare(
    `INSERT INTO escalations (id, tenant_id, type, order_id, reason, note, context) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, businessId, type, orderId || null, reason || null, note, JSON.stringify(context));

  console.warn(`\n🚩 ESCALATION [${businessId}] [${id}] ${type}: ${note}\n`);

  recordAudit({
    tenantId: businessId,
    actorType: 'ai',
    action: 'escalation_raised',
    targetType: 'order',
    targetId: orderId || null,
    details: { type, reason, note },
  });

  recordEvent({
    tenantId: businessId,
    eventType: 'SupportEscalated',
    orderId: orderId || null,
    source: 'ai',
    metadata: { type, reason },
  });

  return { id, type, orderId, reason, note, context, resolved: false };
}

export function listEscalations(businessId, { includeResolved = false } = {}) {
  const rows = includeResolved
    ? db.prepare('SELECT * FROM escalations WHERE tenant_id = ? ORDER BY created_at DESC').all(businessId)
    : db.prepare('SELECT * FROM escalations WHERE tenant_id = ? AND resolved = 0 ORDER BY created_at DESC').all(businessId);
  return rows.map(rowToEscalation);
}

export function resolveEscalation(businessId, id, resolvedByUserId = null) {
  const row = db.prepare('SELECT * FROM escalations WHERE tenant_id = ? AND id = ?').get(businessId, id);
  if (!row) return null;

  db.prepare(`UPDATE escalations SET resolved = 1, resolved_at = datetime('now') WHERE tenant_id = ? AND id = ?`).run(businessId, id);

  recordAudit({
    tenantId: businessId,
    actorType: resolvedByUserId ? 'user' : 'system',
    actorId: resolvedByUserId,
    action: 'escalation_resolved',
    targetType: 'escalation',
    targetId: id,
  });

  return rowToEscalation({ ...row, resolved: 1 });
}
