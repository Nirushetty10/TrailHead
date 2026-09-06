import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

function loadJSON(filename) {
  const raw = fs.readFileSync(path.join(dataDir, filename), 'utf-8');
  return JSON.parse(raw);
}

// Phase 1: static files. Phase 2/production: replace the bodies of these
// functions with real DB queries or platform API calls (Shopify, etc).
// The function signatures are the contract — orchestrator.js never needs
// to change when the source changes.

let products = loadJSON('products.json');
let orders = loadJSON('orders.json');
let policies = loadJSON('policies.json');

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
  return (
    policies.find((p) => p.keywords.some((k) => lower.includes(k))) || null
  );
}

// Lets the dashboard (Phase 2) hot-reload data without restarting the server.
export function reloadData() {
  products = loadJSON('products.json');
  orders = loadJSON('orders.json');
  policies = loadJSON('policies.json');
}
