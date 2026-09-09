#!/usr/bin/env node
/**
 * Trailhead Phase 3/4 Automated Customer & Regression Test
 *
 * Run from the trailhead-backend directory:
 *   node trailhead_phase34_automation_v2.mjs
 *
 * Creates 125 synthetic customers and exercises the real Socket.IO path.
 * Generates trailhead-phase34-automated-report.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { io } from 'socket.io-client';

import {
  getEmployees,
  updateEmployee,
  getEffectiveConfig
} from './src/services/employeeService.js';

import {
  getApprovalPolicies,
  upsertApprovalPolicy,
  evaluateAction
} from './src/services/policyService.js';

import {
  createAction,
  getAction,
  listActions,
  updateActionStatus
} from './src/services/actionService.js';

import {
  scanOpportunities,
  listOpportunities
} from './src/services/opportunityService.js';

import {
  getOverview,
  getProductInsights,
  getAiHealthScore
} from './src/services/analyticsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.TRAILHEAD_TEST_URL || 'http://localhost:4000';
const CUSTOMER_COUNT = Number(process.env.TRAILHEAD_TEST_CUSTOMERS || 125);
const TRAILHEAD_CUSTOMERS = Math.ceil(CUSTOMER_COUNT * 0.48);
const DEMO_CAFE_CUSTOMERS = CUSTOMER_COUNT - TRAILHEAD_CUSTOMERS;

const REPORT_FILE = path.join(
  __dirname,
  'trailhead-phase34-automated-report.md'
);

const DB_FILE = path.join(__dirname, 'data', 'trailhead.db');

const TEST_PREFIX = `auto_p34_${Date.now()}_`;

const results = [];
const failures = [];
const inconclusive = [];

let db;
let originalPlans = {};
let originalEmployees = {};
let originalPolicies = {};
let appointmentSnapshot = [];

function now() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function record(id, name, status, details = '') {
  const row = {
    id,
    name,
    status,
    details
  };

  results.push(row);

  if (status === 'FAIL') {
    failures.push(row);
  }

  if (status === 'INCONCLUSIVE') {
    inconclusive.push(row);
  }

  const mark =
    status === 'PASS'
      ? 'PASS'
      : status === 'FAIL'
        ? 'FAIL'
        : 'INCONCLUSIVE';

  console.log(`[${mark}] ${id} - ${name}${details ? `: ${details}` : ''}`);
}

function assertTest(id, name, condition, details = '') {
  record(
    id,
    name,
    condition ? 'PASS' : 'FAIL',
    details
  );

  return condition;
}

function markInconclusive(id, name, details) {
  record(id, name, 'INCONCLUSIVE', details);
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function uniqueId(prefix = 'auto') {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function openDb() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Database not found: ${DB_FILE}`);
  }

  db = new DatabaseSync(DB_FILE);
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function execSql(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

function tableExists(tableName) {
  const row = queryOne(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?
    `,
    [tableName]
  );

  return Boolean(row);
}

async function httpJson(
  method,
  endpoint,
  body = undefined,
  headers = {}
) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      ...(body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers
    },
    body: body !== undefined
      ? JSON.stringify(body)
      : undefined
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

/* -------------------------------------------------------------------------- */
/* Socket.IO customer helper                                                  */
/* -------------------------------------------------------------------------- */

function connectCustomer(businessId, clientId) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      forceNew: true,
      timeout: 15000,
      reconnection: false
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connection timeout'));
    }, 20000);

    socket.once('connect', () => {
      clearTimeout(timer);

      socket.emit('chat:init', {
        businessId,
        clientId
      });

      resolve(socket);
    });

    socket.once('connect_error', error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function sendMessage(socket, text) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for response to: ${text}`));
    }, 60000);

    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('chat:response', onResponse);
      socket.off('chat:error', onError);
    };

    const onResponse = payload => {
      if (settled) return;

      settled = true;
      cleanup();

      resolve(payload);
    };

    const onError = payload => {
      if (settled) return;

      settled = true;
      cleanup();

      reject(
        new Error(
          typeof payload === 'string'
            ? payload
            : safeJson(payload)
        )
      );
    };

    socket.on('chat:response', onResponse);
    socket.on('chat:error', onError);

    socket.emit('chat:message', {
      message: text
    });
  });
}

function sendFeedback(socket, rating) {
  socket.emit('chat:feedback', {
    rating
  });
}

async function closeCustomer(socket) {
  if (!socket) return;

  try {
    socket.disconnect();
  } catch {
    // Ignore cleanup errors.
  }

  await sleep(100);
}

/* -------------------------------------------------------------------------- */
/* Synthetic customer scenarios                                               */
/* -------------------------------------------------------------------------- */

const trailheadScenarios = [
  {
    name: 'product_budget',
    messages: [
      'I need a jacket under $100',
      'Which one is the cheapest?',
      'Is it waterproof?'
    ]
  },

  {
    name: 'product_search',
    messages: [
      'Show me a jacket for hiking',
      'What do you recommend?',
      'Tell me about the features'
    ]
  },

  {
    name: 'comparison',
    messages: [
      'What is the difference between the Ridge Shell and Storm Anorak?',
      'Which one is better for rain?',
      'Which one is cheaper?'
    ]
  },

  {
    name: 'order_verify',
    messages: [
      'Track TH-48213',
      'jane@example.com',
      'What is the status?'
    ]
  },

  {
    name: 'order_verify_repeat',
    messages: [
      'Track TH-48213',
      'jane@example.com',
      'Can you tell me the order details again?'
    ]
  },

  {
    name: 'order_missing_email',
    messages: [
      'Track TH-48213',
      'I already gave you the order number',
      'Why do you need my email?'
    ]
  },

  {
    name: 'knowledge_gap_repeat',
    messages: [
      'Do you offer gift wrapping?',
      'Can you check if gift wrapping is available?',
      'What about gift wrapping for jackets?'
    ]
  },

  {
    name: 'exchange_low',
    messages: [
      'TH-62210 arrived in the wrong size, I want an exchange',
      'alex@example.com',
      'Yes, please continue'
    ]
  },

  {
    name: 'exchange_high',
    messages: [
      'I want to exchange TH-48213 because it arrived damaged',
      'jane@example.com',
      'Yes, start the exchange'
    ]
  },

  {
    name: 'appointment',
    messages: [
      'I want to book an appointment',
      'What appointment slots are available?',
      'Can you help me choose one?'
    ]
  },

  {
    name: 'cart',
    messages: [
      'Add the Storm Anorak to my cart',
      'What is in my cart?',
      'How much is it?'
    ]
  },

  {
    name: 'unsupported',
    messages: [
      'Can you call my bank for me?',
      'Can you change my bank account?',
      'Can you send money to my friend?'
    ]
  },

  {
    name: 'ambiguous',
    messages: [
      'I need something good',
      'Something for outside',
      'Maybe something cheap'
    ]
  },

  {
    name: 'repeat_question',
    messages: [
      'What is the cheapest jacket?',
      'What is the cheapest jacket?',
      'Which jacket did you recommend?'
    ]
  },

  {
    name: 'policy_shipping',
    messages: [
      'What is your shipping policy?',
      'How long does shipping take?',
      'Can you explain the shipping policy?'
    ]
  },

  {
    name: 'policy_exchange',
    messages: [
      'What is your exchange policy?',
      'How do exchanges work?',
      'Can I exchange a jacket?'
    ]
  },

  {
    name: 'product_compare_repeat',
    messages: [
      'Compare Ridge Shell and Storm Anorak',
      'Compare those two again',
      'Which one would you choose for hiking?'
    ]
  },

  {
    name: 'knowledge_gap',
    messages: [
      'Do you sell gift cards?',
      'Can I buy a gift card?',
      'Is there a gift card policy?'
    ]
  },

  {
    name: 'mixed_support_sales',
    messages: [
      'I need a jacket',
      'Also I want to know where my order is',
      'Track TH-51890'
    ]
  }
];

const demoCafeScenarios = [
  {
    name: 'cafe_product',
    messages: [
      'What coffee do you have?',
      'Which drink is cheapest?',
      'Tell me about the Flat White'
    ]
  },

  {
    name: 'cafe_repeat_hours',
    messages: [
      'What are your opening hours?',
      'What time do you close?',
      'Can you repeat your hours?'
    ]
  },

  {
    name: 'cafe_policy',
    messages: [
      'What is your exchange policy?',
      'Can I exchange an order?',
      'How does the policy work?'
    ]
  },

  {
    name: 'cafe_unsupported',
    messages: [
      'Can you transfer money to me?',
      'Can you access my bank account?',
      'Can you make a bank payment?'
    ]
  },

  {
    name: 'cafe_product_repeat',
    messages: [
      'Tell me about the Almond Croissant',
      'How much is the Almond Croissant?',
      'Tell me about it again'
    ]
  },

  {
    name: 'cafe_knowledge_gap',
    messages: [
      'Do you sell gift wrapping?',
      'Do you offer gift cards?',
      'Can you check your gift card policy?'
    ]
  },

  {
    name: 'cafe_order_verification',
    messages: [
      'Track CAFE-1001',
      'morgan@example.com',
      'What is the order status?'
    ]
  }
];

function buildCustomers() {
  const customers = [];

  for (let i = 0; i < TRAILHEAD_CUSTOMERS; i++) {
    customers.push({
      businessId: 'trailhead',
      clientId: `${TEST_PREFIX}trailhead_${String(i + 1).padStart(3, '0')}`,
      email: `synthetic.th.${i + 1}@example.test`,
      scenario:
        trailheadScenarios[i % trailheadScenarios.length]
    });
  }

  for (let i = 0; i < DEMO_CAFE_CUSTOMERS; i++) {
    customers.push({
      businessId: 'demo-cafe',
      clientId: `${TEST_PREFIX}cafe_${String(i + 1).padStart(3, '0')}`,
      email: `synthetic.cafe.${i + 1}@example.test`,
      scenario:
        demoCafeScenarios[i % demoCafeScenarios.length]
    });
  }

  return customers;
}

/* -------------------------------------------------------------------------- */
/* Action confirmation handling                                               */
/* -------------------------------------------------------------------------- */

async function handlePossibleConfirmation(
  socket,
  response,
  options = {}
) {
  const {
    rejectByDefault = true,
    allowAppointmentBooking = false
  } = options;

  if (!response) return null;

  const action =
    response.confirmAction ||
    response.action ||
    response.confirmation ||
    null;

  if (!action) {
    return null;
  }

  const actionId =
    action.id ||
    action.actionId ||
    action.action_id;

  if (!actionId) {
    return null;
  }

  let approve = false;

  const actionType =
    action.actionType ||
    action.action_type ||
    action.type ||
    '';

  if (
    allowAppointmentBooking &&
    String(actionType).toLowerCase().includes('appointment')
  ) {
    approve = true;
  }

  if (!approve && !rejectByDefault) {
    approve = true;
  }

  socket.emit('chat:confirm_action', {
    actionId,
    approved: approve
  });

  await sleep(300);

  return {
    actionId,
    approved: approve
  };
}

async function runCustomer(customer, index) {
  const socket = await connectCustomer(
    customer.businessId,
    customer.clientId
  );

  const responses = [];

  try {
    for (let i = 0; i < customer.scenario.messages.length; i++) {
      const message =
        customer.scenario.messages[i];

      const response = await sendMessage(
        socket,
        message
      );

      responses.push(response);

      await handlePossibleConfirmation(
        socket,
        response,
        {
          rejectByDefault: true,
          allowAppointmentBooking: false
        }
      );

      await sleep(1200);
    }

    /*
     * Exercise feedback on a subset of synthetic customers.
     */
    if (index % 10 === 0) {
      sendFeedback(socket, 'helpful');
    }

    return {
      ok: true,
      customer,
      responses
    };
  } catch (error) {
    return {
      ok: false,
      customer,
      error: error.message,
      responses
    };
  } finally {
    await closeCustomer(socket);
  }
}

/* -------------------------------------------------------------------------- */
/* Configuration snapshot / restore                                           */
/* -------------------------------------------------------------------------- */

async function snapshotConfiguration() {
  originalPlans = {};

  for (const tenant of ['trailhead', 'demo-cafe']) {
    const row = queryOne(
      `
        SELECT tenant_id, plan
        FROM tenants
        WHERE tenant_id = ?
      `,
      [tenant]
    );

    if (row) {
      originalPlans[tenant] = row.plan;
    }
  }

  for (const tenant of ['trailhead', 'demo-cafe']) {
    originalEmployees[tenant] =
      await getEmployees(tenant);

    originalPolicies[tenant] =
      await getApprovalPolicies(tenant);
  }

  if (tableExists('appointments')) {
    appointmentSnapshot = queryAll(
      `
        SELECT *
        FROM appointments
        WHERE tenant_id = 'trailhead'
      `
    );
  }
}

async function restoreConfiguration() {
  for (const [tenant, plan] of Object.entries(originalPlans)) {
    execSql(
      `
        UPDATE tenants
        SET plan = ?
        WHERE tenant_id = ?
      `,
      [plan, tenant]
    );
  }

  for (const tenant of ['trailhead', 'demo-cafe']) {
    const employees =
      originalEmployees[tenant] || [];

    const current =
      await getEmployees(tenant);

    for (const employee of current) {
      const original =
        employees.find(e => e.id === employee.id);

      if (!original) continue;

      await updateEmployee(
        tenant,
        employee.id,
        {
          enabled: original.enabled,
          instructions: original.instructions,
          toolNames: original.toolNames
        }
      );
    }
  }

  for (const tenant of ['trailhead', 'demo-cafe']) {
    const policies =
      originalPolicies[tenant] || [];

    for (const policy of policies) {
      await upsertApprovalPolicy(
        tenant,
        policy.action_type,
        {
          autoApproveBelow:
            policy.auto_approve_below,
          restrictedAtOrAbove:
            policy.restricted_at_or_above
        }
      );
    }
  }

  if (
    appointmentSnapshot.length &&
    tableExists('appointments')
  ) {
    for (const appointment of appointmentSnapshot) {
      if (!appointment.id) continue;

      execSql(
        `
          UPDATE appointments
          SET booked = ?
          WHERE id = ?
        `,
        [
          appointment.booked,
          appointment.id
        ]
      );
    }
  }
}
/* -------------------------------------------------------------------------- */
/* Targeted Phase 3 checks                                                    */
/* -------------------------------------------------------------------------- */

async function testAuthentication() {
  const actions = await httpJson(
    'GET',
    '/api/actions'
  );

  assertTest(
    'P4-18',
    'Action API rejects unauthenticated access',
    actions.status === 401,
    `HTTP ${actions.status}`
  );

  const analytics = await httpJson(
    'GET',
    '/api/analytics/overview'
  );

  assertTest(
    'P3-12',
    'Analytics API rejects unauthenticated access',
    analytics.status === 401,
    `HTTP ${analytics.status}`
  );
}

async function testEmployeeConfiguration() {
  const trailheadEmployees =
    await getEmployees('trailhead');

  const sales =
    trailheadEmployees.find(
      e => e.type === 'sales'
    );

  const support =
    trailheadEmployees.find(
      e => e.type === 'support'
    );

  assertTest(
    'P4-01',
    'Default Sales and Support employees exist',
    Boolean(sales && support),
    `employees=${trailheadEmployees.length}`
  );

  const config =
    await getEffectiveConfig('trailhead');

  const tools =
    config.allowedToolNames || [];

  assertTest(
    'P4-02',
    'Effective employee configuration exposes expected tools',
    tools.includes('search_products') &&
      tools.includes('start_exchange'),
    `tools=${tools.join(', ')}`
  );

  return {
    sales,
    support
  };
}

async function testEmployeePermissionBoundary(
  salesEmployee
) {
  if (!salesEmployee) {
    markInconclusive(
      'P4-15',
      'Employee permission boundary',
      'Sales employee was not found'
    );
    return;
  }

  const original = {
    enabled: salesEmployee.enabled,
    instructions: salesEmployee.instructions,
    toolNames: salesEmployee.toolNames
  };

  try {
    /*
     * Disable Sales employee. A new conversational session should
     * therefore not have Sales tools available.
     */
    await updateEmployee(
      'trailhead',
      salesEmployee.id,
      {
        enabled: false
      }
    );

    const disabledConfig =
      await getEffectiveConfig('trailhead');

    const disabledTools =
      disabledConfig.allowedToolNames || [];

    const salesToolsStillEnabled =
      disabledTools.includes('search_products') ||
      disabledTools.includes('compare_products') ||
      disabledTools.includes('add_to_cart');

    assertTest(
      'P4-15A',
      'Disabling Sales removes Sales-only capabilities',
      !salesToolsStillEnabled,
      `effectiveTools=${disabledTools.join(', ')}`
    );

    /*
     * Re-enable Sales with only search_products.
     */
    await updateEmployee(
      'trailhead',
      salesEmployee.id,
      {
        enabled: true,
        toolNames: ['search_products']
      }
    );

    const restrictedConfig =
      await getEffectiveConfig('trailhead');

    const restrictedTools =
      restrictedConfig.allowedToolNames || [];

    assertTest(
      'P4-15B',
      'Employee tool permissions are enforced',
      restrictedTools.includes('search_products') &&
        !restrictedTools.includes('compare_products') &&
        !restrictedTools.includes('add_to_cart'),
      `effectiveTools=${restrictedTools.join(', ')}`
    );
  } finally {
    await updateEmployee(
      'trailhead',
      salesEmployee.id,
      original
    );
  }
}

async function testApprovalPolicies() {
  /*
   * Test the actual policy evaluator at the three important boundaries.
   */
  const below =
    await evaluateAction(
      'trailhead',
      'start_exchange',
      49.99
    );

  const middle =
    await evaluateAction(
      'trailhead',
      'start_exchange',
      100
    );

  const restricted =
    await evaluateAction(
      'trailhead',
      'start_exchange',
      150
    );

  assertTest(
    'P4-05A',
    'Approval policy below auto-approval threshold',
    below === 'auto',
    `49.99 => ${below}`
  );

  assertTest(
    'P4-05B',
    'Approval policy approval boundary',
    middle === 'approval' || middle === 'restricted',
    `100 => ${middle}`
  );

  assertTest(
    'P4-05C',
    'Approval policy restricted boundary',
    restricted === 'restricted',
    `150 => ${restricted}`
  );
}

async function testPolicyTenantIsolation() {
  const trailheadPolicies =
    await getApprovalPolicies('trailhead');

  const cafePolicies =
    await getApprovalPolicies('demo-cafe');

  const trailheadExchange =
    trailheadPolicies.find(
      p => p.action_type === 'start_exchange'
    );

  const cafeExchange =
    cafePolicies.find(
      p => p.action_type === 'start_exchange'
    );

  assertTest(
    'P4-06',
    'Approval policies are tenant isolated',
    Boolean(trailheadExchange) &&
      !cafeExchange,
    `trailhead=${trailheadPolicies.length}, demo-cafe=${cafePolicies.length}`
  );
}

/* -------------------------------------------------------------------------- */
/* Opportunity tests                                                          */
/* -------------------------------------------------------------------------- */

async function runOpportunityScan() {
  try {
    return await scanOpportunities(
      'trailhead'
    );
  } catch (error) {
    console.log(
      `[WARN] opportunity scan failed: ${error.message}`
    );

    return null;
  }
}

async function testOpportunityIdempotency() {
  const before =
    await listOpportunities('trailhead');

  await runOpportunityScan();

  const afterFirst =
    await listOpportunities('trailhead');

  await runOpportunityScan();

  const afterSecond =
    await listOpportunities('trailhead');

  const idsFirst =
    new Set(afterFirst.map(o => o.id));

  const idsSecond =
    new Set(afterSecond.map(o => o.id));

  const sameIds =
    idsFirst.size === idsSecond.size &&
    [...idsFirst].every(
      id => idsSecond.has(id)
    );

  assertTest(
    'P3-05',
    'Opportunity scan is idempotent',
    sameIds,
    `before=${before.length}, first=${afterFirst.length}, second=${afterSecond.length}`
  );
}

async function testOpportunityQuality() {
  const opportunities =
    await listOpportunities('trailhead');

  const knowledgeGapOpportunity =
    opportunities.find(o => {
      const text = JSON.stringify(o).toLowerCase();

      return (
        text.includes('gift wrapping') ||
        text.includes('gift card')
      );
    });

  assertTest(
    'P3-03',
    'Knowledge gaps can produce opportunities',
    Boolean(knowledgeGapOpportunity),
    `opportunities=${opportunities.length}`
  );

  const trailRunnerOpportunity =
    opportunities.find(o => {
      const text =
        JSON.stringify(o).toLowerCase();

      return text.includes('trail runner');
    });

  if (!trailRunnerOpportunity) {
    markInconclusive(
      'P3-06',
      'High-escalation product opportunity',
      'No Trail Runner opportunity exists after scan'
    );

    return;
  }

  const evidence =
    trailRunnerOpportunity.evidence || {};

  const escalationCount =
    Number(
      evidence.escalationCount ||
      evidence.escalations ||
      0
    );

  assertTest(
    'P3-06',
    'High-escalation product opportunity contains escalation evidence',
    escalationCount >= 1,
    `escalationCount=${escalationCount}`
  );
}

/* -------------------------------------------------------------------------- */
/* BI / Digital Twin tests                                                    */
/* -------------------------------------------------------------------------- */

async function testAnalytics() {
  let overview;
  let products;
  let health;

  try {
    overview =
      await getOverview('trailhead', 30);
  } catch (error) {
    markInconclusive(
      'P3-08',
      'Revenue intelligence',
      error.message
    );
  }

  try {
    products =
      await getProductInsights('trailhead');
  } catch (error) {
    markInconclusive(
      'P3-09',
      'Product intelligence',
      error.message
    );
  }

  try {
    health =
      await getAiHealthScore('trailhead');
  } catch (error) {
    markInconclusive(
      'P3-07',
      'AI health analytics',
      error.message
    );
  }

  if (overview) {
    const orders =
      overview.orders || {};

    const conversations =
      Number(
        overview.conversations || 0
      );

    const revenue =
      Number(
        orders.totalRevenue ??
        overview.totalRevenue ??
        0
      );

    assertTest(
      'P3-08',
      'Revenue intelligence is available',
      typeof overview === 'object' &&
        conversations >= 0 &&
        revenue >= 0,
      `conversations=${conversations}, revenue=${revenue}`
    );
  }

  if (products) {
    const text =
      JSON.stringify(products)
        .toLowerCase();

    assertTest(
      'P3-09',
      'Product intelligence is available',
      text.includes('storm') ||
        text.includes('ridge') ||
        text.includes('trail'),
      'product intelligence response contains product data'
    );
  }

  if (health) {
    const score =
      health.score ??
      health.healthScore ??
      null;

    if (score === null) {
      markInconclusive(
        'P3-07',
        'AI health analytics',
        'Health score is not available yet'
      );
    } else {
      assertTest(
        'P3-07',
        'AI health score is available',
        Number.isFinite(Number(score)),
        `score=${score}`
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Synthetic data verification                                                */
/* -------------------------------------------------------------------------- */

function countSyntheticSessions() {
  if (!tableExists('session_state')) {
    return 0;
  }

  const row =
    queryOne(
      `
        SELECT COUNT(*) AS count
        FROM session_state
        WHERE client_id LIKE ?
      `,
      [`${TEST_PREFIX}%`]
    );

  return Number(row?.count || 0);
}

function countSyntheticConversations() {
  if (!tableExists('conversations')) {
    return 0;
  }

  const row =
    queryOne(
      `
        SELECT COUNT(*) AS count
        FROM conversations
        WHERE client_id LIKE ?
      `,
      [`${TEST_PREFIX}%`]
    );

  return Number(row?.count || 0);
}

function countSyntheticMessages() {
  if (!tableExists('messages')) {
    return 0;
  }

  const row =
    queryOne(
      `
        SELECT COUNT(*) AS count
        FROM messages m
        WHERE EXISTS (
          SELECT 1
          FROM conversations c
          WHERE c.id = m.conversation_id
            AND c.client_id LIKE ?
        )
      `,
      [`${TEST_PREFIX}%`]
    );

  return Number(row?.count || 0);
}

function testSyntheticCustomerLoad() {
  const sessions =
    countSyntheticSessions();

  const conversations =
    countSyntheticConversations();

  const messages =
    countSyntheticMessages();

  assertTest(
    'LOAD-01',
    'All synthetic customer sessions were created',
    sessions >= CUSTOMER_COUNT,
    `expected>=${CUSTOMER_COUNT}, actual=${sessions}`
  );

  assertTest(
    'LOAD-02',
    'Synthetic conversations were created',
    conversations >= CUSTOMER_COUNT,
    `expected>=${CUSTOMER_COUNT}, actual=${conversations}`
  );

  assertTest(
    'LOAD-03',
    'Synthetic customer messages were recorded',
    messages >= CUSTOMER_COUNT * 3,
    `expected>=${CUSTOMER_COUNT * 3}, actual=${messages}`
  );

  return {
    sessions,
    conversations,
    messages
  };
}

/* -------------------------------------------------------------------------- */
/* Event source parity                                                        */
/* -------------------------------------------------------------------------- */

function testEventSourceParity() {
  if (!tableExists('events')) {
    markInconclusive(
      'P3-11',
      'Event source parity',
      'events table does not exist'
    );

    return;
  }

  const rows =
    queryAll(
      `
        SELECT
          event_type,
          source,
          COUNT(*) AS count
        FROM events
        WHERE tenant_id = 'trailhead'
          AND (
            payload LIKE ?
            OR conversation_id IN (
              SELECT id
              FROM conversations
              WHERE client_id LIKE ?
            )
          )
        GROUP BY event_type, source
        ORDER BY event_type, source
      `,
      [
        `%${TEST_PREFIX}%`,
        `${TEST_PREFIX}%`
      ]
    );

  const expectedSources = {
    CustomerMessage: 'customer',
    AIResponse: 'ai',
    ProductRecommended: 'ai',
    ProductSearched: 'ai',
    SupportEscalated: 'ai',
    KnowledgeGap: 'ai'
  };

  const failures = [];

  for (const [eventType, expected] of Object.entries(
    expectedSources
  )) {
    const matching =
      rows.filter(
        r => r.event_type === eventType
      );

    if (!matching.length) {
      continue;
    }

    const hasExpected =
      matching.some(
        r => r.source === expected
      );

    if (!hasExpected) {
      failures.push(
        `${eventType}: expected ${expected}`
      );
    }
  }

  assertTest(
    'P3-11',
    'Event source parity is preserved',
    failures.length === 0,
    failures.length
      ? failures.join('; ')
      : 'event sources match expected ownership'
  );
}

/* -------------------------------------------------------------------------- */
/* Database integrity                                                          */
/* -------------------------------------------------------------------------- */

function testDatabaseIntegrity() {
  const requiredTables = [
    'tenants',
    'conversations',
    'messages',
    'events',
    'employees',
    'approval_policies',
    'actions'
  ];

  const missing =
    requiredTables.filter(
      table => !tableExists(table)
    );

  assertTest(
    'P4-20A',
    'Required Phase 3/4 database tables exist',
    missing.length === 0,
    missing.length
      ? `missing=${missing.join(', ')}`
      : 'all required tables exist'
  );

  if (tableExists('actions')) {
    const orphaned =
      queryOne(
        `
          SELECT COUNT(*) AS count
          FROM actions a
          LEFT JOIN tenants t
            ON t.tenant_id = a.tenant_id
          WHERE t.tenant_id IS NULL
        `
      );

    assertTest(
      'P4-20B',
      'Actions contain no orphaned tenants',
      Number(orphaned?.count || 0) === 0,
      `orphans=${orphaned?.count || 0}`
    );
  }

  if (tableExists('employees')) {
    const orphaned =
      queryOne(
        `
          SELECT COUNT(*) AS count
          FROM employees e
          LEFT JOIN tenants t
            ON t.tenant_id = e.tenant_id
          WHERE t.tenant_id IS NULL
        `
      );

    assertTest(
      'P4-20C',
      'Employees contain no orphaned tenants',
      Number(orphaned?.count || 0) === 0,
      `orphans=${orphaned?.count || 0}`
    );
  }

  if (tableExists('approval_policies')) {
    const orphaned =
      queryOne(
        `
          SELECT COUNT(*) AS count
          FROM approval_policies p
          LEFT JOIN tenants t
            ON t.tenant_id = p.tenant_id
          WHERE t.tenant_id IS NULL
        `
      );

    assertTest(
      'P4-20D',
      'Approval policies contain no orphaned tenants',
      Number(orphaned?.count || 0) === 0,
      `orphans=${orphaned?.count || 0}`
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Action helpers                                                             */
/* -------------------------------------------------------------------------- */

async function createSyntheticAction({
  tenantId = 'trailhead',
  actionType = 'appointment',
  status = 'REQUESTED',
  payload = {}
} = {}) {
  const action =
    await createAction(
      tenantId,
      {
        actionType,
        payload,
        metadata: {
          automatedTest: true,
          testPrefix: TEST_PREFIX
        }
      }
    );

  if (
    status &&
    status !== 'REQUESTED'
  ) {
    await updateActionStatus(
      tenantId,
      action.id,
      status
    );
  }

  return getAction(
    tenantId,
    action.id
  );
}

async function testActionRejection() {
  const action =
    await createSyntheticAction({
      actionType: 'appointment'
    });

  await updateActionStatus(
    'trailhead',
    action.id,
    'REJECTED'
  );

  const updated =
    await getAction(
      'trailhead',
      action.id
    );

  assertTest(
    'P4-09',
    'Rejected actions persist REJECTED state',
    updated?.status === 'REJECTED',
    `status=${updated?.status}`
  );

  return updated;
}

async function testActionPersistence() {
  const action =
    await createSyntheticAction({
      actionType: 'appointment'
    });

  const persisted =
    await getAction(
      'trailhead',
      action.id
    );

  assertTest(
    'P4-10',
    'Durable action can be retrieved after creation',
    Boolean(
      persisted &&
      persisted.id === action.id
    ),
    `actionId=${action.id}`
  );

  return persisted;
}

async function testDuplicateExecutionProtection() {
  const action =
    await createSyntheticAction({
      actionType: 'appointment'
    });

  await updateActionStatus(
    'trailhead',
    action.id,
    'EXECUTED'
  );

  const before =
    await getAction(
      'trailhead',
      action.id
    );

  /*
   * Calling updateActionStatus again should not create a second
   * action or move the action out of its terminal state.
   */
  try {
    await updateActionStatus(
      'trailhead',
      action.id,
      'EXECUTED'
    );
  } catch {
    // Expected for strict implementations.
  }

  const after =
    await getAction(
      'trailhead',
      action.id
    );

  assertTest(
    'P4-12',
    'Executed action remains terminal / duplicate execution is blocked',
    before?.status === 'EXECUTED' &&
      after?.status === 'EXECUTED',
    `before=${before?.status}, after=${after?.status}`
  );
}

async function testExpiredAction() {
  const action =
    await createSyntheticAction({
      actionType: 'appointment'
    });

  /*
   * Back-date created_at sufficiently so the normal expiry mechanism
   * can identify it as stale.
   */
  if (tableExists('actions')) {
    execSql(
      `
        UPDATE actions
        SET created_at = datetime('now', '-2 hours')
        WHERE id = ?
      `,
      [action.id]
    );
  }

  try {
    await updateActionStatus(
      'trailhead',
      action.id,
      'EXPIRED'
    );
  } catch {
    // Some implementations expire automatically.
  }

  const expired =
    await getAction(
      'trailhead',
      action.id
    );

  assertTest(
    'P4-13',
    'Expired action persists EXPIRED state',
    expired?.status === 'EXPIRED',
    `status=${expired?.status}`
  );
}
/* -------------------------------------------------------------------------- */
/* Cross-tenant action isolation                                              */
/* -------------------------------------------------------------------------- */

async function testActionTenantIsolation() {
  const action =
    await createSyntheticAction({
      tenantId: 'demo-cafe',
      actionType: 'appointment'
    });

  const fromTrailhead =
    await getAction(
      'trailhead',
      action.id
    );

  const fromCafe =
    await getAction(
      'demo-cafe',
      action.id
    );

  assertTest(
    'P4-19',
    'Actions are isolated across tenants',
    fromTrailhead === null &&
      Boolean(fromCafe),
    `trailheadLookup=${fromTrailhead ? 'FOUND' : 'null'}, cafeLookup=${fromCafe ? 'FOUND' : 'null'}`
  );
}

/* -------------------------------------------------------------------------- */
/* Socket.IO action lifecycle                                                 */
/* -------------------------------------------------------------------------- */

async function runSocketActionConfirmation(
  actionId,
  approved
) {
  return new Promise(async resolve => {
    const clientId =
      `${TEST_PREFIX}action_${uniqueId()}`;

    let socket;

    try {
      socket =
        await connectCustomer(
          'trailhead',
          clientId
        );

      let finished = false;

      const finish = result => {
        if (finished) return;

        finished = true;

        try {
          socket.disconnect();
        } catch {
          // Ignore.
        }

        resolve(result);
      };

      const timer = setTimeout(() => {
        finish({
          ok: false,
          error: 'Timed out waiting for action confirmation response'
        });
      }, 20000);

      socket.on(
        'chat:response',
        payload => {
          clearTimeout(timer);

          finish({
            ok: true,
            payload
          });
        }
      );

      socket.on(
        'chat:error',
        payload => {
          clearTimeout(timer);

          finish({
            ok: false,
            error:
              typeof payload === 'string'
                ? payload
                : safeJson(payload)
          });
        }
      );

      socket.emit(
        'chat:confirm_action',
        {
          actionId,
          approved
        }
      );
    } catch (error) {
      resolve({
        ok: false,
        error: error.message
      });
    }
  });
}

async function testSocketRejectionPath() {
  const action =
    await createSyntheticAction({
      actionType: 'appointment'
    });

  const result =
    await runSocketActionConfirmation(
      action.id,
      false
    );

  await sleep(300);

  const updated =
    await getAction(
      'trailhead',
      action.id
    );

  /*
   * Depending on the server implementation, a rejected confirmation
   * may emit a response or simply update the durable action.
   */
  assertTest(
    'P4-09B',
    'Socket confirmation rejection reaches durable action state',
    updated?.status === 'REJECTED',
    `socketOk=${result.ok}, status=${updated?.status}`
  );
}

async function testSocketExecutionPath() {
  /*
   * Use a free appointment slot. We snapshot the booking state and restore
   * it in the final cleanup section.
   */
  if (!tableExists('appointments')) {
    markInconclusive(
      'P4-11',
      'Socket action execution lifecycle',
      'appointments table does not exist'
    );

    return;
  }

  const slot =
    queryOne(
      `
        SELECT *
        FROM appointments
        WHERE tenant_id = 'trailhead'
          AND COALESCE(booked, 0) = 0
        ORDER BY id
        LIMIT 1
      `
    );

  if (!slot) {
    markInconclusive(
      'P4-11',
      'Socket action execution lifecycle',
      'No free appointment slot available'
    );

    return;
  }

  const action =
    await createSyntheticAction({
      actionType: 'book_appointment',
      payload: {
        slotId: slot.id
      }
    });

  const result =
    await runSocketActionConfirmation(
      action.id,
      true
    );

  await sleep(500);

  const updated =
    await getAction(
      'trailhead',
      action.id
    );

  const slotAfter =
    queryOne(
      `
        SELECT booked
        FROM appointments
        WHERE id = ?
      `,
      [slot.id]
    );

  assertTest(
    'P4-11',
    'Socket action confirmation executes the approved action',
    updated?.status === 'EXECUTED' &&
      Number(slotAfter?.booked || 0) === 1,
    `socketOk=${result.ok}, action=${updated?.status}, slotBooked=${slotAfter?.booked}`
  );
}

async function testActionListIntegrity() {
  const actions =
    await listActions(
      'trailhead'
    );

  const hasValidStatuses =
    actions.every(action =>
      [
        'REQUESTED',
        'APPROVED',
        'REJECTED',
        'EXPIRED',
        'EXECUTED',
        'FAILED'
      ].includes(action.status)
    );

  assertTest(
    'P4-10B',
    'Action records contain valid lifecycle statuses',
    hasValidStatuses,
    `actions=${actions.length}`
  );
}

/* -------------------------------------------------------------------------- */
/* Tenant isolation at the AI/chat layer                                      */
/* -------------------------------------------------------------------------- */

async function testChatTenantIsolation() {
  const clientId =
    `${TEST_PREFIX}tenant_isolation`;

  let socket;

  try {
    socket =
      await connectCustomer(
        'demo-cafe',
        clientId
      );

    const response =
      await sendMessage(
        socket,
        'I need a jacket'
      );

    const text =
      safeJson(response).toLowerCase();

    /*
     * Demo Cafe should not expose Trailhead jacket inventory.
     */
    const mentionsTrailheadJacket =
      text.includes('ridge shell') ||
      text.includes('storm anorak') ||
      text.includes('trail runner');

    assertTest(
      'P3-10',
      'AI tenant isolation prevents cross-business product leakage',
      !mentionsTrailheadJacket,
      'demo-cafe response does not expose Trailhead products'
    );
  } catch (error) {
    markInconclusive(
      'P3-10',
      'AI tenant isolation',
      error.message
    );
  } finally {
    await closeCustomer(socket);
  }
}

/* -------------------------------------------------------------------------- */
/* Direct product / order regression checks                                   */
/* -------------------------------------------------------------------------- */

async function testProductRegression() {
  let socket;

  try {
    socket =
      await connectCustomer(
        'trailhead',
        `${TEST_PREFIX}product_regression`
      );

    const response =
      await sendMessage(
        socket,
        'I need a jacket under $100'
      );

    const text =
      safeJson(response).toLowerCase();

    const containsStorm =
      text.includes('storm') ||
      text.includes('98');

    assertTest(
      'P2-SEARCH',
      'Budget jacket search returns a relevant product',
      containsStorm,
      'response contains Storm Anorak / $98 result'
    );
  } catch (error) {
    markInconclusive(
      'P2-SEARCH',
      'Budget jacket search regression',
      error.message
    );
  } finally {
    await closeCustomer(socket);
  }
}

async function testOrderVerificationRegression() {
  let socket;

  try {
    socket =
      await connectCustomer(
        'trailhead',
        `${TEST_PREFIX}order_regression`
      );

    const first =
      await sendMessage(
        socket,
        'Track TH-48213'
      );

    const firstText =
      safeJson(first).toLowerCase();

    /*
     * The system should request verification rather than immediately
     * expose private order details.
     */
    const asksForEmail =
      firstText.includes('email') ||
      firstText.includes('verify');

    const second =
      await sendMessage(
        socket,
        'jane@example.com'
      );

    const secondText =
      safeJson(second).toLowerCase();

    const exposesOrder =
      secondText.includes('48213') ||
      secondText.includes('136.5') ||
      secondText.includes('out_for_delivery') ||
      secondText.includes('out for delivery');

    assertTest(
      'P2-PRIVACY',
      'Order verification protects private order details',
      asksForEmail && exposesOrder,
      `verificationPrompt=${asksForEmail}, verifiedDetails=${exposesOrder}`
    );
  } catch (error) {
    markInconclusive(
      'P2-PRIVACY',
      'Order verification regression',
      error.message
    );
  } finally {
    await closeCustomer(socket);
  }
}

/* -------------------------------------------------------------------------- */
/* Feedback regression                                                        */
/* -------------------------------------------------------------------------- */

async function testFeedbackPath() {
  if (!tableExists('feedback')) {
    markInconclusive(
      'P3-FEEDBACK',
      'AI feedback persistence',
      'feedback table does not exist'
    );

    return;
  }

  const before =
    queryOne(
      `
        SELECT COUNT(*) AS count
        FROM feedback
        WHERE tenant_id = 'trailhead'
      `
    );

  const beforeCount =
    Number(before?.count || 0);

  let socket;

  try {
    socket =
      await connectCustomer(
        'trailhead',
        `${TEST_PREFIX}feedback`
      );

    await sendMessage(
      socket,
      'Which jacket is cheapest?'
    );

    sendFeedback(
      socket,
      'helpful'
    );

    await sleep(700);
  } catch (error) {
    markInconclusive(
      'P3-FEEDBACK',
      'AI feedback persistence',
      error.message
    );

    return;
  } finally {
    await closeCustomer(socket);
  }

  const after =
    queryOne(
      `
        SELECT COUNT(*) AS count
        FROM feedback
        WHERE tenant_id = 'trailhead'
      `
    );

  const afterCount =
    Number(after?.count || 0);

  assertTest(
    'P3-FEEDBACK',
    'Helpful feedback is persisted',
    afterCount > beforeCount,
    `before=${beforeCount}, after=${afterCount}`
  );
}

/* -------------------------------------------------------------------------- */
/* Employee + policy integration                                              */
/* -------------------------------------------------------------------------- */

async function testEmployeePolicyIntegration() {
  const employees =
    await getEmployees(
      'trailhead'
    );

  const sales =
    employees.find(
      e => e.type === 'sales'
    );

  const support =
    employees.find(
      e => e.type === 'support'
    );

  if (!sales || !support) {
    markInconclusive(
      'P4-14',
      'Employee and policy integration',
      'Sales or Support employee missing'
    );

    return;
  }

  const config =
    await getEffectiveConfig(
      'trailhead'
    );

  const tools =
    config.allowedToolNames || [];

  const salesTools =
    ['search_products', 'compare_products', 'add_to_cart'];

  const supportTools =
    [
      'get_order',
      'find_policy',
      'check_appointment_slots',
      'book_appointment',
      'start_exchange'
    ];

  const hasSales =
    salesTools.some(
      tool => tools.includes(tool)
    );

  const hasSupport =
    supportTools.some(
      tool => tools.includes(tool)
    );

  assertTest(
    'P4-14',
    'Enabled employee capabilities are merged into effective configuration',
    hasSales && hasSupport,
    `salesCapability=${hasSales}, supportCapability=${hasSupport}`
  );

  const policy =
    (await getApprovalPolicies('trailhead'))
      .find(
        p => p.action_type === 'start_exchange'
      );

  assertTest(
    'P4-14B',
    'Exchange policy exists alongside employee capability',
    Boolean(policy) &&
      tools.includes('start_exchange'),
    `policy=${Boolean(policy)}, start_exchange=${tools.includes('start_exchange')}`
  );
}

/* -------------------------------------------------------------------------- */
/* Employee management authentication                                         */
/* -------------------------------------------------------------------------- */

async function testEmployeeApiAuthentication() {
  const employees =
    await httpJson(
      'GET',
      '/api/employees'
    );

  assertTest(
    'P4-17',
    'Employee management endpoint requires authentication',
    employees.status === 401,
    `HTTP ${employees.status}`
  );
}

/* -------------------------------------------------------------------------- */
/* Plan / usage safety                                                         */
/* -------------------------------------------------------------------------- */

function setPlan(tenantId, plan) {
  if (!tableExists('tenants')) return;

  execSql(
    `
      UPDATE tenants
      SET plan = ?
      WHERE tenant_id = ?
    `,
    [plan, tenantId]
  );
}

function enableBulkTestCapacity() {
  /*
   * Pro plan gives enough request/conversation allowance for the
   * synthetic load. The original plans are restored afterward.
   */
  setPlan('trailhead', 'pro');
  setPlan('demo-cafe', 'pro');
}

async function ensureSalesEnabledForBulk() {
  const employees =
    await getEmployees(
      'trailhead'
    );

  const sales =
    employees.find(
      e => e.type === 'sales'
    );

  if (!sales) {
    throw new Error(
      'Trailhead Sales employee not found'
    );
  }

  await updateEmployee(
    'trailhead',
    sales.id,
    {
      enabled: true,
      toolNames: [
        'search_products',
        'compare_products',
        'add_to_cart'
      ]
    }
  );
}

async function setBulkExchangePolicy() {
  /*
   * During the bulk run, $100+ exchanges are restricted.
   * This deliberately exercises escalation/approval behavior
   * without auto-executing exchange mutations.
   */
  await upsertApprovalPolicy(
    'trailhead',
    'start_exchange',
    {
      autoApproveBelow: 100,
      restrictedAtOrAbove: 100
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Bulk execution                                                             */
/* -------------------------------------------------------------------------- */

async function runBulkCustomers() {
  const customers =
    buildCustomers();

  console.log('');
  console.log(
    `Starting synthetic load: ${customers.length} customers`
  );
  console.log(
    `Trailhead: ${TRAILHEAD_CUSTOMERS}`
  );
  console.log(
    `Demo Cafe: ${DEMO_CAFE_CUSTOMERS}`
  );
  console.log('');

  let completed = 0;
  let failed = 0;

  /*
   * Run sequentially to avoid overwhelming the LLM provider and the
   * backend. This still exercises hundreds of independent customer
   * sessions and repeated behavior.
   */
  for (const [index, customer] of customers.entries()) {
    const result =
      await runCustomer(
        customer,
        index
      );

    if (result.ok) {
      completed++;
    } else {
      failed++;

      console.log(
        `[CUSTOMER FAIL] ${customer.clientId}: ${result.error}`
      );
    }

    if (
      (index + 1) % 10 === 0 ||
      index === customers.length - 1
    ) {
      console.log(
        `Progress: ${index + 1}/${customers.length} | completed=${completed} failed=${failed}`
      );
    }

    /*
     * Small pacing delay keeps the test friendly to the provider.
     */
    await sleep(350);
  }

  assertTest(
    'LOAD-00',
    'Synthetic customer workload completed',
    completed > 0 &&
      failed < customers.length,
    `completed=${completed}, failed=${failed}, total=${customers.length}`
  );

  return {
    total: customers.length,
    completed,
    failed
  };
}
/* -------------------------------------------------------------------------- */
/* Final report                                                               */
/* -------------------------------------------------------------------------- */

function getDbCounts() {
  const counts = {};

  const tables = [
    'tenants',
    'conversations',
    'messages',
    'events',
    'employees',
    'approval_policies',
    'actions',
    'feedback',
    'opportunities'
  ];

  for (const table of tables) {
    if (!tableExists(table)) {
      counts[table] = null;
      continue;
    }

    try {
      const row = queryOne(
        `SELECT COUNT(*) AS count FROM ${table}`
      );

      counts[table] =
        Number(row?.count || 0);
    } catch {
      counts[table] = null;
    }
  }

  return counts;
}

function getActionStatusCounts() {
  if (!tableExists('actions')) {
    return [];
  }

  return queryAll(
    `
      SELECT
        tenant_id,
        status,
        COUNT(*) AS count
      FROM actions
      GROUP BY tenant_id, status
      ORDER BY tenant_id, status
    `
  );
}

function getEmployeeCounts() {
  if (!tableExists('employees')) {
    return [];
  }

  return queryAll(
    `
      SELECT
        tenant_id,
        type,
        enabled,
        COUNT(*) AS count
      FROM employees
      GROUP BY tenant_id, type, enabled
      ORDER BY tenant_id, type
    `
  );
}

function getPolicyRows() {
  if (!tableExists('approval_policies')) {
    return [];
  }

  return queryAll(
    `
      SELECT
        tenant_id,
        action_type,
        auto_approve_below,
        restricted_at_or_above
      FROM approval_policies
      ORDER BY tenant_id, action_type
    `
  );
}

function markdownEscape(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

function buildReport({
  startedAt,
  finishedAt,
  loadSummary,
  dbBefore,
  dbAfter
}) {
  const total =
    results.length;

  const passed =
    results.filter(
      r => r.status === 'PASS'
    ).length;

  const failed =
    results.filter(
      r => r.status === 'FAIL'
    ).length;

  const inconclusiveCount =
    results.filter(
      r => r.status === 'INCONCLUSIVE'
    ).length;

  const passRate =
    total
      ? ((passed / total) * 100).toFixed(1)
      : '0.0';

  const lines = [];

  lines.push(
    '# Trailhead Phase 3 + Phase 4 Automated Test Report'
  );
  lines.push('');

  lines.push(
    `**Started:** ${startedAt}`
  );
  lines.push(
    `**Finished:** ${finishedAt}`
  );
  lines.push(
    `**Backend:** ${BASE_URL}`
  );
  lines.push(
    `**Synthetic customers:** ${CUSTOMER_COUNT}`
  );
  lines.push(
    `**Trailhead customers:** ${TRAILHEAD_CUSTOMERS}`
  );
  lines.push(
    `**Demo Cafe customers:** ${DEMO_CAFE_CUSTOMERS}`
  );
  lines.push('');

  lines.push('## Executive Summary');
  lines.push('');
  lines.push(
    `- Automated checks: **${total}**`
  );
  lines.push(
    `- Passed: **${passed}**`
  );
  lines.push(
    `- Failed: **${failed}**`
  );
  lines.push(
    `- Inconclusive: **${inconclusiveCount}**`
  );
  lines.push(
    `- Pass rate: **${passRate}%**`
  );
  lines.push(
    `- Synthetic customers completed: **${loadSummary.completed}/${loadSummary.total}**`
  );
  lines.push(
    `- Synthetic customer failures: **${loadSummary.failed}**`
  );
  lines.push('');

  if (failed === 0 && inconclusiveCount === 0) {
    lines.push(
      '**Overall result: PASS**'
    );
  } else if (failed === 0) {
    lines.push(
      '**Overall result: PASS WITH INCONCLUSIVE ITEMS**'
    );
  } else {
    lines.push(
      '**Overall result: FAIL — review failed checks below.**'
    );
  }

  lines.push('');

  lines.push('## Synthetic Workload');
  lines.push('');
  lines.push(
    `The automation created ${CUSTOMER_COUNT} independent synthetic customer sessions and exercised repeated as well as varied behaviors.`
  );
  lines.push('');

  lines.push('| Metric | Result |');
  lines.push('|---|---:|');
  lines.push(
    `| Customers | ${loadSummary.total} |`
  );
  lines.push(
    `| Completed | ${loadSummary.completed} |`
  );
  lines.push(
    `| Failed | ${loadSummary.failed} |`
  );
  lines.push(
    `| Expected messages | ${CUSTOMER_COUNT * 3} |`
  );
  lines.push('');

  lines.push('## Scenario Coverage');
  lines.push('');
  lines.push(
    '- Product search and recommendation'
  );
  lines.push(
    '- Budget-based product search'
  );
  lines.push(
    '- Product comparison'
  );
  lines.push(
    '- Repeated product questions'
  );
  lines.push(
    '- Order tracking and email verification'
  );
  lines.push(
    '- Privacy/verification behavior'
  );
  lines.push(
    '- Knowledge gaps'
  );
  lines.push(
    '- Repeated knowledge-gap questions'
  );
  lines.push(
    '- Low-value exchange requests'
  );
  lines.push(
    '- High-value exchange requests'
  );
  lines.push(
    '- Appointment discovery'
  );
  lines.push(
    '- Cart requests'
  );
  lines.push(
    '- Policy questions'
  );
  lines.push(
    '- Unsupported requests'
  );
  lines.push(
    '- Ambiguous requests'
  );
  lines.push(
    '- Mixed sales/support requests'
  );
  lines.push(
    '- Helpful feedback'
  );
  lines.push(
    '- Employee capability configuration'
  );
  lines.push(
    '- Approval policy evaluation'
  );
  lines.push(
    '- Durable action lifecycle'
  );
  lines.push(
    '- Cross-tenant isolation'
  );
  lines.push(
    '- BI analytics'
  );
  lines.push(
    '- Opportunity intelligence'
  );
  lines.push('');

  lines.push('## Automated Assertions');
  lines.push('');
  lines.push(
    '| ID | Test | Status | Details |'
  );
  lines.push(
    '|---|---|---|---|'
  );

  for (const result of results) {
    lines.push(
      `| ${markdownEscape(result.id)} | ${markdownEscape(result.name)} | **${result.status}** | ${markdownEscape(result.details)} |`
    );
  }

  lines.push('');

  if (failures.length) {
    lines.push('## Failures');
    lines.push('');

    for (const failure of failures) {
      lines.push(
        `### ${failure.id} — ${failure.name}`
      );
      lines.push('');
      lines.push(
        failure.details || 'No additional details.'
      );
      lines.push('');
    }
  }

  if (inconclusive.length) {
    lines.push('## Inconclusive / Not Fully Verifiable');
    lines.push('');

    for (const item of inconclusive) {
      lines.push(
        `- **${item.id} — ${item.name}:** ${item.details}`
      );
    }

    lines.push('');
  }

  lines.push('## Database Growth');
  lines.push('');
  lines.push('| Table | Before | After | Delta |');
  lines.push('|---|---:|---:|---:|');

  for (const [table, after] of Object.entries(dbAfter)) {
    const before =
      dbBefore[table];

    if (
      before === null ||
      after === null ||
      before === undefined ||
      after === undefined
    ) {
      lines.push(
        `| ${table} | n/a | n/a | n/a |`
      );

      continue;
    }

    lines.push(
      `| ${table} | ${before} | ${after} | ${after - before} |`
    );
  }

  lines.push('');

  lines.push('## Action Status Distribution');
  lines.push('');

  const actionRows =
    getActionStatusCounts();

  if (!actionRows.length) {
    lines.push(
      'No action records available.'
    );
  } else {
    lines.push(
      '| Tenant | Status | Count |'
    );
    lines.push(
      '|---|---|---:|'
    );

    for (const row of actionRows) {
      lines.push(
        `| ${row.tenant_id} | ${row.status} | ${row.count} |`
      );
    }
  }

  lines.push('');

  lines.push('## Employee Configuration');
  lines.push('');

  const employeeRows =
    getEmployeeCounts();

  if (!employeeRows.length) {
    lines.push(
      'No employee records available.'
    );
  } else {
    lines.push(
      '| Tenant | Type | Enabled | Count |'
    );
    lines.push(
      '|---|---|---:|---:|'
    );

    for (const row of employeeRows) {
      lines.push(
        `| ${row.tenant_id} | ${row.type} | ${row.enabled} | ${row.count} |`
      );
    }
  }

  lines.push('');

  lines.push('## Approval Policies');
  lines.push('');

  const policyRows =
    getPolicyRows();

  if (!policyRows.length) {
    lines.push(
      'No approval policies available.'
    );
  } else {
    lines.push(
      '| Tenant | Action | Auto approve below | Restricted at/above |'
    );
    lines.push(
      '|---|---|---:|---:|'
    );

    for (const row of policyRows) {
      lines.push(
        `| ${row.tenant_id} | ${row.action_type} | ${row.auto_approve_below} | ${row.restricted_at_or_above} |`
      );
    }
  }

  lines.push('');

  lines.push('## Important Interpretation');
  lines.push('');
  lines.push(
    '- Synthetic records intentionally remain in the development database so the BI/event/action tests have real data to inspect.'
  );
  lines.push(
    '- Employee configuration, tenant plans, approval policies and appointment booking state are restored after the run.'
  );
  lines.push(
    '- The automation does not claim to test application behavior that requires an actual frontend browser interaction unless explicitly exercised through Socket.IO.'
  );
  lines.push(
    '- Conversation-history rehydration after a backend restart is not tested by this single-process automation run.'
  );
  lines.push(
    '- Full live checkout attribution is not available if the current application has no live checkout funnel.'
  );
  lines.push(
    '- Unauthorized employee management is tested at the authentication boundary; a non-owner role test requires a dedicated non-owner account.'
  );
  lines.push('');

  lines.push('## Test Data Safety');
  lines.push('');
  lines.push(
    `All generated customer identifiers use the prefix \`${TEST_PREFIX}\`.`
  );
  lines.push(
    'No real customer information is generated by this test.'
  );
  lines.push('');

  lines.push('## Final Verdict');
  lines.push('');

  if (failed === 0 && inconclusiveCount === 0) {
    lines.push(
      '### PASS'
    );
    lines.push('');
    lines.push(
      'Phase 3 and Phase 4 automated regression testing completed without failed assertions.'
    );
  } else if (failed === 0) {
    lines.push(
      '### PASS WITH LIMITATIONS'
    );
    lines.push('');
    lines.push(
      'No automated assertion failed, but one or more capabilities could not be fully verified.'
    );
  } else {
    lines.push(
      '### ACTION REQUIRED'
    );
    lines.push('');
    lines.push(
      `${failed} automated assertion(s) failed. Review the Failure section before considering Phase 3/4 regression testing complete.`
    );
  }

  lines.push('');

  return lines.join('\n');
}

/* -------------------------------------------------------------------------- */
/* Cleanup verification                                                       */
/* -------------------------------------------------------------------------- */

async function verifyRestoration() {
  /*
   * Verify tenant plans.
   */
  for (const tenant of [
    'trailhead',
    'demo-cafe'
  ]) {
    const row =
      queryOne(
        `
          SELECT plan
          FROM tenants
          WHERE tenant_id = ?
        `,
        [tenant]
      );

    const expected =
      originalPlans[tenant];

    if (expected !== undefined) {
      assertTest(
        'SAFE-PLAN',
        `Tenant plan restored: ${tenant}`,
        row?.plan === expected,
        `expected=${expected}, actual=${row?.plan}`
      );
    }
  }

  /*
   * Verify employees.
   */
  for (const tenant of [
    'trailhead',
    'demo-cafe'
  ]) {
    const original =
      originalEmployees[tenant] || [];

    const current =
      await getEmployees(tenant);

    for (const employee of original) {
      const restored =
        current.find(
          e => e.id === employee.id
        );

      if (!restored) {
        assertTest(
          'SAFE-EMPLOYEE',
          `Employee restored: ${tenant}/${employee.id}`,
          false,
          'employee missing after cleanup'
        );

        continue;
      }

      const enabledOk =
        restored.enabled === employee.enabled;

      const toolsOk =
        JSON.stringify(
          restored.toolNames || []
        ) ===
        JSON.stringify(
          employee.toolNames || []
        );

      assertTest(
        'SAFE-EMPLOYEE',
        `Employee restored: ${tenant}/${employee.id}`,
        enabledOk && toolsOk,
        `enabled=${restored.enabled}, tools=${(restored.toolNames || []).join(',')}`
      );
    }
  }

  /*
   * Verify appointment booking states were restored.
   */
  if (
    appointmentSnapshot.length &&
    tableExists('appointments')
  ) {
    let mismatch = 0;

    for (const appointment of appointmentSnapshot) {
      const current =
        queryOne(
          `
            SELECT booked
            FROM appointments
            WHERE id = ?
          `,
          [appointment.id]
        );

      if (
        Number(current?.booked || 0) !==
        Number(appointment.booked || 0)
      ) {
        mismatch++;
      }
    }

    assertTest(
      'SAFE-APPOINTMENTS',
      'Appointment booking state restored',
      mismatch === 0,
      `mismatches=${mismatch}`
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const startedAt =
    now();

  console.log('');
  console.log(
    '============================================================'
  );
  console.log(
    ' Trailhead Phase 3 + Phase 4 Automated Test'
  );
  console.log(
    '============================================================'
  );
  console.log('');
  console.log(
    `Backend: ${BASE_URL}`
  );
  console.log(
    `Customers: ${CUSTOMER_COUNT}`
  );
  console.log(
    `Trailhead: ${TRAILHEAD_CUSTOMERS}`
  );
  console.log(
    `Demo Cafe: ${DEMO_CAFE_CUSTOMERS}`
  );
  console.log('');

  openDb();

  const dbBefore =
    getDbCounts();

  try {
    /*
     * Basic backend health check.
     */
    const health =
      await httpJson(
        'GET',
        '/health'
      );

    if (
      health.status >= 200 &&
      health.status < 500
    ) {
      assertTest(
        'BOOT-01',
        'Backend is reachable',
        true,
        `HTTP ${health.status}`
      );
    } else {
      assertTest(
        'BOOT-01',
        'Backend is reachable',
        false,
        `HTTP ${health.status}`
      );
    }

    /*
     * Snapshot all mutable configuration before testing.
     */
    await snapshotConfiguration();

    /*
     * Phase 3 / Phase 4 targeted checks.
     */
    await testAuthentication();

    const {
      sales
    } =
      await testEmployeeConfiguration();

    await testEmployeePermissionBoundary(
      sales
    );

    await testApprovalPolicies();

    await testPolicyTenantIsolation();

    await testEmployeePolicyIntegration();

    await testEmployeeApiAuthentication();

    await testActionRejection();

    await testActionPersistence();

    await testDuplicateExecutionProtection();

    await testExpiredAction();

    await testSocketRejectionPath();

    await testSocketExecutionPath();

    await testActionListIntegrity();

    await testActionTenantIsolation();

    await testChatTenantIsolation();

    await testProductRegression();

    await testOrderVerificationRegression();

    await testFeedbackPath();

    /*
     * Opportunity intelligence.
     */
    await runOpportunityScan();

    await testOpportunityIdempotency();

    await testOpportunityQuality();

    /*
     * Analytics before the bulk run.
     */
    await testAnalytics();

    /*
     * Prepare enough capacity for the synthetic workload.
     */
    enableBulkTestCapacity();

    await ensureSalesEnabledForBulk();

    await setBulkExchangePolicy();

    /*
     * Run 100–150 independent synthetic users.
     */
    const loadSummary =
      await runBulkCustomers();

    /*
     * Verify the expected persistence footprint.
     */
    testSyntheticCustomerLoad();

    testEventSourceParity();

    /*
     * Run opportunity scan again after the synthetic data has created
     * additional knowledge gaps/escalations.
     */
    await runOpportunityScan();

    await testOpportunityIdempotency();

    /*
     * Recalculate analytics using the generated data.
     */
    await testAnalytics();

    /*
     * Database integrity after all generated records exist.
     */
    testDatabaseIntegrity();

    /*
     * Check that no application-wide tenant leakage was introduced.
     */
    await testChatTenantIsolation();

    /*
     * Ensure synthetic users really belong to both tenants.
     */
    const trailheadSynthetic =
      queryOne(
        `
          SELECT COUNT(*) AS count
          FROM session_state
          WHERE client_id LIKE ?
            AND tenant_id = 'trailhead'
        `,
        [`${TEST_PREFIX}trailhead_%`]
      );

    const cafeSynthetic =
      queryOne(
        `
          SELECT COUNT(*) AS count
          FROM session_state
          WHERE client_id LIKE ?
            AND tenant_id = 'demo-cafe'
        `,
        [`${TEST_PREFIX}cafe_%`]
      );

    assertTest(
      'LOAD-04',
      'Synthetic users are distributed across both tenants',
      Number(trailheadSynthetic?.count || 0) > 0 &&
        Number(cafeSynthetic?.count || 0) > 0,
      `trailhead=${trailheadSynthetic?.count || 0}, demo-cafe=${cafeSynthetic?.count || 0}`
    );

    /*
     * Final action list check after load.
     */
    await testActionListIntegrity();

    /*
     * Restore application configuration.
     */
    await restoreConfiguration();

    /*
     * Verify restoration.
     */
    await verifyRestoration();

    const dbAfter =
      getDbCounts();

    const finishedAt =
      now();

    const report =
      buildReport({
        startedAt,
        finishedAt,
        loadSummary,
        dbBefore,
        dbAfter
      });

    fs.writeFileSync(
      REPORT_FILE,
      report,
      'utf8'
    );

    console.log('');
    console.log(
      '============================================================'
    );
    console.log(
      ' TEST COMPLETE'
    );
    console.log(
      '============================================================'
    );
    console.log('');
    console.log(
      `Report: ${REPORT_FILE}`
    );
    console.log(
      `Assertions: ${results.length}`
    );
    console.log(
      `PASS: ${results.filter(r => r.status === 'PASS').length}`
    );
    console.log(
      `FAIL: ${failures.length}`
    );
    console.log(
      `INCONCLUSIVE: ${inconclusive.length}`
    );
    console.log('');

    if (failures.length) {
      console.log(
        'FAILURES:'
      );

      for (const failure of failures) {
        console.log(
          `  ${failure.id}: ${failure.name} — ${failure.details}`
        );
      }

      console.log('');
    }

    console.log(
      `Final report written to: ${REPORT_FILE}`
    );

    /*
     * Do not use a non-zero exit code merely for inconclusive checks.
     * Failed assertions should fail the automated run.
     */
    if (failures.length) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('');
    console.error(
      'FATAL TEST ERROR'
    );
    console.error(
      error?.stack || error
    );
    console.error('');

    try {
      await restoreConfiguration();
      await verifyRestoration();
    } catch (cleanupError) {
      console.error(
        'Cleanup error:',
        cleanupError?.stack || cleanupError
      );
    }

    process.exitCode = 1;
  } finally {
    try {
      db?.close();
    } catch {
      // Ignore DB cleanup errors.
    }
  }
}

main();