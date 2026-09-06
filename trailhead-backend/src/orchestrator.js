import { classify } from './intent.js';
import { generateReply } from './llmProvider.js';
import {
  searchProducts,
  getOrderById,
  getOrdersByEmail,
  findPolicy,
} from './dataStore.js';

const PERSONA = `You are the AI assistant for Trailhead, an outdoor gear store.
You are helpful, direct, and concise — 1-3 sentences per reply unless asked for detail.
You are in READ-ONLY mode: you can look up information but cannot place orders,
issue refunds, or book appointments yet (that ships in a later release).

CRITICAL RULES:
- Only state facts that appear in the DATA block below. Never invent a price, stock count, order status, or policy detail.
- If the DATA block is empty or doesn't answer the question, say plainly that you don't have that information, and suggest what the person could provide (an order number, email, or budget).
- Do not restate the entire DATA block verbatim — summarize naturally, like a knowledgeable staff member would.
- Never promise an action (refund, booking, exchange) as if it's already done — this store is read-only for now. Say you can start the process/help find info, not that you've completed it.`;

function extractProductKeyword(message) {
  const known = ['jacket', 'shell', 'anorak', 'shoe', 'boot', 'runner'];
  const lower = message.toLowerCase();
  return known.find((k) => lower.includes(k)) || '';
}

function buildGroundingBlock({ intent, orderId, email, maxPrice, message }) {
  if (intent === 'order_status') {
    let order = orderId ? getOrderById(orderId) : null;
    if (!order && email) {
      const matches = getOrdersByEmail(email);
      order = matches[0] || null;
    }
    if (!order) {
      return { dataText: 'No matching order found for the given order number/email.', products: null, orderCard: null };
    }
    return {
      dataText: `ORDER ${order.id}: status=${order.status}, shippedAt=${order.shippedAt || 'n/a'}, estimatedDelivery=${order.estimatedDelivery || 'n/a'}, total=$${order.breakdown.total}`,
      products: null,
      orderCard: order,
    };
  }

  if (intent === 'price_breakdown') {
    let order = orderId ? getOrderById(orderId) : null;
    if (order) {
      return {
        dataText: `ORDER ${order.id} BREAKDOWN: ${JSON.stringify(order.breakdown)}`,
        products: null,
        orderCard: order,
      };
    }
    const candidates = searchProducts({ keyword: extractProductKeyword(message) });
    if (candidates.length) {
      const p = candidates[0];
      const tax = +(p.price * 0.065).toFixed(2);
      const shipping = p.price >= 75 ? 0 : 6.5;
      return {
        dataText: `PRODUCT ${p.name}: price=$${p.price}, estTax=$${tax}, shipping=$${shipping}, estTotal=$${(p.price + tax + shipping).toFixed(2)}`,
        products: [p],
        orderCard: null,
      };
    }
    return { dataText: 'No matching order or product found to break down.', products: null, orderCard: null };
  }

  if (intent === 'product_search') {
    const results = searchProducts({ maxPrice: maxPrice || undefined, keyword: extractProductKeyword(message) });
    if (!results.length) {
      return { dataText: 'No products matched those filters.', products: null, orderCard: null };
    }
    return {
      dataText: `MATCHING PRODUCTS: ${JSON.stringify(results.map((p) => ({ name: p.name, price: p.price, stock: p.stock, description: p.description })))}`,
      products: results,
      orderCard: null,
    };
  }

  if (intent === 'exchange') {
    const policy = findPolicy(message);
    const order = orderId ? getOrderById(orderId) : null;
    return {
      dataText: [
        policy ? `POLICY: ${policy.content}` : null,
        order ? `RELEVANT ORDER ${order.id}: status=${order.status}` : 'No order number provided yet.',
      ].filter(Boolean).join(' | '),
      products: null,
      orderCard: order,
    };
  }

  if (intent === 'appointment') {
    const policy = findPolicy(message);
    return {
      dataText: policy ? `POLICY: ${policy.content}` : 'No appointment info matched.',
      products: null,
      orderCard: null,
    };
  }

  const policy = findPolicy(message);
  return {
    dataText: policy ? `POLICY: ${policy.content}` : "No specific data matched this message — respond conversationally and ask a clarifying question if needed.",
    products: null,
    orderCard: null,
  };
}

/**
 * Main entry point. Given the user's message and short conversation history,
 * returns a fully grounded reply plus structured data for the UI to render
 * (products/orderCard come straight from DATA — never from the LLM's text —
 * so the UI's numbers can never drift from what's actually true).
 */
export async function handleMessage({ message, history = [] }) {
  const parsed = classify(message);
  const grounding = buildGroundingBlock({ ...parsed, message });

  const systemPrompt = `${PERSONA}\n\nDATA:\n${grounding.dataText}`;

  const replyText = await generateReply({
    systemPrompt,
    history,
    userMessage: message,
  });

  return {
    text: replyText,
    intent: parsed.intent,
    products: grounding.products,
    orderCard: grounding.orderCard,
  };
}
