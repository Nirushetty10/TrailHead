import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

function loadJSON(filename) {
  const raw = fs.readFileSync(path.join(dataDir, filename), 'utf-8');
  return JSON.parse(raw);
}

function saveJSON(filename, data) {
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
}

// Phase 1/2: static files acting as a real read/write store. Phase 3:
// replace the bodies of these functions with real DB queries or platform
// API calls (Shopify, booking systems, etc). Signatures are the contract —
// the orchestrator and tools never need to change when the source changes.

let products = loadJSON('products.json');
let orders = loadJSON('orders.json');
let policies = loadJSON('policies.json');
let appointments = loadJSON('appointments.json');

// --- Reads ---

export function getAllProducts() {
  return products;
}

export function searchProducts({ maxPrice, category, keyword } = {}) {
  return products.filter((p) => {
    if (maxPrice && p.price > maxPrice) return false;
    if (category && p.category !== category) return false;
    if (keyword) {
      const hay = `${p.name} ${p.category} ${p.description} ${p.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(keyword.toLowerCase())) return false;
    }
    return true;
  });
}

export function getOrderById(orderId) {
  if (!orderId) return null;
  return orders.find((o) => o.id.toLowerCase() === orderId.toLowerCase()) || null;
}

export function getOrdersByEmail(email) {
  if (!email) return [];
  return orders.filter((o) => o.customerEmail.toLowerCase() === email.toLowerCase());
}

export function getProductById(productId) {
  return products.find((p) => p.id === productId) || null;
}

export function findPolicy(text) {
  const lower = text.toLowerCase();
  return policies.find((p) => p.keywords.some((k) => lower.includes(k))) || null;
}

export function getAvailableSlots({ date } = {}) {
  return appointments.filter((s) => !s.booked && (!date || s.date === date));
}

export function getSlotById(slotId) {
  return appointments.find((s) => s.id === slotId) || null;
}

// --- Writes (Phase 2: real mutations, persisted to disk) ---

export function bookSlot(slotId) {
  const slot = appointments.find((s) => s.id === slotId);
  if (!slot) return { ok: false, error: 'Slot not found.' };
  if (slot.booked) return { ok: false, error: 'That slot was just taken — pick another.' };

  slot.booked = true;
  saveJSON('appointments.json', appointments);
  return { ok: true, slot };
}

export function requestExchange(orderId, reason) {
  const order = orders.find((o) => o.id.toLowerCase() === orderId.toLowerCase());
  if (!order) return { ok: false, error: 'Order not found.' };

  order.exchangeStatus = 'requested';
  order.exchangeReason = reason || null;
  order.exchangeRequestedAt = new Date().toISOString();
  saveJSON('orders.json', orders);
  return { ok: true, order };
}

// Lets a future admin dashboard hot-reload data without restarting the server.
export function reloadData() {
  products = loadJSON('products.json');
  orders = loadJSON('orders.json');
  policies = loadJSON('policies.json');
  appointments = loadJSON('appointments.json');
}
