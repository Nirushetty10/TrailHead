import express from 'express';
import { db } from '../db/connection.js';
import { verifyPassword, signToken } from '../services/authService.js';
import { recordAudit } from '../services/auditLogService.js';

export const authRouter = express.Router();

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  // Same generic failure message whether the email doesn't exist or the
  // password is wrong — same principle as the order-lookup verification:
  // don't let error differences fingerprint valid accounts.
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const roles = db
    .prepare(`SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`)
    .all(user.id)
    .map((r) => r.name);

  const token = signToken({ userId: user.id, tenantId: user.tenant_id });

  recordAudit({
    tenantId: user.tenant_id,
    actorType: 'user',
    actorId: user.id,
    action: 'login',
    targetType: 'user',
    targetId: user.id,
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenant_id, roles },
  });
});
