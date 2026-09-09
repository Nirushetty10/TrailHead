import { db } from './db/connection.js';

const DEFAULT_TENANT_ID = 'trailhead';

function rowToBusiness(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    plan: row.plan,
    defaultTheme: row.default_theme,
    enabledCardIds: JSON.parse(row.enabled_card_ids),
  };
}

export function getBusiness(businessId) {
  const row = db.prepare('SELECT * FROM tenants WHERE id = ?').get(businessId);
  if (row) return rowToBusiness(row);
  const fallback = db.prepare('SELECT * FROM tenants WHERE id = ?').get(DEFAULT_TENANT_ID);
  return rowToBusiness(fallback);
}

export function listBusinesses() {
  return db.prepare('SELECT * FROM tenants').all().map(rowToBusiness);
}

export function resolveBusinessId(requestedId) {
  if (!requestedId) return DEFAULT_TENANT_ID;
  const exists = db.prepare('SELECT 1 FROM tenants WHERE id = ?').get(requestedId);
  return exists ? requestedId : DEFAULT_TENANT_ID;
}
