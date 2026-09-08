import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { handleMessage } from './src/orchestrator.js';
import { finalizeConfirmedAction } from './src/tools.js';
import { isAiConnected } from './src/llmProvider.js';
import { getPlanForBusiness } from './src/plans.js';
import { checkRateLimit } from './src/rateLimiter.js';
import { checkAndRecordConversation, getMonthlyUsage } from './src/usageTracker.js';
import { estimateRequestTokens } from './src/tokenEstimator.js';
import { listEscalations, resolveEscalation } from './src/escalationStore.js';
import { getSession, saveSession } from './src/sessionStore.js';
import { getBusiness, resolveBusinessId, listBusinesses } from './src/businessRegistry.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
});

// Pending confirmable actions: kept in-memory (not persisted), keyed by
// businessId then clientId, so two businesses can never see or clash with
// each other's pending confirmations even under key collision.
const pendingActions = new Map(); // `${businessId}:${clientId}` -> Map(actionId -> action)

function pendingKey(businessId, clientId) {
  return `${businessId}:${clientId}`;
}

const MAX_HISTORY_MESSAGES = 12;

function appendHistory(session, role, content) {
  session.history.push({ role, content });
  session.history = session.history.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * Four enforcement layers, checked in order, BEFORE the AI is ever
 * touched. The per-user rate-limit key includes businessId (defense in
 * depth against cross-business key collisions); the GLOBAL limit stays
 * businessId-agnostic on purpose — it protects the shared AI provider
 * quota across every business on the platform, not any one tenant's.
 */
function checkLimits(businessId, clientId, message) {
  const plan = getPlanForBusiness(businessId);

  if (message.length > plan.maxMessageChars) {
    return {
      blocked: true,
      text: `That message is a bit long for me to process — please keep it under ${plan.maxMessageChars} characters.`,
    };
  }

  const usage = checkAndRecordConversation(businessId, clientId, plan);
  if (usage.capped) {
    return {
      blocked: true,
      text: `You've reached this month's plan limit (${plan.conversationsPerMonth} conversations on the ${plan.name} plan). Upgrade to continue.`,
    };
  }

  const estimatedTokens = estimateRequestTokens(message);
  const rate = checkRateLimit(pendingKey(businessId, clientId), plan, estimatedTokens);
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

async function processMessage(businessId, clientId, message) {
  const limitCheck = checkLimits(businessId, clientId, message);
  if (limitCheck.blocked) {
    return { text: limitCheck.text, limitReached: true };
  }

  const session = getSession(businessId, clientId);
  const result = await handleMessage({ businessId, message, session });

  appendHistory(session, 'user', message);
  if (result.text) appendHistory(session, 'assistant', result.text);
  saveSession(businessId, clientId);

  if (result.confirmAction) {
    const actionId = crypto.randomUUID();
    const key = pendingKey(businessId, clientId);
    if (!pendingActions.has(key)) pendingActions.set(key, new Map());
    pendingActions.get(key).set(actionId, result.confirmAction);
    result.confirmAction = { ...result.confirmAction, actionId };
  }

  return result;
}

// --- REST fallback (useful for curl testing / non-socket clients) ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'rest-default', businessId: rawBusinessId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message (string) is required' });
    }
    const businessId = resolveBusinessId(rawBusinessId);
    const result = await processMessage(businessId, sessionId, message);
    res.json(result);
  } catch (err) {
    console.error('[api/chat] error:', err);
    res.status(500).json({ error: 'Something went wrong generating a reply.' });
  }
});

// Frontend calls this on load to configure itself: which cards to show,
// default theme, business display name — all server-owned config, so a
// business can change their setup without a frontend redeploy.
app.get('/api/business-config', (req, res) => {
  const businessId = resolveBusinessId(req.query.businessId);
  const business = getBusiness(businessId);
  res.json({
    id: business.id,
    name: business.name,
    defaultTheme: business.defaultTheme,
    enabledCardIds: business.enabledCardIds,
  });
});

app.get('/api/businesses', (req, res) => {
  res.json(listBusinesses().map((b) => ({ id: b.id, name: b.name })));
});

app.get('/api/health', (req, res) => {
  const businessId = resolveBusinessId(req.query.businessId);
  const plan = getPlanForBusiness(businessId);
  res.json({
    status: 'ok',
    aiConnected: isAiConnected(),
    businessId,
    plan: plan.name,
    usage: getMonthlyUsage(businessId),
  });
});

app.get('/api/escalations', (req, res) => {
  const businessId = resolveBusinessId(req.query.businessId);
  const includeResolved = req.query.all === 'true';
  res.json(listEscalations(businessId, { includeResolved }));
});

app.post('/api/escalations/:id/resolve', (req, res) => {
  const businessId = resolveBusinessId(req.query.businessId);
  const entry = resolveEscalation(businessId, req.params.id);
  if (!entry) return res.status(404).json({ error: 'Escalation not found.' });
  res.json(entry);
});

// --- Real-time chat via Socket.IO ---
io.on('connection', (socket) => {
  const clientId = socket.handshake.auth?.clientId || socket.id;
  const businessId = resolveBusinessId(socket.handshake.auth?.businessId);
  socket.data.clientId = clientId;
  socket.data.businessId = businessId;

  console.log(`[socket] connected: ${socket.id} (business: ${businessId}, client: ${clientId})`);

  socket.on('chat:message', async (payload) => {
    const message = typeof payload === 'string' ? payload : payload?.message;
    if (!message || !message.trim()) return;

    socket.emit('chat:typing', true);
    try {
      const result = await processMessage(businessId, clientId, message);
      socket.emit('chat:typing', false);
      socket.emit('chat:reply', result);
    } catch (err) {
      console.error('[socket chat:message] error:', err);
      socket.emit('chat:typing', false);
      socket.emit('chat:error', { error: 'Something went wrong generating a reply.' });
    }
  });

  socket.on('chat:confirm_action', ({ actionId, confirmed }) => {
    const key = pendingKey(businessId, clientId);
    const actionsForClient = pendingActions.get(key);
    const action = actionsForClient?.get(actionId);

    if (!action) {
      socket.emit('chat:reply', { text: "That request has expired — let's try again." });
      return;
    }
    actionsForClient.delete(actionId);

    if (!confirmed) {
      socket.emit('chat:reply', { text: 'No problem — let me know if you change your mind.' });
      return;
    }

    const outcome = finalizeConfirmedAction(businessId, action.type, action.args);
    socket.emit('chat:reply', {
      text: outcome.message,
      receipt: outcome.ok ? outcome.receipt : undefined,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id} (business: ${businessId}, client: ${clientId})`);
  });
});

server.listen(PORT, () => {
  console.log(`Trailhead AI backend running on http://localhost:${PORT}`);
  console.log(`Businesses configured: ${listBusinesses().map((b) => b.id).join(', ')}`);
  if (!isAiConnected()) {
    console.warn(
      '⚠️  No GROQ_API_KEY set in .env — replies will use a placeholder until you add one.\n' +
      '   Get a free key: https://console.groq.com/keys'
    );
  }
});
