import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { runMigration } from './src/db/migrate.js';

// Migration runs BEFORE anything else touches the DB — idempotent, safe
// to run on every startup (skips tenants that already exist).
runMigration();

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
import { recordEvent, getRecentEvents, countEventsByType } from './src/services/eventService.js';
import { getAuditLog } from './src/services/auditLogService.js';
import { getOrCreateConversation, recordMessage } from './src/services/conversationService.js';
import { recordFeedback, getFeedbackSummary } from './src/services/feedbackService.js';
import { getOverview, getProductInsights, getAiHealthScore } from './src/services/biService.js';
import { runOpportunityScan, listOpportunities, updateOpportunityStatus } from './src/services/opportunityService.js';
import { createAction, getAction, updateActionStatus, listActions } from './src/services/actionService.js';
import { listEmployees, updateEmployee } from './src/services/employeeService.js';
import { getPolicy, setPolicy, listPolicies } from './src/services/policyService.js';
import { requireAuth, requirePermission } from './src/middleware/auth.js';
import { authRouter } from './src/routes/auth.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
});

function pendingKey(businessId, clientId) {
  return `${businessId}:${clientId}`;
}

const MAX_HISTORY_MESSAGES = 12;
// Tracks which clientIds have already fired ConversationStarted this
// process lifetime — cheap in-memory dedup, fine for a single instance.
const seenConversations = new Set();

function appendHistory(session, role, content) {
  session.history.push({ role, content });
  session.history = session.history.slice(-MAX_HISTORY_MESSAGES);
}

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

  const convoKey = pendingKey(businessId, clientId);
  if (!seenConversations.has(convoKey)) {
    seenConversations.add(convoKey);
    recordEvent({ tenantId: businessId, eventType: 'ConversationStarted', customerId: clientId, source: 'customer' });
  }
  recordEvent({ tenantId: businessId, eventType: 'CustomerMessage', customerId: clientId, source: 'customer', metadata: { length: message.length } });

  const session = getSession(businessId, clientId);
  session.conversationId = getOrCreateConversation(businessId, clientId);

  const result = await handleMessage({ businessId, message, session });

  appendHistory(session, 'user', message);
  if (result.text) appendHistory(session, 'assistant', result.text);
  saveSession(businessId, clientId);

  recordMessage(businessId, session.conversationId, 'user', message);
  let assistantMessageId = null;
  if (result.text) {
    assistantMessageId = recordMessage(businessId, session.conversationId, 'assistant', result.text);
  }

  recordEvent({ tenantId: businessId, eventType: 'AIResponse', customerId: clientId, source: 'ai', metadata: { hasProducts: !!result.products, hasOrderCard: !!result.orderCard } });

  if (result.confirmAction) {
    // Persisted now (Phase 4) instead of an in-memory Map — a server
    // restart while a customer has a pending "Confirm booking?" card up
    // no longer silently loses that request with zero trace.
    const actionId = createAction(businessId, result.confirmAction.type, result.confirmAction, clientId);
    result.confirmAction = { ...result.confirmAction, actionId };
  }

  return { ...result, messageId: assistantMessageId };
}

// --- Auth ---
app.use('/api/auth', authRouter);

// --- REST fallback ---
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

// --- Protected admin endpoints (Phase 1: this is what real RBAC unlocks) ---
app.get('/api/escalations', requireAuth, requirePermission('escalations:read'), (req, res) => {
  const includeResolved = req.query.all === 'true';
  res.json(listEscalations(req.auth.tenantId, { includeResolved }));
});

app.post('/api/escalations/:id/resolve', requireAuth, requirePermission('escalations:resolve'), (req, res) => {
  const entry = resolveEscalation(req.auth.tenantId, req.params.id, req.auth.userId);
  if (!entry) return res.status(404).json({ error: 'Escalation not found.' });
  res.json(entry);
});

app.get('/api/events', requireAuth, requirePermission('events:read'), (req, res) => {
  res.json(getRecentEvents(req.auth.tenantId, { limit: Number(req.query.limit) || 100, eventType: req.query.type }));
});

app.get('/api/events/summary', requireAuth, requirePermission('events:read'), (req, res) => {
  res.json(countEventsByType(req.auth.tenantId, Number(req.query.days) || 30));
});

app.get('/api/audit-log', requireAuth, requirePermission('audit:read'), (req, res) => {
  res.json(getAuditLog(req.auth.tenantId, { limit: Number(req.query.limit) || 100 }));
});

app.get('/api/feedback/summary', requireAuth, requirePermission('events:read'), (req, res) => {
  res.json(getFeedbackSummary(req.auth.tenantId));
});

// --- Phase 3: Business Intelligence ---
app.get('/api/analytics/overview', requireAuth, requirePermission('analytics:read'), (req, res) => {
  res.json(getOverview(req.auth.tenantId, Number(req.query.days) || 30));
});

app.get('/api/analytics/products', requireAuth, requirePermission('analytics:read'), (req, res) => {
  res.json(getProductInsights(req.auth.tenantId, Number(req.query.days) || 30));
});

app.get('/api/analytics/ai-health', requireAuth, requirePermission('analytics:read'), (req, res) => {
  res.json(getAiHealthScore(req.auth.tenantId, Number(req.query.days) || 30));
});

app.get('/api/opportunities', requireAuth, requirePermission('analytics:read'), (req, res) => {
  res.json(listOpportunities(req.auth.tenantId, { status: req.query.status }));
});

app.post('/api/opportunities/scan', requireAuth, requirePermission('analytics:write'), (req, res) => {
  res.json(runOpportunityScan(req.auth.tenantId));
});

app.post('/api/opportunities/:id/status', requireAuth, requirePermission('analytics:write'), (req, res) => {
  const { status } = req.body;
  const result = updateOpportunityStatus(req.auth.tenantId, req.params.id, status);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

// --- Phase 4: AI Employees, Approval Policies, Action lifecycle ---
app.get('/api/employees', requireAuth, requirePermission('employees:read'), (req, res) => {
  res.json(listEmployees(req.auth.tenantId));
});

app.put('/api/employees/:id', requireAuth, requirePermission('employees:write'), (req, res) => {
  const result = updateEmployee(req.auth.tenantId, req.params.id, req.body);
  if (!result.ok) return res.status(404).json(result);
  res.json(result.employee);
});

app.get('/api/settings/approval-policies', requireAuth, requirePermission('settings:write'), (req, res) => {
  res.json(listPolicies(req.auth.tenantId));
});

app.put('/api/settings/approval-policies/:actionType', requireAuth, requirePermission('settings:write'), (req, res) => {
  const { autoApproveBelow, restrictedAtOrAbove } = req.body;
  const result = setPolicy(req.auth.tenantId, req.params.actionType, { autoApproveBelow, restrictedAtOrAbove });
  if (!result.ok) return res.status(400).json(result);
  res.json(getPolicy(req.auth.tenantId, req.params.actionType));
});

app.get('/api/actions', requireAuth, requirePermission('audit:read'), (req, res) => {
  res.json(listActions(req.auth.tenantId, { status: req.query.status }));
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
    const action = getAction(businessId, actionId);

    if (!action || action.status !== 'REQUESTED') {
      socket.emit('chat:reply', { text: "That request has expired — let's try again." });
      return;
    }

    if (!confirmed) {
      updateActionStatus(businessId, actionId, 'REJECTED');
      socket.emit('chat:reply', { text: 'No problem — let me know if you change your mind.' });
      return;
    }

    updateActionStatus(businessId, actionId, 'APPROVED');
    const outcome = finalizeConfirmedAction(businessId, action.payload.type, action.payload.args);
    updateActionStatus(businessId, actionId, outcome.ok ? 'EXECUTED' : 'FAILED');

    socket.emit('chat:reply', {
      text: outcome.message,
      receipt: outcome.ok ? outcome.receipt : undefined,
    });
  });

  socket.on('chat:feedback', ({ messageId, rating, correction }) => {
    if (!messageId || !['helpful', 'not_helpful'].includes(rating)) return;
    recordFeedback(businessId, { messageId, clientId, rating, correction });
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
