import { db, generateId } from '../db/connection.js';

/**
 * Records a business event. This is the foundation Phase 3+ (opportunity
 * detection, revenue attribution, BI dashboards) will eventually read
 * from — the goal here is just making sure every meaningful thing that
 * happens gets captured now, even before anything analyzes it.
 *
 * Never let event recording break the actual request — always fire-and-
 * forget from the caller's perspective (errors are logged, not thrown).
 */
export function recordEvent({
  tenantId,
  eventType,
  customerId = null,
  productId = null,
  orderId = null,
  conversationId = null,
  source = 'system',
  metadata = {},
}) {
  try {
    db.prepare(
      `INSERT INTO events (id, tenant_id, event_type, customer_id, product_id, order_id, conversation_id, source, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(generateId('evt'), tenantId, eventType, customerId, productId, orderId, conversationId, source, JSON.stringify(metadata));
  } catch (err) {
    console.error('[eventService] failed to record event:', eventType, err.message);
  }
}

export function getRecentEvents(tenantId, { limit = 100, eventType } = {}) {
  if (eventType) {
    return db
      .prepare('SELECT * FROM events WHERE tenant_id = ? AND event_type = ? ORDER BY created_at DESC LIMIT ?')
      .all(tenantId, eventType, limit);
  }
  return db
    .prepare('SELECT * FROM events WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(tenantId, limit);
}

export function countEventsByType(tenantId, sinceDays = 30) {
  return db
    .prepare(
      `SELECT event_type, COUNT(*) as count FROM events
       WHERE tenant_id = ? AND created_at >= datetime('now', ?)
       GROUP BY event_type ORDER BY count DESC`
    )
    .all(tenantId, `-${sinceDays} days`);
}
