import { db, generateId } from '../db/connection.js';
import { recordEvent } from './eventService.js';

export function recordFeedback(tenantId, { messageId, clientId, rating, correction }) {
  const id = generateId('fb');
  db.prepare(
    `INSERT INTO message_feedback (id, tenant_id, message_id, client_id, rating, correction) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, tenantId, messageId, clientId, rating, correction || null);

  recordEvent({
    tenantId,
    eventType: 'CustomerFeedback',
    customerId: clientId,
    source: 'customer',
    metadata: { messageId, rating, hasCorrection: !!correction },
  });

  return { id, messageId, rating };
}

export function getFeedbackSummary(tenantId) {
  return db
    .prepare(
      `SELECT rating, COUNT(*) as count FROM message_feedback WHERE tenant_id = ? GROUP BY rating`
    )
    .all(tenantId);
}
