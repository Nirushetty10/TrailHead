import { chatCompletion, isAiConnected } from './llmProvider.js';
import { toolSchemas, executeTool } from './tools.js';
import { classify } from './intent.js';
import { searchProducts, getOrderById, findPolicy } from './dataStore.js';
import { getBusiness } from './businessRegistry.js';
import { recordEvent } from './services/eventService.js';
import { getEffectiveConfig } from './services/employeeService.js';

function buildPersona(business, employeeConfig) {
  return `You are the AI assistant for ${business.name}, ${business.description}.
You are helpful, direct, and concise — 1-3 sentences per reply unless asked for detail.

You are staffed by the following AI Employees, each responsible for part of what you do:
${employeeConfig.combinedInstructions || 'No employees currently enabled — say you cannot help with that yet.'}

Use tools whenever the answer depends on real data — never guess a price, stock level,
order status, or policy detail.

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
- Never invent a slot, order, or product that didn't come from a tool result.
- Only mention capabilities (appointments, exchanges, etc) that make sense for this
  business — a coffee shop doesn't book "appointments" the way a gear store does.
- You can only do what your enabled AI Employees are configured for — if something is
  outside all of their instructions above, say you can't help with that.`;
}

function buildSystemPrompt(business, session, employeeConfig) {
  const facts = session.facts;
  const factLines = [
    facts.lastOrderId ? `Last order discussed: ${facts.lastOrderId}` : null,
    facts.lastCategory ? `Last product category discussed: ${facts.lastCategory}` : null,
    facts.lastBudget ? `Last budget mentioned: $${facts.lastBudget}` : null,
    session.cart.length ? `Current cart: ${JSON.stringify(session.cart)}` : null,
  ].filter(Boolean);

  return `${buildPersona(business, employeeConfig)}\n\nSESSION CONTEXT (use this to avoid re-asking things already known):\n${
    factLines.length ? factLines.join('\n') : 'No prior context yet.'
  }`;
}

const MAX_TOOL_ITERATIONS = 4;

async function runAgentLoop({ businessId, business, message, session }) {
  const employeeConfig = getEffectiveConfig(businessId);

  // Only offer the LLM tools an ENABLED employee is actually responsible
  // for. If an owner disables the Sales employee, search_products/
  // compare_products/add_to_cart simply disappear from what the AI can
  // call — a real permission boundary, not just a prompt instruction the
  // model could ignore.
  const allowedTools = toolSchemas.filter((t) => employeeConfig.allowedToolNames.includes(t.function.name));

  const messages = [
    { role: 'system', content: buildSystemPrompt(business, session, employeeConfig) },
    ...session.history,
    { role: 'user', content: message },
  ];

  let uiPayload = {};

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const assistantMessage = await chatCompletion({ messages, tools: allowedTools });
    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return { text: assistantMessage.content || '', ...uiPayload };
    }

    for (const call of assistantMessage.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch {
        args = {};
      }

      const { toolResult, uiPayload: payload } = executeTool(businessId, call.function.name, args, session);

      if (payload) {
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

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'under', 'over', 'need', 'want', 'show', 'me',
  'a', 'an', 'some', 'any', 'looking', 'find', 'not', 'too', 'pricey', 'price',
  'expensive', 'cheap', 'something', 'have', 'has', 'got', 'get', 'that', 'this',
  'is', 'are', 'can', 'you', 'your', 'please', 'like', 'about', 'dollars', 'dollar',
]);

function extractKeywords(message) {
  return message
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function legacyKeywordReply({ businessId, message, session }) {
  const parsed = classify(message);

  if (parsed.intent === 'order_status' || parsed.intent === 'price_breakdown' || parsed.intent === 'exchange') {
    const order = parsed.orderId ? getOrderById(businessId, parsed.orderId) : null;

    if (!order) {
      return { text: '(AI not connected.) No matching order found.' };
    }

    const alreadyVerified = session.verifiedOrders.includes(order.id);
    const emailMatches = parsed.email && order.customerEmail.toLowerCase() === parsed.email.toLowerCase();

    if (!alreadyVerified && !emailMatches) {
      return {
        text: '(AI not connected.) To look up that order, please also include the email address used on it.',
      };
    }

    if (emailMatches && !alreadyVerified) session.verifiedOrders.push(order.id);

    return {
      text: '(AI not connected — set GROQ_API_KEY in .env. Showing raw data lookup instead.)',
      orderCard: order,
    };
  }

  if (parsed.intent === 'product_search') {
    const results = searchProducts(businessId, {
      maxPrice: parsed.maxPrice || undefined,
      keywords: extractKeywords(message),
    });
    recordEvent({
      tenantId: businessId,
      eventType: 'ProductSearched',
      source: 'ai-legacy',
      metadata: { maxPrice: parsed.maxPrice, resultCount: results.length },
    });
    if (results.length) {
      recordEvent({
        tenantId: businessId,
        eventType: 'ProductRecommended',
        source: 'ai-legacy',
        metadata: { productIds: results.map((p) => p.id) },
      });
    }
    return {
      text: '(AI not connected — set GROQ_API_KEY in .env. Showing raw data lookup instead.)',
      products: results.length ? results : undefined,
    };
  }

  const policy = findPolicy(businessId, message);
  if (!policy) {
    recordEvent({ tenantId: businessId, eventType: 'KnowledgeGap', source: 'ai-legacy', metadata: { message } });
  }
  return {
    text: policy
      ? `(AI not connected.) Policy: ${policy.content}`
      : '(AI not connected — set GROQ_API_KEY in .env to enable real replies.)',
  };
}

/**
 * Main entry point. `businessId` determines which tenant's data, persona,
 * and rules apply for this entire turn. `session` is per-business,
 * per-client — see sessionStore.js.
 */
export async function handleMessage({ businessId, message, session }) {
  const business = getBusiness(businessId);

  const result = isAiConnected()
    ? await runAgentLoop({ businessId, business, message, session })
    : legacyKeywordReply({ businessId, message, session });

  return result;
}
