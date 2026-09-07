import {
  searchProducts,
  getOrderById,
  getOrdersByEmail,
  findPolicy,
  getAvailableSlots,
  getSlotById,
  bookSlot,
  requestExchange,
} from './dataStore.js';

// Business rule from the original design: don't auto-approve high-value
// exchanges. Anything at or above this goes to a human instead of being
// silently actioned. Tune this per business.
const EXCHANGE_AUTO_APPROVE_LIMIT = 100;

// --- Tool schemas, given to the LLM so it knows what it can call ---
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
          category: { type: 'string', description: 'e.g. jacket, footwear' },
          keyword: { type: 'string', description: 'A word from the product name, description, or use-case (e.g. "waterproof", "running")' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Look up an order by its order number or the customer email.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_policy',
      description: 'Look up store policy text (shipping, returns, appointments) relevant to the customer question.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'e.g. "exchange", "shipping", "appointments"' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_appointment_slots',
      description: 'Check available appointment slots, optionally filtered by date (YYYY-MM-DD).',
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
      description: 'Start a return/exchange for an order. Orders under $100 need customer confirmation before finalizing. Orders $100 or over are always escalated to a human — never tell the customer it is approved in that case.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['orderId'],
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

/**
 * Executes a tool call. Returns:
 *   - toolResult: what gets fed back to the LLM as the tool's output
 *   - uiPayload: optional structured data for the frontend (products, orderCard, confirmAction, escalation, cartUpdate)
 *
 * This is the single place guardrails live: read tools always execute,
 * write tools either execute immediately (low-risk), require confirmation
 * (medium-risk), or get escalated to a human (high-risk) — the LLM never
 * decides this, the code does.
 */
export function executeTool(name, args, session) {
  switch (name) {
    case 'search_products': {
      const results = searchProducts(args);
      if (results.length) {
        session.facts.lastCategory = args.category || session.facts.lastCategory;
        session.facts.lastBudget = args.maxPrice || session.facts.lastBudget;
      }
      return {
        toolResult: results.length
          ? JSON.stringify(results.map((p) => ({ name: p.name, price: p.price, stock: p.stock, description: p.description })))
          : 'No products matched.',
        uiPayload: results.length ? { products: results } : null,
      };
    }

    case 'get_order': {
      let order = args.orderId ? getOrderById(args.orderId) : null;
      if (!order && args.email) {
        order = getOrdersByEmail(args.email)[0] || null;
      }
      if (order) session.facts.lastOrderId = order.id;
      return {
        toolResult: order ? JSON.stringify(order) : 'No matching order found.',
        uiPayload: order ? { orderCard: order } : null,
      };
    }

    case 'find_policy': {
      const policy = findPolicy(args.topic || '');
      return {
        toolResult: policy ? policy.content : 'No policy found on that topic.',
        uiPayload: null,
      };
    }

    case 'check_appointment_slots': {
      const slots = getAvailableSlots(args);
      return {
        toolResult: slots.length ? JSON.stringify(slots) : 'No available slots for that date.',
        uiPayload: null,
      };
    }

    case 'book_appointment': {
      const slot = getSlotById(args.slotId);
      if (!slot || slot.booked) {
        return { toolResult: 'That slot is no longer available.', uiPayload: null };
      }
      // Medium-risk write: don't execute yet — hand back to the client for
      // explicit confirmation. The orchestrator turns this into a confirm card.
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
      const order = getOrderById(args.orderId);
      if (!order) {
        return { toolResult: 'Order not found.', uiPayload: null };
      }
      if (order.breakdown.total >= EXCHANGE_AUTO_APPROVE_LIMIT) {
        // High-risk: never auto-approve, never let the customer confirm it
        // themselves — this goes to a human, full stop.
        return {
          toolResult: `Order total is $${order.breakdown.total}, at or above the $${EXCHANGE_AUTO_APPROVE_LIMIT} auto-approval limit. This must be escalated to a human — tell the customer their request has been flagged for review, not approved.`,
          uiPayload: {
            escalation: {
              orderId: order.id,
              reason: args.reason || null,
              note: `Order total $${order.breakdown.total} exceeds auto-approval limit — needs human review.`,
            },
          },
        };
      }
      return {
        toolResult: 'Awaiting customer confirmation before starting the exchange — do not tell the customer this is done yet.',
        uiPayload: {
          confirmAction: {
            type: 'start_exchange',
            args: { orderId: args.orderId, reason: args.reason || null },
            title: `Confirm exchange for ${order.id}`,
            description: args.reason ? `Reason: ${args.reason}` : 'No reason given',
          },
        },
      };
    }

    case 'add_to_cart': {
      session.cart.push({ productId: args.productId, quantity: args.quantity || 1 });
      return {
        toolResult: `Added ${args.quantity || 1} x ${args.productId} to cart. Cart now has ${session.cart.length} item(s).`,
        uiPayload: { cartUpdate: [...session.cart] },
      };
    }

    default:
      return { toolResult: `Unknown tool: ${name}`, uiPayload: null };
  }
}

/**
 * Actually performs a write action after the customer has explicitly
 * confirmed it. Called from the confirm_action socket event, never
 * directly from the LLM.
 */
export function finalizeConfirmedAction(type, args) {
  if (type === 'book_appointment') {
    const result = bookSlot(args.slotId);
    if (!result.ok) return { ok: false, message: result.error };
    return {
      ok: true,
      message: `Booked: ${result.slot.service} on ${result.slot.date} at ${result.slot.time}.`,
      receipt: result.slot,
    };
  }

  if (type === 'start_exchange') {
    const result = requestExchange(args.orderId, args.reason);
    if (!result.ok) return { ok: false, message: result.error };
    return {
      ok: true,
      message: `Exchange started for order ${result.order.id}. You'll get an email with return instructions.`,
      receipt: result.order,
    };
  }

  return { ok: false, message: 'Unknown action type.' };
}
