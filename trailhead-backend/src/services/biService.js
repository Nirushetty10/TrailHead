import { db } from '../db/connection.js';

/**
 * Every number here comes from a real query over real recorded data.
 * Nothing here is estimated or invented — where we genuinely can't
 * measure something honestly (e.g. true AI-attributed revenue, which
 * would require a live checkout funnel we don't have yet), it's left
 * out entirely rather than approximated with a made-up formula.
 */
export function getOverview(tenantId, sinceDays = 30) {
  const since = `-${sinceDays} days`;

  const conversations = db
    .prepare(`SELECT COUNT(*) as c FROM conversations WHERE tenant_id = ? AND started_at >= datetime('now', ?)`)
    .get(tenantId, since).c;

  const messages = db
    .prepare(`SELECT COUNT(*) as c FROM messages WHERE tenant_id = ? AND created_at >= datetime('now', ?)`)
    .get(tenantId, since).c;

  const escalations = db
    .prepare(`SELECT COUNT(*) as c FROM escalations WHERE tenant_id = ? AND created_at >= datetime('now', ?)`)
    .get(tenantId, since).c;

  const openEscalations = db
    .prepare(`SELECT COUNT(*) as c FROM escalations WHERE tenant_id = ? AND resolved = 0`)
    .get(tenantId).c;

  const feedback = db
    .prepare(
      `SELECT rating, COUNT(*) as c FROM message_feedback WHERE tenant_id = ? AND created_at >= datetime('now', ?) GROUP BY rating`
    )
    .all(tenantId, since);
  const helpfulCount = feedback.find((f) => f.rating === 'helpful')?.c || 0;
  const notHelpfulCount = feedback.find((f) => f.rating === 'not_helpful')?.c || 0;

  const knowledgeGaps = db
    .prepare(`SELECT COUNT(*) as c FROM events WHERE tenant_id = ? AND event_type = 'KnowledgeGap' AND created_at >= datetime('now', ?)`)
    .get(tenantId, since).c;

  // Order/revenue figures are computed from whatever's in the orders
  // table right now — honestly labeled as "current order records," NOT
  // "AI-attributed revenue," since we have no live purchase funnel yet
  // to actually attribute a sale to an AI recommendation.
  const orderStats = db
    .prepare(`SELECT COUNT(*) as orderCount, SUM(json_extract(breakdown, '$.total')) as totalRevenue FROM orders WHERE tenant_id = ?`)
    .get(tenantId);

  const aov = orderStats.orderCount > 0 ? orderStats.totalRevenue / orderStats.orderCount : 0;

  return {
    periodDays: sinceDays,
    conversations,
    messages,
    escalations: { total: escalations, currentlyOpen: openEscalations },
    feedback: { helpful: helpfulCount, notHelpful: notHelpfulCount },
    knowledgeGaps,
    orders: {
      count: orderStats.orderCount,
      totalRevenue: orderStats.totalRevenue || 0,
      averageOrderValue: Math.round(aov * 100) / 100,
      note: 'Based on current order records in the system, not live AI-attributed sales — this app has no live checkout funnel yet.',
    },
  };
}

/**
 * Which products get searched/recommended most, and which ones show up
 * most often in orders tied to an escalation — a real, if rough, proxy
 * for "which products cause the most support friction."
 */
export function getProductInsights(tenantId, sinceDays = 30) {
  const since = `-${sinceDays} days`;

  const searchEvents = db
    .prepare(`SELECT metadata FROM events WHERE tenant_id = ? AND event_type = 'ProductRecommended' AND created_at >= datetime('now', ?)`)
    .all(tenantId, since);

  const recommendCounts = {};
  for (const row of searchEvents) {
    const meta = JSON.parse(row.metadata);
    const ids = meta.productIds || [];
    for (const id of ids) {
      recommendCounts[id] = (recommendCounts[id] || 0) + 1;
    }
  }

  const escalatedOrders = db
    .prepare(`SELECT order_id FROM escalations WHERE tenant_id = ? AND order_id IS NOT NULL`)
    .all(tenantId);

  const escalationProductCounts = {};
  for (const { order_id } of escalatedOrders) {
    const order = db.prepare('SELECT items FROM orders WHERE tenant_id = ? AND id = ?').get(tenantId, order_id);
    if (!order) continue;
    const items = JSON.parse(order.items);
    for (const item of items) {
      escalationProductCounts[item.productId] = (escalationProductCounts[item.productId] || 0) + 1;
    }
  }

  return {
    mostRecommended: Object.entries(recommendCounts)
      .map(([productId, count]) => ({ productId, count }))
      .sort((a, b) => b.count - a.count),
    mostEscalated: Object.entries(escalationProductCounts)
      .map(([productId, count]) => ({ productId, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * A composite score built from three real, measured signals — not a
 * black box. The formula is deliberately simple and shown here, not
 * hidden, so it can be inspected and argued with.
 */
export function getAiHealthScore(tenantId, sinceDays = 30) {
  const overview = getOverview(tenantId, sinceDays);

  const totalFeedback = overview.feedback.helpful + overview.feedback.notHelpful;
  const feedbackScore = totalFeedback > 0 ? overview.feedback.helpful / totalFeedback : null;

  const escalationRate = overview.conversations > 0 ? overview.escalations.total / overview.conversations : 0;
  const gapRate = overview.conversations > 0 ? overview.knowledgeGaps / overview.conversations : 0;

  // Only compute a score if there's enough signal to mean anything —
  // returning a fake "100" on zero data would be actively misleading.
  if (overview.conversations < 3) {
    return {
      score: null,
      label: 'Not enough conversations yet to compute a meaningful score',
      inputs: { conversations: overview.conversations, feedbackScore, escalationRate, gapRate },
    };
  }

  const feedbackComponent = feedbackScore === null ? 0.7 : feedbackScore; // neutral prior if no feedback yet
  const escalationComponent = Math.max(0, 1 - escalationRate * 2);
  const gapComponent = Math.max(0, 1 - gapRate * 2);

  const score = Math.round((feedbackComponent * 0.5 + escalationComponent * 0.25 + gapComponent * 0.25) * 100);

  return {
    score,
    label: score >= 80 ? 'Healthy' : score >= 60 ? 'Needs attention' : 'At risk',
    formula: 'feedback_ratio*0.5 + (1 - escalation_rate*2)*0.25 + (1 - knowledge_gap_rate*2)*0.25',
    inputs: {
      conversations: overview.conversations,
      feedbackScore,
      escalationRate: Math.round(escalationRate * 1000) / 1000,
      gapRate: Math.round(gapRate * 1000) / 1000,
    },
  };
}
