import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { handleMessage } from './src/orchestrator.js';
import { finalizeConfirmedAction } from './src/tools.js';
import { isAiConnected } from './src/llmProvider.js';
import { getActivePlan } from './src/plans.js';
import { checkRateLimit, clearUser } from './src/rateLimiter.js';
import { checkAndRecordConversation, getMonthlyUsage } from './src/usageTracker.js';
import { estimateRequestTokens } from './src/tokenEstimator.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const PLAN = getActivePlan();

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
});

// Per-connection session: real structured state, not just a message log.
// Phase 3: move this to Redis so it survives reconnects and works across
// multiple server instances.
const sessions = new Map();
// Pending confirmable actions, keyed by connection then actionId.
const pendingActions = new Map();

const MAX_HISTORY_MESSAGES = 12;

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      history: [],
      facts: { lastOrderId: null, lastCategory: null, lastBudget: null },
      cart: [],
    });
  }
  return sessions.get(id);
}

function appendHistory(session, role, content) {
  session.history.push({ role, content });
  session.history = session.history.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * Four enforcement layers, checked in order, BEFORE the AI is ever
 * touched. A blocked message costs zero tokens and zero provider quota.
 */
function checkLimits(userId, message) {
  if (message.length > PLAN.maxMessageChars) {
    return {
      blocked: true,
      text: `That message is a bit long for me to process — please keep it under ${PLAN.maxMessageChars} characters.`,
    };
  }

  const usage = checkAndRecordConversation(userId, PLAN);
  if (usage.capped) {
    return {
      blocked: true,
      text: `You've reached this month's plan limit (${PLAN.conversationsPerMonth} conversations on the ${PLAN.name} plan). Upgrade to continue.`,
    };
  }

  const estimatedTokens = estimateRequestTokens(message);
  const rate = checkRateLimit(userId, PLAN, estimatedTokens);
  if (!rate.allowed) {
    if (rate.reason === 'per_user' || rate.reason === 'per_user_tokens') {
      return {
        blocked: true,
        text: `You're sending messages a bit fast — please wait ${rate.retryAfterSeconds}s and try again.`,
      };
    }
    return {
      blocked: true,
      text: "We're experiencing high demand right now — please try again in a moment.",
    };
  }

  return { blocked: false };
}

async function processMessage(id, message) {
  const limitCheck = checkLimits(id, message);
  if (limitCheck.blocked) {
    return { text: limitCheck.text, limitReached: true };
  }

  const session = getSession(id);
  const result = await handleMessage({ message, session });

  appendHistory(session, 'user', message);
  if (result.text) appendHistory(session, 'assistant', result.text);

  if (result.confirmAction) {
    const actionId = crypto.randomUUID();
    if (!pendingActions.has(id)) pendingActions.set(id, new Map());
    pendingActions.get(id).set(actionId, result.confirmAction);
    result.confirmAction = { ...result.confirmAction, actionId };
  }

  return result;
}

// --- REST fallback (useful for curl testing / non-socket clients) ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'rest-default' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message (string) is required' });
    }
    const result = await processMessage(sessionId, message);
    res.json(result);
  } catch (err) {
    console.error('[api/chat] error:', err);
    res.status(500).json({ error: 'Something went wrong generating a reply.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConnected: isAiConnected(),
    plan: PLAN.name,
    usage: getMonthlyUsage(),
  });
});

// --- Real-time chat via Socket.IO ---
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id} (plan: ${PLAN.name})`);

  socket.on('chat:message', async (payload) => {
    const message = typeof payload === 'string' ? payload : payload?.message;
    if (!message || !message.trim()) return;

    socket.emit('chat:typing', true);
    try {
      const result = await processMessage(socket.id, message);
      socket.emit('chat:typing', false);
      socket.emit('chat:reply', result);
    } catch (err) {
      console.error('[socket chat:message] error:', err);
      socket.emit('chat:typing', false);
      socket.emit('chat:error', { error: 'Something went wrong generating a reply.' });
    }
  });

  socket.on('chat:confirm_action', ({ actionId, confirmed }) => {
    const actionsForSocket = pendingActions.get(socket.id);
    const action = actionsForSocket?.get(actionId);

    if (!action) {
      socket.emit('chat:reply', { text: "That request has expired — let's try again." });
      return;
    }
    actionsForSocket.delete(actionId);

    if (!confirmed) {
      socket.emit('chat:reply', { text: 'No problem — let me know if you change your mind.' });
      return;
    }

    const outcome = finalizeConfirmedAction(action.type, action.args);
    socket.emit('chat:reply', {
      text: outcome.message,
      receipt: outcome.ok ? outcome.receipt : undefined,
    });
  });

  socket.on('disconnect', () => {
    sessions.delete(socket.id);
    pendingActions.delete(socket.id);
    clearUser(socket.id);
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Trailhead AI backend running on http://localhost:${PORT}`);
  console.log(`Active plan: ${PLAN.name} (${PLAN.conversationsPerMonth} conversations/mo, ${PLAN.maxMessagesPerMinutePerUser}/min per user, ${PLAN.maxRequestsPerMinuteGlobal}/min platform-wide)`);
  if (!isAiConnected()) {
    console.warn(
      '⚠️  No GROQ_API_KEY set in .env — replies will use a placeholder until you add one.\n' +
      '   Get a free key: https://console.groq.com/keys'
    );
  }
});
