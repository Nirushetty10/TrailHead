import {
  searchProducts,
  getOrderById,
  findPolicy,
  getAvailableSlots,
  getSlotById,
  bookSlot,
  requestExchange,
  getProductsByIds,
} from './dataStore.js';
import { raiseEscalation } from './escalationStore.js';
import { recordEvent } from './services/eventService.js';
import { recordAudit } from './services/auditLogService.js';
import { formatTranscript } from './services/conversationService.js';
import { evaluateAction } from './services/policyService.js';

export const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search the product catalog by budget, category, or keyword. Use this whenever the customer is looking for or comparing products.',
      parameters: {
        type: 'object',
        properties: {
          maxPrice: { type: 'number', description: 'Maximum price in USD' },
          category: { type: 'string', description: 'e.g. jacket, footwear, coffee, pastry' },
          keyword: { type: 'string', description: 'A word from the product name, description, or use-case' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Look up an order by its order number. SECURITY: this ALWAYS also requires the email address on the order to verify identity — if the customer has only given the order number, ask for the email before calling this with both, or call it once with just orderId to check if it is already verified from earlier in this conversation. Never reveal any order details from your own knowledge — only from this tool\'s result.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          email: { type: 'string', description: 'The email address the customer says is on the order — required unless this order was already verified earlier in the conversation.' },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_policy',
      description: 'Look up store policy text (shipping, returns, hours, appointments) relevant to the customer question.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'e.g. "exchange", "shipping", "hours", "appointments"' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_appointment_slots',
      description: 'Check available appointment slots, optionally filtered by date (YYYY-MM-DD). Only relevant if this business offers bookable appointments.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Book an appointment slot for the customer. This ALWAYS requires the customer to confirm before it is finalized — never tell the customer it is booked until you see a confirmed result.',
      parameters: {
        type: 'object',
        properties: {
          slotId: { type: 'string', description: 'The id of the slot from check_appointment_slots results' },
        },
        required: ['slotId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_exchange',
      description: 'Start a return/exchange for an order. SECURITY: requires the order to be verified first (same email rule as get_order) — pass email if not already verified. Orders under $100 need customer confirmation before finalizing. Orders $100 or over are always escalated to a human — never tell the customer it is approved in that case.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          email: { type: 'string', description: 'Required unless this order was already verified earlier in the conversation.' },
          reason: { type: 'string' },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_products',
      description: 'Compare two or more specific products side by side (price, stock, description). Use this when the customer asks about the difference between named products, not for general browsing.',
      parameters: {
        type: 'object',
        properties: {
          productIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'The product ids to compare — get these from a prior search_products result.',
          },
        },
        required: ['productIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: "Add a product to the customer's cart. Low-risk — no confirmation needed.",
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'number' },
        },
        required: ['productId'],
      },
    },
  },
];

function verifyOrderAccess(order, args, session) {
  if (!order) return false;
  if (session.verifiedOrders.includes(order.id)) return true;
  if (args.email && order.customerEmail.toLowerCase() === args.email.toLowerCase()) {
    session.verifiedOrders.push(order.id);
    return true;
  }
  return false;
}

const VERIFICATION_NEEDED_MESSAGE =
  "Identity not verified — tell the customer you need the email address on the order before sharing any details, then call this tool again with that email. Do not reveal whether an order with that number exists.";

/**
 * Every call is scoped to `businessId` — this is what actually enforces
 * data isolation between tenants. A tool call for the cafe can never see
 * Trailhead's products/orders, and vice versa, because dataStore itself
 * only ever loads and caches per-business files.
 */
export function executeTool(businessId, name, args, session) {
  switch (name) {
    case 'search_products': {
      const results = searchProducts(businessId, args);
      if (results.length) {
        session.facts.lastCategory = args.category || session.facts.lastCategory;
        session.facts.lastBudget = args.maxPrice || session.facts.lastBudget;
      }
      recordEvent({
        tenantId: businessId,
        eventType: 'ProductSearched',
        source: 'ai',
        metadata: { ...args, resultCount: results.length },
      });
      if (results.length) {
        recordEvent({
          tenantId: businessId,
          eventType: 'ProductRecommended',
          source: 'ai',
          metadata: { productIds: results.map((p) => p.id) },
        });
      }
      return {
        toolResult: results.length
          ? JSON.stringify(results.map((p) => ({ name: p.name, price: p.price, stock: p.stock, description: p.description })))
          : 'No products matched.',
        uiPayload: results.length ? { products: results } : null,
      };
    }

    case 'get_order': {
      const order = args.orderId ? getOrderById(businessId, args.orderId) : null;
      if (!verifyOrderAccess(order, args, session)) {
        return { toolResult: VERIFICATION_NEEDED_MESSAGE, uiPayload: null };
      }
      session.facts.lastOrderId = order.id;
      return {
        toolResult: JSON.stringify(order),
        uiPayload: { orderCard: order },
      };
    }

    case 'find_policy': {
      const policy = findPolicy(businessId, args.topic || '');
      if (!policy) {
        // This is exactly the signal Phase 3's knowledge-gap detection
        // will read from later — recording it now means no backfill needed.
        recordEvent({
          tenantId: businessId,
          eventType: 'KnowledgeGap',
          source: 'ai',
          metadata: { topic: args.topic || null },
        });
      }
      return {
        toolResult: policy ? policy.content : 'No policy found on that topic.',
        uiPayload: null,
      };
    }

    case 'compare_products': {
      const products = getProductsByIds(businessId, args.productIds || []);
      if (!products.length) {
        return { toolResult: 'None of those product ids were found.', uiPayload: null };
      }
      recordEvent({
        tenantId: businessId,
        eventType: 'ProductRecommended',
        source: 'ai',
        metadata: { productIds: products.map((p) => p.id), context: 'comparison' },
      });
      return {
        toolResult: JSON.stringify(
          products.map((p) => ({ name: p.name, price: p.price, stock: p.stock, description: p.description, tags: p.tags }))
        ),
        uiPayload: { products, comparison: true },
      };
    }

    case 'check_appointment_slots': {
      const slots = getAvailableSlots(businessId, args);
      return {
        toolResult: slots.length ? JSON.stringify(slots) : 'No available slots for that date.',
        uiPayload: null,
      };
    }

    case 'book_appointment': {
      const slot = getSlotById(businessId, args.slotId);
      if (!slot || slot.booked) {
        return { toolResult: 'That slot is no longer available.', uiPayload: null };
      }
      return {
        toolResult: 'Awaiting customer confirmation before booking — do not tell the customer this is booked yet.',
        uiPayload: {
          confirmAction: {
            type: 'book_appointment',
            args: { slotId: args.slotId },
            title: `Confirm ${slot.service}`,
            description: `${slot.date} at ${slot.time}`,
          },
        },
      };
    }

    case 'start_exchange': {
      const order = args.orderId ? getOrderById(businessId, args.orderId) : null;
      if (!verifyOrderAccess(order, args, session)) {
        return { toolResult: VERIFICATION_NEEDED_MESSAGE, uiPayload: null };
      }

      // Configurable per tenant now (was a hardcoded $100 constant).
      // 'auto' and 'approval' are treated identically here — exchanges
      // have always required customer confirmation regardless of amount,
      // preserving exact prior tested behavior. Only 'restricted' changes
      // the flow (escalates instead of confirming). See policyService.js
      // for why the 3-tier engine still exists even though this action
      // only really uses 2 of the 3 tiers today.
      const { decision, policy } = evaluateAction(businessId, 'start_exchange', order.breakdown.total);

      if (decision === 'restricted') {
        // Rich context for the human who has to act on this — not just
        // an order id. Doc's Phase 2 spec explicitly wants: customer,
        // conversation summary, products discussed, order info, reason.
        const context = {
          customerEmail: order.customerEmail,
          orderSummary: { id: order.id, total: order.breakdown.total, status: order.status, items: order.items },
          recentConversation: session.conversationId
            ? formatTranscript(businessId, session.conversationId, 8)
            : 'No conversation history available.',
          productsDiscussed: session.facts.lastCategory || null,
          recommendedNextAction: 'Review order and contact customer to confirm exchange eligibility before approving.',
        };

        const escalation = raiseEscalation(businessId, {
          type: 'exchange_review',
          orderId: order.id,
          reason: args.reason,
          note: `Order ${order.id} total $${order.breakdown.total} exceeds the $${policy.restrictedAtOrAbove} auto-approval limit — needs human review.`,
          context,
        });
        return {
          toolResult: `Order total is $${order.breakdown.total}, at or above the $${policy.restrictedAtOrAbove} auto-approval limit. This has been escalated to a human (escalation id ${escalation.id}) — tell the customer their request has been flagged for review, not approved.`,
          uiPayload: {
            escalation: {
              id: escalation.id,
              orderId: order.id,
              reason: args.reason || null,
              note: escalation.note,
            },
          },
        };
      }

      return {
        toolResult: 'Awaiting customer confirmation before starting the exchange — do not tell the customer this is done yet.',
        uiPayload: {
          confirmAction: {
            type: 'start_exchange',
            args: { orderId: order.id, reason: args.reason || null },
            title: `Confirm exchange for ${order.id}`,
            description: args.reason ? `Reason: ${args.reason}` : 'No reason given',
          },
        },
      };
    }

    case 'add_to_cart': {
      session.cart.push({ productId: args.productId, quantity: args.quantity || 1 });
      recordEvent({
        tenantId: businessId,
        eventType: 'AIAction',
        productId: args.productId,
        source: 'ai',
        metadata: { action: 'add_to_cart', quantity: args.quantity || 1 },
      });
      return {
        toolResult: `Added ${args.quantity || 1} x ${args.productId} to cart. Cart now has ${session.cart.length} item(s).`,
        uiPayload: { cartUpdate: [...session.cart] },
      };
    }

    default:
      return { toolResult: `Unknown tool: ${name}`, uiPayload: null };
  }
}

export function finalizeConfirmedAction(businessId, type, args) {
  if (type === 'book_appointment') {
    const result = bookSlot(businessId, args.slotId);
    if (!result.ok) return { ok: false, message: result.error };

    recordAudit({
      tenantId: businessId,
      actorType: 'ai',
      action: 'appointment_booked',
      targetType: 'appointment',
      targetId: args.slotId,
      details: result.slot,
    });
    recordEvent({
      tenantId: businessId,
      eventType: 'AIAction',
      source: 'ai',
      metadata: { action: 'book_appointment', slot: result.slot },
    });

    return {
      ok: true,
      message: `Booked: ${result.slot.service} on ${result.slot.date} at ${result.slot.time}.`,
      receipt: result.slot,
    };
  }

  if (type === 'start_exchange') {
    const result = requestExchange(businessId, args.orderId, args.reason);
    if (!result.ok) return { ok: false, message: result.error };

    recordAudit({
      tenantId: businessId,
      actorType: 'ai',
      action: 'exchange_started',
      targetType: 'order',
      targetId: result.order.id,
      details: { reason: args.reason },
    });
    recordEvent({
      tenantId: businessId,
      eventType: 'AIAction',
      orderId: result.order.id,
      source: 'ai',
      metadata: { action: 'start_exchange', reason: args.reason },
    });

    return {
      ok: true,
      message: `Exchange started for order ${result.order.id}. You'll get an email with return instructions.`,
      receipt: result.order,
    };
  }

  return { ok: false, message: 'Unknown action type.' };
}
