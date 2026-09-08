import fs from 'fs';
import { businessDataPath } from './businessRegistry.js';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function load(businessId) {
  const raw = JSON.parse(fs.readFileSync(businessDataPath(businessId, 'usage.json'), 'utf-8'));
  if (raw.month !== currentMonthKey()) {
    return { month: currentMonthKey(), conversationIds: [] };
  }
  return raw;
}

function save(businessId, data) {
  fs.writeFileSync(businessDataPath(businessId, 'usage.json'), JSON.stringify(data, null, 2));
}

/**
 * A "conversation" = one distinct clientId that has sent at least one
 * message THIS BUSINESS this month. Scoped per business — Trailhead's
 * conversation count and the cafe's are tracked completely separately,
 * even if (hypothetically) the same customer talked to both.
 */
export function checkAndRecordConversation(businessId, clientId, plan) {
  const usage = load(businessId);
  const alreadyCounted = usage.conversationIds.includes(clientId);

  if (alreadyCounted) {
    return { count: usage.conversationIds.length, capped: false };
  }

  if (usage.conversationIds.length >= plan.conversationsPerMonth) {
    return { count: usage.conversationIds.length, capped: true };
  }

  usage.conversationIds.push(clientId);
  save(businessId, usage);
  return { count: usage.conversationIds.length, capped: false };
}

export function getMonthlyUsage(businessId) {
  const usage = load(businessId);
  return { month: usage.month, count: usage.conversationIds.length };
}
