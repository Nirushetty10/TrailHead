import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const secretFile = path.join(__dirname, '..', '..', 'data', 'jwt-secret.txt');

// Dev-friendly: generates and persists a random secret on first run if
// JWT_SECRET isn't set, so auth works out of the box without setup —
// but a real deployment should set JWT_SECRET explicitly in .env instead
// of relying on this generated file.
function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (fs.existsSync(secretFile)) return fs.readFileSync(secretFile, 'utf-8').trim();
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretFile, generated);
  return generated;
}

const SECRET = getSecret();
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  // Constant-time comparison — avoids leaking hash-match info via timing.
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

/**
 * Minimal HMAC-SHA256 JWT — deliberately hand-rolled instead of adding
 * the jsonwebtoken package. The format is real JWT (header.payload.sig,
 * all base64url), just implemented with only Node's built-in crypto.
 */
export function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null; // expired

  return payload;
}
