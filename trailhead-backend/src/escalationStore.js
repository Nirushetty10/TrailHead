import fs from 'fs';
import crypto from 'crypto';
import { businessDataPath } from './businessRegistry.js';

function load(businessId) {
  return JSON.parse(fs.readFileSync(businessDataPath(businessId, 'escalations.json'), 'utf-8'));
}

function save(businessId, data) {
  fs.writeFileSync(businessDataPath(businessId, 'escalations.json'), JSON.stringify(data, null, 2));
}

/**
 * Records an escalation for a specific business. Each business's
 * escalation queue is completely separate — Trailhead's team never sees
 * the cafe's flagged exchanges, and vice versa.
 */
export function raiseEscalation(businessId, { type, orderId, note, reason }) {
  const escalations = load(businessId);
  const entry = {
    id: crypto.randomUUID(),
    type,
    orderId: orderId || null,
    reason: reason || null,
    note,
    createdAt: new Date().toISOString(),
    resolved: false,
  };
  escalations.push(entry);
  save(businessId, escalations);

  console.warn(`\n🚩 ESCALATION [${businessId}] [${entry.id}] ${type}: ${note}\n`);

  return entry;
}

export function listEscalations(businessId, { includeResolved = false } = {}) {
  const escalations = load(businessId);
  return includeResolved ? escalations : escalations.filter((e) => !e.resolved);
}

export function resolveEscalation(businessId, id) {
  const escalations = load(businessId);
  const entry = escalations.find((e) => e.id === id);
  if (!entry) return null;
  entry.resolved = true;
  entry.resolvedAt = new Date().toISOString();
  save(businessId, escalations);
  return entry;
}
