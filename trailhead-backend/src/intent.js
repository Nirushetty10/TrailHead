// Phase 1 intent classification: fast, deterministic, no LLM call needed
// just to route the message. This keeps grounding cheap and predictable.
// Phase 2 can add an LLM-based classifier for messier phrasing if this
// starts missing too often — but keyword routing covers most support/sales
// chat surprisingly well and is worth keeping for cost + speed.

const ORDER_ID_PATTERN = /\bTH-\d{3,}\b/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PRICE_PATTERN = /\$?\s?(\d{2,4})/;

// Order matters: more specific intents are checked before generic ones.
// "order" appears in almost every message about an order, so exchange/
// price_breakdown must be checked first or they'll never win.
const INTENTS = [
  {
    type: 'exchange',
    keywords: ['exchange', 'return', 'refund', 'not good', 'damaged', 'wrong size'],
  },
  {
    type: 'price_breakdown',
    keywords: ['price breakdown', 'breakdown', 'how much tax', 'total cost', 'fees'],
  },
  {
    type: 'appointment',
    keywords: ['appointment', 'book', 'schedule', 'fitting', 'slot'],
  },
  {
    type: 'product_search',
    keywords: ['recommend', 'find', 'looking for', 'jacket', 'shoe', 'boot', 'under $', 'budget'],
  },
  {
    type: 'order_status',
    keywords: ['order', 'track', 'delivery', 'shipped', 'where is my', 'arriving'],
  },
];

export function classify(message) {
  const lower = message.toLowerCase();

  const orderIdMatch = message.match(ORDER_ID_PATTERN);
  const emailMatch = message.match(EMAIL_PATTERN);
  const priceMatch = message.match(PRICE_PATTERN);

  let intent = 'support_general';
  for (const candidate of INTENTS) {
    if (candidate.keywords.some((k) => lower.includes(k))) {
      intent = candidate.type;
      break;
    }
  }

  // An order id or email mentioned anywhere strongly implies order_status,
  // even if the phrasing didn't hit a keyword (e.g. "TH-48213?")
  if (intent === 'support_general' && (orderIdMatch || emailMatch)) {
    intent = 'order_status';
  }

  return {
    intent,
    orderId: orderIdMatch ? orderIdMatch[0].toUpperCase() : null,
    email: emailMatch ? emailMatch[0] : null,
    maxPrice: priceMatch ? Number(priceMatch[1]) : null,
  };
}
