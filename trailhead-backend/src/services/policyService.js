import { db, generateId } from '../db/connection.js';

// If a tenant hasn't configured a policy for an action type, fall back to
// this — matches the previously-hardcoded $100 behavior exactly, so
// introducing configurability doesn't silently change anyone's existing
// behavior until they actually set their own policy.
const DEFAULT_POLICY = { autoApproveBelow: 100, restrictedAtOrAbove: 100 };

export function getPolicy(tenantId, actionType) {
  const row = db
    .prepare('SELECT * FROM approval_policies WHERE tenant_id = ? AND action_type = ?')
    .get(tenantId, actionType);
  if (!row) return { ...DEFAULT_POLICY, isDefault: true };
  return {
    autoApproveBelow: row.auto_approve_below,
    restrictedAtOrAbove: row.restricted_at_or_above,
    isDefault: false,
  };
}

export function setPolicy(tenantId, actionType, { autoApproveBelow, restrictedAtOrAbove }) {
  if (restrictedAtOrAbove < autoApproveBelow) {
    return { ok: false, error: 'restrictedAtOrAbove must be >= autoApproveBelow.' };
  }
  const existing = db
    .prepare('SELECT id FROM approval_policies WHERE tenant_id = ? AND action_type = ?')
    .get(tenantId, actionType);

  if (existing) {
    db.prepare('UPDATE approval_policies SET auto_approve_below = ?, restricted_at_or_above = ? WHERE id = ?')
      .run(autoApproveBelow, restrictedAtOrAbove, existing.id);
  } else {
    db.prepare(
      'INSERT INTO approval_policies (id, tenant_id, action_type, auto_approve_below, restricted_at_or_above) VALUES (?, ?, ?, ?, ?)'
    ).run(generateId('pol'), tenantId, actionType, autoApproveBelow, restrictedAtOrAbove);
  }
  return { ok: true };
}

export function listPolicies(tenantId) {
  return db.prepare('SELECT * FROM approval_policies WHERE tenant_id = ?').all(tenantId);
}

/**
 * The actual decision function tools.js calls. Three outcomes:
 *   'auto'       — below the auto-approve line, execute directly (rare —
 *                  most of our write actions still confirm regardless,
 *                  this exists for future low-risk action types)
 *   'approval'   — needs the customer/user to confirm before executing
 *   'restricted' — never auto-executable via customer confirmation,
 *                  always goes to a human
 */
export function evaluateAction(tenantId, actionType, amount) {
  const policy = getPolicy(tenantId, actionType);
  if (amount < policy.autoApproveBelow) return { decision: 'auto', policy };
  if (amount >= policy.restrictedAtOrAbove) return { decision: 'restricted', policy };
  return { decision: 'approval', policy };
}
