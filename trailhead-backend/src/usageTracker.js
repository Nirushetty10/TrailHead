import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usageFile = path.join(__dirname, '..', 'data', 'usage.json');

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function load() {
  const raw = JSON.parse(fs.readFileSync(usageFile, 'utf-8'));
  // Roll over automatically if the calendar month has changed since last write.
  if (raw.month !== currentMonthKey()) {
    return { month: currentMonthKey(), conversationIds: [] };
  }
  return raw;
}

function save(data) {
  fs.writeFileSync(usageFile, JSON.stringify(data, null, 2));
}

/**
 * A "conversation" = one distinct connection (socket.id) that has sent at
 * least one message this month. Matches how Verifast and most competitors
 * define their "conversations/month" billing metric.
 *
 * Returns { count, capped } where `capped` is true if this connection
 * would push the count over the plan's monthly limit — checked BEFORE
 * incrementing, so the blocked conversation is never counted.
 */
export function checkAndRecordConversation(userId, plan) {
  const usage = load();
  const alreadyCounted = usage.conversationIds.includes(userId);

  if (alreadyCounted) {
    // This connection already counts toward this month's total — let it
    // continue even if the plan cap was hit by other conversations since.
    return { count: usage.conversationIds.length, capped: false };
  }

  if (usage.conversationIds.length >= plan.conversationsPerMonth) {
    return { count: usage.conversationIds.length, capped: true };
  }

  usage.conversationIds.push(userId);
  save(usage);
  return { count: usage.conversationIds.length, capped: false };
}

export function getMonthlyUsage() {
  const usage = load();
  return { month: usage.month, count: usage.conversationIds.length };
}
