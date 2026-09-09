import { db, generateId } from '../db/connection.js';

/**
 * Records who/what did a business-changing action. This replaces the
 * ad-hoc console.warn-only logging that used to live scattered across
 * escalationStore.js/tools.js — every write action should call this.
 */
export function recordAudit({
  tenantId,
  actorType, // 'ai' | 'user' | 'system'
  actorId = null,
  action,
  targetType = null,
  targetId = null,
  details = {},
}) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (id, tenant_id, actor_type, actor_id, action, target_type, target_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(generateId('audit'), tenantId, actorType, actorId, action, targetType, targetId, JSON.stringify(details));
  } catch (err) {
    console.error('[auditLogService] failed to record audit entry:', action, err.message);
  }
}

export function getAuditLog(tenantId, { limit = 100 } = {}) {
  return db
    .prepare('SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(tenantId, limit);
}
