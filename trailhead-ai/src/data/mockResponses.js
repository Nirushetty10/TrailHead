// Phase 1 stand-in for the real retrieval orchestrator described in the
// backend design: given a message, decide whether it needs a structured
// fact lookup, a semantic/product search, or a plain reply — then respond.
// In production this file is replaced by real API calls; the UI contract
// (return { text, products? }) stays the same.

const catalog = [
  {
    id: 'ridge-shell',
    name: 'Ridge Shell',
    price: 112,
    stock: 'in_stock',
    tag: 'Best match',
  },
  {
    id: 'storm-anorak',
    name: 'Storm Anorak',
    price: 98,
    stock: 'in_stock',
  },
  {
    id: 'summit-rain',
    name: 'Summit Rain Jkt',
    price: 119,
    stock: 'low_stock',
    stockLabel: '2 left',
  },
];

function findByKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function getMockReply(userText) {
  const text = userText.trim();

  if (findByKeyword(text, ['order', 'track', 'delivery', 'shipped', 'th-'])) {
    if (/\d{3,}/.test(text) || findByKeyword(text, ['th-'])) {
      return {
        text: 'Found it — Trail Runner 3, shipped Sep 3. Out for delivery, arriving today by 8 PM.',
        meta: 'from your order system',
      };
    }
    return { text: "Sure — what's your order number or the email you used?" };
  }

  if (findByKeyword(text, ['jacket', 'find', 'recommend', 'budget', 'under $', 'shoe', 'boot'])) {
    return {
      text: 'Three in stock at that price. Ridge Shell breathes best for running.',
      meta: 'from your catalog · sorted by best match',
      products: catalog,
    };
  }

  if (findByKeyword(text, ['price', 'breakdown', 'cost', 'tax', 'fee'])) {
    return {
      text: 'Ridge Shell — $112 base, $6.50 tax, $0 shipping (order qualifies for free shipping). Total: $118.50.',
      meta: 'from your pricing rules',
    };
  }

  if (findByKeyword(text, ['exchange', 'return', 'refund', 'not good', 'damaged'])) {
    return {
      text: "I can start that — what's the order number for the item you'd like to return or exchange?",
    };
  }

  if (findByKeyword(text, ['appointment', 'book', 'schedule', 'slot', 'pm', 'am'])) {
    return {
      text: 'I can check availability for that. Which service, and what date/time works best?',
    };
  }

  return {
    text: "I don't have that information yet — try asking about an order, a product, pricing, or booking a slot.",
  };
}

export const initialGreeting = 'What do you need help with?';
