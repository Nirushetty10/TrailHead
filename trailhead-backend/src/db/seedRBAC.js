import { db, generateId } from './connection.js';

// Two roles for Phase 1. Add more (e.g. 'analyst') later without
// touching any permission-check call sites — they just check permission
// NAMES, never role names directly.
const ROLES = ['owner', 'agent'];

const PERMISSIONS = [
  'escalations:read',
  'escalations:resolve',
  'orders:read',
  'products:read',
  'products:write',
  'events:read',
  'audit:read',
  'settings:write',
  'analytics:read',
  'analytics:write',
  'employees:read',
  'employees:write',
];

// owner gets everything; agent gets the day-to-day operational subset.
const AGENT_PERMISSIONS = ['escalations:read', 'escalations:resolve', 'orders:read', 'products:read'];

export function seedRBAC() {
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (id, name) VALUES (?, ?)');
  const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions (id, name) VALUES (?, ?)');
  const linkRolePermission = db.prepare(
    'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
  );
  const getRoleId = db.prepare('SELECT id FROM roles WHERE name = ?');
  const getPermissionId = db.prepare('SELECT id FROM permissions WHERE name = ?');

  for (const name of ROLES) {
    insertRole.run(generateId('role'), name);
  }
  for (const name of PERMISSIONS) {
    insertPermission.run(generateId('perm'), name);
  }

  const ownerRoleId = getRoleId.get('owner').id;
  const agentRoleId = getRoleId.get('agent').id;

  for (const permName of PERMISSIONS) {
    const permId = getPermissionId.get(permName).id;
    linkRolePermission.run(ownerRoleId, permId); // owner: everything
    if (AGENT_PERMISSIONS.includes(permName)) {
      linkRolePermission.run(agentRoleId, permId);
    }
  }
}

export function getRoleIdByName(name) {
  const row = db.prepare('SELECT id FROM roles WHERE name = ?').get(name);
  return row ? row.id : null;
}
