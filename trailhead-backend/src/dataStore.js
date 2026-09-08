import fs from 'fs';
import { businessDataPath } from './businessRegistry.js';

// Phase 3: one cache entry per business, loaded lazily on first access.
// Phase 4: replace the bodies of these functions with real DB queries or
// platform API calls per business — the function signatures (all taking
// businessId first) are the contract that stays stable when that happens.

const cache = new Map(); // businessId -> { products, orders, policies, appointments }

function loadJSON(businessId, filename) {
  const raw = fs.readFileSync(businessDataPath(businessId, filename), 'utf-8');
  return JSON.parse(raw);
}

function saveJSON(businessId, filename, data) {
  fs.writeFileSync(businessDataPath(businessId, filename), JSON.stringify(data, null, 2));
}

function getBusinessData(businessId) {
  if (!cache.has(businessId)) {
    cache.set(businessId, {
      products: loadJSON(businessId, 'products.json'),
      orders: loadJSON(businessId, 'orders.json'),
      policies: loadJSON(businessId, 'policies.json'),
      appointments: loadJSON(businessId, 'appointments.json'),
    });
  }
  return cache.get(businessId);
}

// --- Reads ---

export function getAllProducts(businessId) {
  return getBusinessData(businessId).products;
}

export function searchProducts(businessId, { maxPrice, category, keyword, keywords } = {}) {
  const keywordList = keywords || (keyword ? [keyword] : []);
  return getBusinessData(businessId).products.filter((p) => {
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
  return getBusinessData(businessId).orders.find((o) => o.id.toLowerCase() === orderId.toLowerCase()) || null;
}

export function getProductById(businessId, productId) {
  return getBusinessData(businessId).products.find((p) => p.id === productId) || null;
}

export function findPolicy(businessId, text) {
  const lower = text.toLowerCase();
  return getBusinessData(businessId).policies.find((p) => p.keywords.some((k) => lower.includes(k))) || null;
}

export function getAvailableSlots(businessId, { date } = {}) {
  return getBusinessData(businessId).appointments.filter((s) => !s.booked && (!date || s.date === date));
}

export function getSlotById(businessId, slotId) {
  return getBusinessData(businessId).appointments.find((s) => s.id === slotId) || null;
}

// --- Writes (persisted to disk, scoped to the business's own files) ---

export function bookSlot(businessId, slotId) {
  const data = getBusinessData(businessId);
  const slot = data.appointments.find((s) => s.id === slotId);
  if (!slot) return { ok: false, error: 'Slot not found.' };
  if (slot.booked) return { ok: false, error: 'That slot was just taken — pick another.' };

  slot.booked = true;
  saveJSON(businessId, 'appointments.json', data.appointments);
  return { ok: true, slot };
}

export function requestExchange(businessId, orderId, reason) {
  const data = getBusinessData(businessId);
  const order = data.orders.find((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (!order) return { ok: false, error: 'Order not found.' };

  order.exchangeStatus = 'requested';
  order.exchangeReason = reason || null;
  order.exchangeRequestedAt = new Date().toISOString();
  saveJSON(businessId, 'orders.json', data.orders);
  return { ok: true, order };
}

// Lets a future admin dashboard hot-reload a single business's data
// without restarting the whole server.
export function reloadBusinessData(businessId) {
  cache.delete(businessId);
}
