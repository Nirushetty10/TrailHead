import { db, generateId } from './db/connection.js';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function checkAndRecordConversation(businessId, clientId, plan) {
  const month = currentMonthKey();

  const already = db
    .prepare('SELECT 1 FROM usage_counters WHERE tenant_id = ? AND month = ? AND client_id = ?')
    .get(businessId, month, clientId);

  if (already) {
    const count = db
      .prepare('SELECT COUNT(*) as c FROM usage_counters WHERE tenant_id = ? AND month = ?')
      .get(businessId, month).c;
    return { count, capped: false };
  }

  const currentCount = db
    .prepare('SELECT COUNT(*) as c FROM usage_counters WHERE tenant_id = ? AND month = ?')
    .get(businessId, month).c;

  if (currentCount >= plan.conversationsPerMonth) {
    return { count: currentCount, capped: true };
  }

  db.prepare('INSERT INTO usage_counters (tenant_id, month, client_id) VALUES (?, ?, ?)').run(businessId, month, clientId);
  return { count: currentCount + 1, capped: false };
}

export function getMonthlyUsage(businessId) {
  const month = currentMonthKey();
  const count = db
    .prepare('SELECT COUNT(*) as c FROM usage_counters WHERE tenant_id = ? AND month = ?')
    .get(businessId, month).c;
  return { month, count };
}
