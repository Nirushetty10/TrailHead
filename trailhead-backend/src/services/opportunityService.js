import { db, generateId } from '../db/connection.js';

const KNOWLEDGE_GAP_THRESHOLD = 2; // same topic asked >= N times
const ESCALATION_PRODUCT_THRESHOLD = 1; // a product tied to >= N escalations
const NOT_HELPFUL_THRESHOLD = 2;

// Same filler-word list the legacy classifier uses — reused here so the
// two heuristics stay consistent rather than drifting apart over time.
const FILLER_WORDS = new Set([
  'the', 'and', 'for', 'with', 'have', 'has', 'got', 'get', 'want', 'need',
  'does', 'do', 'you', 'your', 'any', 'are', 'is', 'there', 'offer', 'about',
  'can', 'could', 'would', 'please', 'like', 'that', 'this', 'program',
]);

function normalizeGapKey(metadata) {
  if (metadata.topic) return metadata.topic.toLowerCase().trim();
  if (metadata.message) {
    // Picking the FIRST word over 3 chars was a real bug: "do you HAVE a
    // loyalty program" clustered under "have" instead of "loyalty" —
    // completely unhelpful as a business-facing label. Filtering common
    // filler words and picking the LONGEST remaining word is a much
    // better proxy for "the actual topic," even with this simple a
    // heuristic (no real NLP here, by design — see doc's phase-gating).
    const words = metadata.message
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3 && !FILLER_WORDS.has(w));
    if (!words.length) return 'unknown';
    return words.reduce((longest, w) => (w.length > longest.length ? w : longest), words[0]);
  }
  return 'unknown';
}

/**
 * Upserts an opportunity: if an OPEN (non-terminal-status) opportunity
 * with the same tenant+category+title already exists, update its
 * frequency/evidence instead of creating a duplicate every time this
 * scan runs. This is what makes re-running detection safe and idempotent.
 */
function upsertOpportunity(tenantId, opp) {
  const existing = db
    .prepare(
      `SELECT id FROM opportunities WHERE tenant_id = ? AND category = ? AND title = ? AND status NOT IN ('REJECTED', 'IMPLEMENTED')`
    )
    .get(tenantId, opp.category, opp.title);

  if (existing) {
    db.prepare(
      `UPDATE opportunities SET frequency = ?, evidence = ?, source_events = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(opp.frequency, JSON.stringify(opp.evidence), JSON.stringify(opp.sourceEvents), existing.id);
    return { id: existing.id, updated: true };
  }

  const id = generateId('opp');
  db.prepare(
    `INSERT INTO opportunities (id, tenant_id, title, category, problem, evidence, frequency, business_impact, estimated_impact, confidence, recommended_solution, suggested_action, source_events)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, tenantId, opp.title, opp.category, opp.problem, JSON.stringify(opp.evidence), opp.frequency,
    opp.businessImpact || null, opp.estimatedImpact || null, opp.confidence || 'medium',
    opp.recommendedSolution || null, opp.suggestedAction || null, JSON.stringify(opp.sourceEvents)
  );
  return { id, updated: false };
}

function detectKnowledgeGaps(tenantId) {
  const events = db
    .prepare(`SELECT id, metadata, created_at FROM events WHERE tenant_id = ? AND event_type = 'KnowledgeGap'`)
    .all(tenantId);

  const groups = {};
  for (const evt of events) {
    const metadata = JSON.parse(evt.metadata);
    const key = normalizeGapKey(metadata);
    if (!groups[key]) groups[key] = [];
    groups[key].push({ id: evt.id, metadata, createdAt: evt.created_at });
  }

  const results = [];
  for (const [key, occurrences] of Object.entries(groups)) {
    if (occurrences.length < KNOWLEDGE_GAP_THRESHOLD) continue;

    const result = upsertOpportunity(tenantId, {
      title: `Repeated knowledge gap: "${key}"`,
      category: 'knowledge_gap',
      problem: `Customers have asked about "${key}" ${occurrences.length} times with no matching policy/knowledge content.`,
      evidence: occurrences.map((o) => ({ createdAt: o.createdAt, metadata: o.metadata })),
      frequency: occurrences.length,
      confidence: occurrences.length >= 5 ? 'high' : 'medium',
      recommendedSolution: `Add a knowledge document covering "${key}" so the AI can answer this directly instead of deflecting.`,
      suggestedAction: 'Review the evidence and add a policy/FAQ entry for this topic.',
      sourceEvents: occurrences.map((o) => o.id),
    });
    results.push({ key, ...result });
  }
  return results;
}

function detectHighEscalationProducts(tenantId) {
  const escalations = db
    .prepare(`SELECT id, order_id FROM escalations WHERE tenant_id = ? AND order_id IS NOT NULL`)
    .all(tenantId);

  const productCounts = {}; // productId -> [{escalationId}]
  for (const esc of escalations) {
    const order = db.prepare('SELECT items FROM orders WHERE tenant_id = ? AND id = ?').get(tenantId, esc.order_id);
    if (!order) continue;
    const items = JSON.parse(order.items);
    for (const item of items) {
      if (!productCounts[item.productId]) productCounts[item.productId] = [];
      productCounts[item.productId].push(esc.id);
    }
  }

  const results = [];
  for (const [productId, escalationIds] of Object.entries(productCounts)) {
    if (escalationIds.length < ESCALATION_PRODUCT_THRESHOLD) continue;

    const product = db.prepare('SELECT name FROM products WHERE tenant_id = ? AND id = ?').get(tenantId, productId);
    const productName = product ? product.name : productId;

    const result = upsertOpportunity(tenantId, {
      title: `${productName} generates repeated exchange escalations`,
      category: 'product_support_volume',
      problem: `${escalationIds.length} escalation(s) trace back to orders containing "${productName}".`,
      evidence: [{ productId, productName, escalationCount: escalationIds.length }],
      frequency: escalationIds.length,
      confidence: escalationIds.length >= 3 ? 'high' : 'low',
      recommendedSolution: `Review "${productName}" for a quality/sizing/description issue driving returns.`,
      suggestedAction: 'Check product description accuracy and recent escalation reasons for this item.',
      sourceEvents: escalationIds,
    });
    results.push({ productId, ...result });
  }
  return results;
}

function detectAiQualityConcerns(tenantId) {
  const notHelpful = db
    .prepare(`SELECT id, message_id, correction, created_at FROM message_feedback WHERE tenant_id = ? AND rating = 'not_helpful'`)
    .all(tenantId);

  if (notHelpful.length < NOT_HELPFUL_THRESHOLD) return [];

  const result = upsertOpportunity(tenantId, {
    title: 'Customers marking AI responses as not helpful',
    category: 'ai_quality',
    problem: `${notHelpful.length} response(s) have been rated "not helpful" by customers.`,
    evidence: notHelpful.map((f) => ({ createdAt: f.created_at, correction: f.correction })),
    frequency: notHelpful.length,
    confidence: notHelpful.length >= 5 ? 'high' : 'medium',
    recommendedSolution: 'Review the flagged messages (see evidence) for a pattern — wrong info, tone, or a missing capability.',
    suggestedAction: 'Read the correction notes attached to each flagged message.',
    sourceEvents: notHelpful.map((f) => f.id),
  });
  return [{ category: 'ai_quality', ...result }];
}

export function runOpportunityScan(tenantId) {
  return {
    knowledgeGaps: detectKnowledgeGaps(tenantId),
    escalationProducts: detectHighEscalationProducts(tenantId),
    aiQuality: detectAiQualityConcerns(tenantId),
  };
}

function rowToOpportunity(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    problem: row.problem,
    evidence: JSON.parse(row.evidence),
    frequency: row.frequency,
    businessImpact: row.business_impact,
    estimatedImpact: row.estimated_impact,
    confidence: row.confidence,
    recommendedSolution: row.recommended_solution,
    suggestedAction: row.suggested_action,
    sourceEvents: JSON.parse(row.source_events),
    status: row.status,
    detectedAt: row.detected_at,
    updatedAt: row.updated_at,
  };
}

export function listOpportunities(tenantId, { status } = {}) {
  const rows = status
    ? db.prepare('SELECT * FROM opportunities WHERE tenant_id = ? AND status = ? ORDER BY frequency DESC').all(tenantId, status)
    : db.prepare('SELECT * FROM opportunities WHERE tenant_id = ? ORDER BY frequency DESC').all(tenantId);
  return rows.map(rowToOpportunity);
}

const VALID_STATUSES = ['DETECTED', 'REVIEWED', 'APPROVED', 'IMPLEMENTED', 'MEASURED', 'REJECTED'];

export function updateOpportunityStatus(tenantId, id, status) {
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: 'Invalid status.' };
  const existing = db.prepare('SELECT id FROM opportunities WHERE tenant_id = ? AND id = ?').get(tenantId, id);
  if (!existing) return { ok: false, error: 'Opportunity not found.' };

  db.prepare(`UPDATE opportunities SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  return { ok: true };
}
