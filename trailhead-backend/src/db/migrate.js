import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, generateId } from './connection.js';
import { seedRBAC, getRoleIdByName } from './seedRBAC.js';
import { hashPassword } from '../services/authService.js';
import { seedDefaultEmployees } from '../services/employeeService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const businessesDir = path.join(dataDir, 'businesses');
const credentialsFile = path.join(dataDir, 'initial-credentials.txt');

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function tenantExists(tenantId) {
  return !!db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
}

function migrateTenant(registryEntry) {
  const tenantId = registryEntry.id;
  if (tenantExists(tenantId)) {
    console.log(`[migrate] tenant "${tenantId}" already exists — skipping data import (safe to re-run)`);
    return;
  }

  console.log(`[migrate] importing tenant "${tenantId}"...`);

  db.prepare(
    `INSERT INTO tenants (id, name, description, plan, default_theme, enabled_card_ids)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    tenantId,
    registryEntry.name,
    registryEntry.description || '',
    registryEntry.plan || 'free',
    registryEntry.defaultTheme || 'dark',
    JSON.stringify(registryEntry.enabledCardIds || [])
  );

  const businessPath = path.join(businessesDir, tenantId);

  // Products
  const products = readJSON(path.join(businessPath, 'products.json'), []);
  const insertProduct = db.prepare(
    `INSERT INTO products (id, tenant_id, name, category, price, original_price, currency, stock, stock_count, description, tags, variants)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const p of products) {
    insertProduct.run(
      p.id, tenantId, p.name, p.category || null, p.price, p.originalPrice ?? p.price,
      p.currency || 'USD', p.stock || 'in_stock', p.stockCount ?? 0, p.description || '',
      JSON.stringify(p.tags || []), JSON.stringify(p.variants || [])
    );
  }

  // Orders
  const orders = readJSON(path.join(businessPath, 'orders.json'), []);
  const insertOrder = db.prepare(
    `INSERT INTO orders (id, tenant_id, customer_email, items, status, shipped_at, delivered_at, estimated_delivery, breakdown, exchange_status, exchange_reason, exchange_requested_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const o of orders) {
    insertOrder.run(
      o.id, tenantId, o.customerEmail, JSON.stringify(o.items || []), o.status || null,
      o.shippedAt || null, o.deliveredAt || null, o.estimatedDelivery || null,
      JSON.stringify(o.breakdown || {}), o.exchangeStatus || null, o.exchangeReason || null,
      o.exchangeRequestedAt || null
    );
  }

  // Appointments
  const appointments = readJSON(path.join(businessPath, 'appointments.json'), []);
  const insertAppt = db.prepare(
    `INSERT INTO appointments (id, tenant_id, date, time, service, booked) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const a of appointments) {
    insertAppt.run(a.id, tenantId, a.date, a.time, a.service, a.booked ? 1 : 0);
  }

  // Policies -> Knowledge system (Source -> Document, keyword-based retrieval for now)
  const policies = readJSON(path.join(businessPath, 'policies.json'), []);
  if (policies.length) {
    const sourceId = generateId('src');
    db.prepare(`INSERT INTO knowledge_sources (id, tenant_id, name, type) VALUES (?, ?, ?, ?)`)
      .run(sourceId, tenantId, 'Legacy policies.json import', 'manual');

    const insertDoc = db.prepare(
      `INSERT INTO knowledge_documents (id, source_id, tenant_id, title, content, keywords) VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const policy of policies) {
      insertDoc.run(generateId('doc'), sourceId, tenantId, policy.topic, policy.content, JSON.stringify(policy.keywords || []));
    }
  }

  // Seed an owner account so login works immediately. Random password,
  // written once to a local (gitignored) credentials file — never a
  // hardcoded default, which would be a real security smell.
  const email = `owner@${tenantId}.local`;
  const password = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const { hash, salt } = hashPassword(password);
  const userId = generateId('user');

  db.prepare(
    `INSERT INTO users (id, tenant_id, email, password_hash, password_salt, name) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, tenantId, email, hash, salt, `${registryEntry.name} Owner`);

  const ownerRoleId = getRoleIdByName('owner');
  db.prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(userId, ownerRoleId);

  fs.appendFileSync(
    credentialsFile,
    `tenant=${tenantId}  email=${email}  password=${password}\n`
  );

  console.log(`[migrate] tenant "${tenantId}": ${products.length} products, ${orders.length} orders, ${appointments.length} appointments, ${policies.length} policies, 1 owner account created`);
}

export function runMigration() {
  seedRBAC();

  const registry = readJSON(path.join(dataDir, 'businesses.json'), []);
  if (!registry.length) {
    console.log('[migrate] no businesses.json registry found — nothing to migrate');
    return;
  }

  const isFirstRun = !fs.existsSync(credentialsFile);

  for (const entry of registry) {
    migrateTenant(entry);
    // Called unconditionally (not just for newly-migrated tenants) —
    // seedDefaultEmployees is itself idempotent, so this safely backfills
    // employees for tenants that already existed before this phase.
    seedDefaultEmployees(entry.id);
  }

  if (isFirstRun && fs.existsSync(credentialsFile)) {
    console.log(`\n[migrate] Initial owner credentials written to: ${credentialsFile}`);
    console.log('[migrate] Read that file to get login credentials for each business.\n');
  }
}
