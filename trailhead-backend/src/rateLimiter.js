const WINDOW_MS = 60 * 1000; // 1 minute

// Per-user entries: { ts, tokens }[] — same shape used for both the
// message-count check and the token-sum check, just summed differently.
const perUserEntries = new Map();
let globalEntries = [];

function pruneOld(entries, now) {
  return entries.filter((e) => now - e.ts < WINDOW_MS);
}

function sumTokens(entries) {
  return entries.reduce((sum, e) => sum + e.tokens, 0);
}

/**
 * Call once per incoming message, per plan, with the estimated token cost
 * of THIS request (overhead + message length — see tokenEstimator.js).
 *
 * Checks, in order: message-too-long -> per-user message count ->
 * per-user token budget -> global message count -> global token budget.
 * Token checks matter more than they look: a provider's real ceiling is
 * usually tokens/minute, not requests/minute — a handful of long messages
 * can exhaust that long before the request-count limit ever triggers.
 *
 * Checking BEFORE the LLM call means a blocked message costs zero tokens
 * and zero provider quota.
 */
export function checkRateLimit(userId, plan, estimatedTokens) {
  const now = Date.now();

  const userEntries = pruneOld(perUserEntries.get(userId) || [], now);

  if (userEntries.length >= plan.maxMessagesPerMinutePerUser) {
    return blockedResult('per_user', userEntries, now);
  }

  const userTokensUsed = sumTokens(userEntries);
  if (userTokensUsed + estimatedTokens > plan.maxTokensPerMinutePerUser) {
    return blockedResult('per_user_tokens', userEntries, now);
  }

  globalEntries = pruneOld(globalEntries, now);

  if (globalEntries.length >= plan.maxRequestsPerMinuteGlobal) {
    return blockedResult('global', globalEntries, now);
  }

  const globalTokensUsed = sumTokens(globalEntries);
  if (globalTokensUsed + estimatedTokens > plan.maxTokensPerMinuteGlobal) {
    return blockedResult('global_tokens', globalEntries, now);
  }

  // All checks passed — record this request in both windows.
  const entry = { ts: now, tokens: estimatedTokens };
  userEntries.push(entry);
  perUserEntries.set(userId, userEntries);
  globalEntries.push(entry);

  return { allowed: true };
}

function blockedResult(reason, entries, now) {
  const oldest = entries[0]?.ts ?? now;
  return {
    allowed: false,
    reason,
    retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)),
  };
}

export function clearUser(userId) {
  perUserEntries.delete(userId);
}
