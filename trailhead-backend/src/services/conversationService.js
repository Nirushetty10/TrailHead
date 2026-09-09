import { db, generateId } from '../db/connection.js';

/**
 * One persistent conversation per (tenant, clientId) — matches the
 * existing session model, which already treats a client as having one
 * continuous relationship with a business rather than discrete sessions.
 * Real "conversation boundary" detection (when does a chat actually end?)
 * is a genuinely hard problem deferred to a later phase.
 */
export function getOrCreateConversation(tenantId, clientId) {
  const existing = db
    .prepare('SELECT id FROM conversations WHERE tenant_id = ? AND client_id = ?')
    .get(tenantId, clientId);
  if (existing) return existing.id;

  const id = generateId('conv');
  db.prepare('INSERT INTO conversations (id, tenant_id, client_id) VALUES (?, ?, ?)').run(id, tenantId, clientId);
  return id;
}

/**
 * Persists a single message and returns its id — the id is what lets the
 * frontend attach feedback (helpful/not helpful) to a specific AI reply.
 */
export function recordMessage(tenantId, conversationId, role, content) {
  const id = generateId('msg');
  db.prepare(
    `INSERT INTO messages (id, conversation_id, tenant_id, role, content) VALUES (?, ?, ?, ?, ?)`
  ).run(id, conversationId, tenantId, role, content);
  db.prepare(`UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?`).run(conversationId);
  return id;
}

export function getRecentMessages(tenantId, conversationId, limit = 10) {
  // created_at has only second-level precision (SQLite's datetime('now')),
  // so messages inserted within the same second can tie — rowid as a
  // tiebreaker guarantees true insertion order regardless of timestamp
  // collisions. Caught this via a direct test where 3 messages landed in
  // the same second and came back out of order without it.
  return db
    .prepare(
      `SELECT role, content, created_at FROM messages
       WHERE tenant_id = ? AND conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`
    )
    .all(tenantId, conversationId, limit)
    .reverse();
}

/** Human-readable transcript for escalation payloads / support handoff. */
export function formatTranscript(tenantId, conversationId, limit = 10) {
  const messages = getRecentMessages(tenantId, conversationId, limit);
  return messages.map((m) => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`).join('\n');
}
