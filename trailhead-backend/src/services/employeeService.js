import { db, generateId } from '../db/connection.js';

// Practical integration choice: rather than a live multi-agent handoff
// (risky rewrite, and a single customer message often needs BOTH sales
// and support tools in the same turn — artificially splitting mid-
// conversation would hurt UX for no real benefit at our current scale),
// enabled employees' instructions and tool access are MERGED into one
// conversational agent. They're still real, independently manageable DB
// entities — an owner can disable Sales entirely, edit Support's
// instructions, etc — satisfying the doc's "AI Employee Manager"
// requirement without the complexity of a live employee-routing layer
// that isn't needed yet.

const DEFAULT_EMPLOYEES = [
  {
    type: 'sales',
    name: 'Sales Employee',
    instructions: 'Help customers discover, compare, and choose products. Recommend based on their stated needs and budget. Never invent prices, stock, or attributes.',
    toolNames: ['search_products', 'compare_products', 'add_to_cart'],
  },
  {
    type: 'support',
    name: 'Support Employee',
    instructions: 'Help customers with orders, policies, exchanges, and appointments. Verify identity before sharing order details. Escalate anything outside policy rather than guessing.',
    toolNames: ['get_order', 'find_policy', 'check_appointment_slots', 'book_appointment', 'start_exchange'],
  },
];

export function seedDefaultEmployees(tenantId) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM ai_employees WHERE tenant_id = ?').get(tenantId).c;
  if (existing > 0) return; // idempotent — don't reseed over an owner's edits

  for (const emp of DEFAULT_EMPLOYEES) {
    db.prepare(
      `INSERT INTO ai_employees (id, tenant_id, type, name, instructions, tool_names, enabled) VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(generateId('emp'), tenantId, emp.type, emp.name, emp.instructions, JSON.stringify(emp.toolNames));
  }
}

function rowToEmployee(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    instructions: row.instructions,
    toolNames: JSON.parse(row.tool_names),
    enabled: !!row.enabled,
  };
}

export function listEmployees(tenantId) {
  return db.prepare('SELECT * FROM ai_employees WHERE tenant_id = ?').all(tenantId).map(rowToEmployee);
}

export function getEnabledEmployees(tenantId) {
  return db.prepare('SELECT * FROM ai_employees WHERE tenant_id = ? AND enabled = 1').all(tenantId).map(rowToEmployee);
}

export function updateEmployee(tenantId, employeeId, updates) {
  const existing = db.prepare('SELECT * FROM ai_employees WHERE tenant_id = ? AND id = ?').get(tenantId, employeeId);
  if (!existing) return { ok: false, error: 'Employee not found.' };

  const next = {
    instructions: updates.instructions ?? existing.instructions,
    enabled: updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled,
    tool_names: updates.toolNames ? JSON.stringify(updates.toolNames) : existing.tool_names,
  };

  db.prepare('UPDATE ai_employees SET instructions = ?, enabled = ?, tool_names = ? WHERE id = ?')
    .run(next.instructions, next.enabled, next.tool_names, employeeId);

  return { ok: true, employee: rowToEmployee({ ...existing, ...next }) };
}

/**
 * What the orchestrator actually consumes: merged instructions text and
 * the union of tool names across every currently-enabled employee. If an
 * owner disables Sales entirely, search_products/compare_products/
 * add_to_cart simply stop being offered to the LLM.
 */
export function getEffectiveConfig(tenantId) {
  const enabled = getEnabledEmployees(tenantId);
  const toolNames = new Set();
  const instructionBlocks = [];

  for (const emp of enabled) {
    instructionBlocks.push(`[${emp.name}] ${emp.instructions}`);
    emp.toolNames.forEach((t) => toolNames.add(t));
  }

  return {
    combinedInstructions: instructionBlocks.join('\n'),
    allowedToolNames: [...toolNames],
    enabledEmployees: enabled.map((e) => e.name),
  };
}
