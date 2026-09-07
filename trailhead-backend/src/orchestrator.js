import { chatCompletion, isAiConnected } from './llmProvider.js';
import { toolSchemas, executeTool } from './tools.js';
import { classify } from './intent.js';
import { searchProducts, getOrderById, getOrdersByEmail, findPolicy } from './dataStore.js';

const PERSONA = `You are the AI assistant for Trailhead, an outdoor gear store.
You are helpful, direct, and concise — 1-3 sentences per reply unless asked for detail.

You have tools to look up products, orders, and policies, and to take real actions
(book an appointment, start an exchange, add to cart). Use tools whenever the answer
depends on real data — never guess a price, stock level, order status, or policy detail.

CRITICAL RULES:
- Only state facts that came from a tool result. If a tool found nothing, say so plainly.
- For book_appointment and start_exchange (when under the auto-approval limit): these
  require the customer to explicitly confirm via a button before anything is finalized.
  After calling the tool, tell the customer what you're about to do and that you need
  their confirmation — never say it's "done" or "booked" until a tool result confirms it.
- If start_exchange comes back escalated (order at/above the auto-approval limit), tell
  the customer it's been flagged for a team member to review — do NOT say it's approved
  or that you've started it.
- add_to_cart is low-risk and executes immediately — you can confirm it's done.
- Never invent a slot, order, or product that didn't come from a tool result.`;

function buildSystemPrompt(session) {
  const facts = session.facts;
  const factLines = [
    facts.lastOrderId ? `Last order discussed: ${facts.lastOrderId}` : null,
    facts.lastCategory ? `Last product category discussed: ${facts.lastCategory}` : null,
    facts.lastBudget ? `Last budget mentioned: $${facts.lastBudget}` : null,
    session.cart.length ? `Current cart: ${JSON.stringify(session.cart)}` : null,
  ].filter(Boolean);

  return `${PERSONA}\n\nSESSION CONTEXT (use this to avoid re-asking things already known):\n${
    factLines.length ? factLines.join('\n') : 'No prior context yet.'
  }`;
}

const MAX_TOOL_ITERATIONS = 4;

/**
 * The real agentic path: the LLM decides which tools to call based on
 * meaning, not keyword matching. Loops until it produces a final answer
 * with no more tool calls, or hits the iteration cap (safety net against
 * runaway loops).
 */
async function runAgentLoop({ message, session }) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(session) },
    ...session.history,
    { role: 'user', content: message },
  ];

  let uiPayload = {};

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const assistantMessage = await chatCompletion({ messages, tools: toolSchemas });
    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      // Final answer — no more tools requested.
      return { text: assistantMessage.content || '', ...uiPayload };
    }

    // Execute every requested tool call and feed results back.
    for (const call of assistantMessage.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch {
        args = {};
      }

      const { toolResult, uiPayload: payload } = executeTool(call.function.name, args, session);

      if (payload) {
        // Merge — later tool calls in the same turn can add to, not
        // overwrite, earlier ones (e.g. products + a policy note).
        uiPayload = { ...uiPayload, ...payload };
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: toolResult,
      });
    }
  }

  return {
    text: "I've gathered some information but need another step to finish — could you rephrase that or ask again?",
    ...uiPayload,
  };
}

/**
 * Fallback path when no AI key is configured: reuses the original
 * keyword-based grounding so the server is still usable for development
 * without a key, just without real reasoning.
 */
function legacyKeywordReply({ message }) {
  const parsed = classify(message);

  if (parsed.intent === 'order_status' || parsed.intent === 'price_breakdown' || parsed.intent === 'exchange') {
    let order = parsed.orderId ? getOrderById(parsed.orderId) : null;
    if (!order && parsed.email) order = getOrdersByEmail(parsed.email)[0] || null;
    return {
      text: '(AI not connected — set GROQ_API_KEY in .env. Showing raw data lookup instead.)',
      orderCard: order || undefined,
    };
  }

  if (parsed.intent === 'product_search') {
    const results = searchProducts({ maxPrice: parsed.maxPrice || undefined });
    return {
      text: '(AI not connected — set GROQ_API_KEY in .env. Showing raw data lookup instead.)',
      products: results.length ? results : undefined,
    };
  }

  const policy = findPolicy(message);
  return {
    text: policy
      ? `(AI not connected.) Policy: ${policy.content}`
      : '(AI not connected — set GROQ_API_KEY in .env to enable real replies.)',
  };
}

/**
 * Main entry point. `session` is a mutable object the caller (server.js)
 * keeps per-connection: { history: [], facts: {}, cart: [] }.
 */
export async function handleMessage({ message, session }) {
  const result = isAiConnected()
    ? await runAgentLoop({ message, session })
    : legacyKeywordReply({ message });

  return result;
}
