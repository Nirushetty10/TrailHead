import { db } from './db/connection.js';

function rowToProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    originalPrice: row.original_price,
    currency: row.currency,
    stock: row.stock,
    stockCount: row.stock_count,
    description: row.description,
    tags: JSON.parse(row.tags),
    variants: JSON.parse(row.variants),
  };
}

function rowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerEmail: row.customer_email,
    items: JSON.parse(row.items),
    status: row.status,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    estimatedDelivery: row.estimated_delivery,
    breakdown: JSON.parse(row.breakdown),
    exchangeStatus: row.exchange_status,
    exchangeReason: row.exchange_reason,
    exchangeRequestedAt: row.exchange_requested_at,
  };
}

function rowToSlot(row) {
  if (!row) return null;
  return { id: row.id, date: row.date, time: row.time, service: row.service, booked: !!row.booked };
}

// --- Reads ---

export function getAllProducts(businessId) {
  return db.prepare('SELECT * FROM products WHERE tenant_id = ?').all(businessId).map(rowToProduct);
}

export function searchProducts(businessId, { maxPrice, category, keyword, keywords } = {}) {
  const keywordList = keywords || (keyword ? [keyword] : []);
  const all = getAllProducts(businessId);
  return all.filter((p) => {
    if (maxPrice && p.price > maxPrice) return false;
    if (category && p.category !== category) return false;
    if (keywordList.length) {
      const hay = `${p.name} ${p.category} ${p.description} ${p.tags.join(' ')}`.toLowerCase();
      const matchesAny = keywordList.some((k) => hay.includes(k.toLowerCase()));
      if (!matchesAny) return false;
    }
    return true;
  });
}

export function getOrderById(businessId, orderId) {
  if (!orderId) return null;
  // SQLite's default collation is case-sensitive; orders were previously
  // matched case-insensitively (order ids get typed in all sorts of
  // casing), so preserve that behavior explicitly.
  const row = db
    .prepare('SELECT * FROM orders WHERE tenant_id = ? AND UPPER(id) = UPPER(?)')
    .get(businessId, orderId);
  return rowToOrder(row);
}

export function getProductById(businessId, productId) {
  const row = db.prepare('SELECT * FROM products WHERE tenant_id = ? AND id = ?').get(businessId, productId);
  return rowToProduct(row);
}

export function getProductsByIds(businessId, productIds) {
  return productIds.map((id) => getProductById(businessId, id)).filter(Boolean);
}

export function findPolicy(businessId, text) {
  const lower = text.toLowerCase();
  const docs = db
    .prepare('SELECT * FROM knowledge_documents WHERE tenant_id = ? AND status = ?')
    .all(businessId, 'active');
  return (
    docs
      .map((d) => ({ topic: d.title, content: d.content, keywords: JSON.parse(d.keywords) }))
      .find((p) => p.keywords.some((k) => lower.includes(k))) || null
  );
}

export function getAvailableSlots(businessId, { date } = {}) {
  const rows = date
    ? db.prepare('SELECT * FROM appointments WHERE tenant_id = ? AND booked = 0 AND date = ?').all(businessId, date)
    : db.prepare('SELECT * FROM appointments WHERE tenant_id = ? AND booked = 0').all(businessId);
  return rows.map(rowToSlot);
}

export function getSlotById(businessId, slotId) {
  const row = db.prepare('SELECT * FROM appointments WHERE tenant_id = ? AND id = ?').get(businessId, slotId);
  return rowToSlot(row);
}

// --- Writes ---

export function bookSlot(businessId, slotId) {
  const slot = getSlotById(businessId, slotId);
  if (!slot) return { ok: false, error: 'Slot not found.' };
  if (slot.booked) return { ok: false, error: 'That slot was just taken — pick another.' };

  db.prepare('UPDATE appointments SET booked = 1 WHERE tenant_id = ? AND id = ?').run(businessId, slotId);
  return { ok: true, slot: { ...slot, booked: true } };
}

export function requestExchange(businessId, orderId, reason) {
  const order = getOrderById(businessId, orderId);
  if (!order) return { ok: false, error: 'Order not found.' };

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE orders SET exchange_status = 'requested', exchange_reason = ?, exchange_requested_at = ?
     WHERE tenant_id = ? AND UPPER(id) = UPPER(?)`
  ).run(reason || null, now, businessId, orderId);

  return { ok: true, order: { ...order, exchangeStatus: 'requested', exchangeReason: reason || null, exchangeRequestedAt: now } };
}
