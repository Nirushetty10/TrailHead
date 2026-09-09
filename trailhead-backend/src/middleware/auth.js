import { verifyToken } from '../services/authService.js';
import { db } from '../db/connection.js';

/**
 * Verifies the JWT and attaches { userId, tenantId } to req.auth.
 * This is what finally closes the gap flagged earlier — /api/escalations
 * had zero auth before Phase 1.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.auth = { userId: payload.userId, tenantId: payload.tenantId };
  next();
}

/**
 * Checks the authenticated user's role(s) grant the named permission,
 * scoped to their own tenant — a user from tenant A can never satisfy
 * a permission check against tenant B's data, regardless of role.
 */
export function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const hasPermission = db
      .prepare(
        `SELECT 1 FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = ? AND p.name = ?`
      )
      .get(req.auth.userId, permissionName);

    if (!hasPermission) {
      return res.status(403).json({ error: `Missing required permission: ${permissionName}` });
    }

    next();
  };
}
