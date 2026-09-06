import OpenAI from 'openai';

// This is the ONLY file that knows which AI provider is in use.
// orchestrator.js just calls generateReply() — swapping Groq for
// OpenAI, Gemini, or Claude in production means editing this file only.

const hasKey = Boolean(process.env.GROQ_API_KEY);

const client = hasKey
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1', // Groq is OpenAI-SDK compatible
    })
  : null;

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

/**
 * @param {Object} params
 * @param {string} params.systemPrompt - persona + grounding data injected as context
 * @param {Array<{role: 'user'|'assistant', content: string}>} params.history
 * @param {string} params.userMessage
 * @returns {Promise<string>}
 */
export async function generateReply({ systemPrompt, history, userMessage }) {
  if (!client) {
    // No API key configured yet — dev-safe fallback so the server still runs.
    console.warn(
      '[llmProvider] No GROQ_API_KEY set — returning a placeholder reply. ' +
        'Get a free key at https://console.groq.com/keys and set it in .env'
    );
    return "(AI not connected yet — set GROQ_API_KEY in .env to enable real replies. " +
      "Here's what I found in your data, though — see above.)";
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4, // lower temperature: this is a support/sales agent, not a creative writer
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    if (err?.status === 404 || err?.code === 'model_not_found') {
      console.error(
        `[llmProvider] Model "${MODEL}" not found or not available on this API key.\n` +
          '  Groq periodically changes which models are on the free tier.\n' +
          '  Check current options: https://console.groq.com/docs/models\n' +
          '  Then update GROQ_MODEL in your .env file.'
      );
    }
    throw err;
  }
}
