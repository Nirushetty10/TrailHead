// Two plans. Add a third by adding one more object here — nothing else
// needs to change except which plan a business is assigned to.
//
// The rate limits aren't arbitrary: they're sized against Groq's actual
// free-tier ceiling (30 requests/min, 1,000 requests/day, shared across
// your WHOLE platform, not per business — see backend design notes).
// Free plan stays well under that even with several free tenants active
// at once. Pro assumes you've added a card to Groq (10x limit bump,
// zero minimum spend) or moved to a paid model.

export const plans = {
  free: {
    name: 'Free',
    price: 0,
    conversationsPerMonth: 100,
    maxMessagesPerMinutePerUser: 5,
    maxRequestsPerMinuteGlobal: 10,
    // Groq's real free-tier ceiling is 8,000 tokens/minute — these stay
    // comfortably under that even with several free tenants active.
    maxTokensPerMinutePerUser: 3000,
    maxTokensPerMinuteGlobal: 6000,
    maxMessageChars: 800, // ~200 tokens — blocks a single giant paste outright
    cardsEnabled: ['support', 'orders'],
  },
  pro: {
    name: 'Pro',
    price: 79,
    conversationsPerMonth: 5000,
    maxMessagesPerMinutePerUser: 20,
    maxRequestsPerMinuteGlobal: 60,
    // Assumes Groq Developer tier (10x limits) or a paid model — scale
    // this down if you're still on free-tier Groq underneath Pro too.
    maxTokensPerMinutePerUser: 8000,
    maxTokensPerMinuteGlobal: 40000,
    maxMessageChars: 2000,
    cardsEnabled: ['support', 'orders', 'finder', 'pricing', 'exchange', 'appointment'],
  },
};

// Phase 2: this backend still serves a single business, so the active
// plan is one env var. Phase 3 (multi-tenant): this becomes a per-business
// lookup instead of a single global value.
export function getActivePlan() {
  const planKey = (process.env.BUSINESS_PLAN || 'free').toLowerCase();
  return plans[planKey] || plans.free;
}
