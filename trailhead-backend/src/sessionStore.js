import fs from 'fs';
import { businessDataPath } from './businessRegistry.js';

// One write-through cache PER BUSINESS, each backed by its own sessions.json
// file. This is what actually enforces isolation: a session object from
// Trailhead's cache is never reachable through the cafe's cache, even if a
// customer happens to reuse the exact same clientId across both (browser
// localStorage is shared across tabs, but businessId scoping keeps their
// carts/history/verified-orders from ever touching each other).

const caches = new Map(); // businessId -> { [clientId]: sessionObject }

function loadFromDisk(businessId) {
  try {
    return JSON.parse(fs.readFileSync(businessDataPath(businessId, 'sessions.json'), 'utf-8'));
  } catch {
    return {};
  }
}

function persist(businessId) {
  fs.writeFileSync(businessDataPath(businessId, 'sessions.json'), JSON.stringify(caches.get(businessId), null, 2));
}

function getCache(businessId) {
  if (!caches.has(businessId)) {
    caches.set(businessId, loadFromDisk(businessId));
  }
  return caches.get(businessId);
}

function freshSession() {
  return {
    history: [],
    facts: { lastOrderId: null, lastCategory: null, lastBudget: null },
    cart: [],
    verifiedOrders: [],
  };
}

export function getSession(businessId, clientId) {
  const cache = getCache(businessId);
  if (!cache[clientId]) {
    cache[clientId] = freshSession();
    persist(businessId);
  }
  return cache[clientId];
}

export function saveSession(businessId, clientId) {
  const cache = getCache(businessId);
  if (cache[clientId]) persist(businessId);
}

export function deleteSession(businessId, clientId) {
  const cache = getCache(businessId);
  delete cache[clientId];
  persist(businessId);
}
