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

// Phase 3 (multi-tenant): each business's plan now comes from the
// registry (data/businesses.json), not a single global env var — every
// business on the platform can be on a different plan.
import { getBusiness } from './businessRegistry.js';

export function getPlanForBusiness(businessId) {
  const business = getBusiness(businessId);
  return plans[business.plan] || plans.free;
}
