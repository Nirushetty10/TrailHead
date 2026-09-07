// Groq/Llama-family models don't use OpenAI's exact tokenizer, so an exact
// count isn't available cheaply anyway. The standard, widely-used heuristic
// is ~4 characters per token for English text — close enough to protect
// against real rate-limit ceilings without pulling in a tokenizer library.
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Rough fixed cost of everything that ISN'T the user's message but still
// gets sent to the model every single request: the system persona, the
// session-facts block, the 7 tool schemas, and up to 12 history messages.
// This is deliberately conservative (an overestimate) — better to under-
// count capacity than let a request through that actually blows the
// provider's real ceiling.
export const REQUEST_OVERHEAD_TOKENS = 900;

export function estimateRequestTokens(userMessage) {
  return REQUEST_OVERHEAD_TOKENS + estimateTokens(userMessage);
}
