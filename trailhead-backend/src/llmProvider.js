import OpenAI from 'openai';

// This is the ONLY file that knows which AI provider is in use.
// orchestrator.js just calls chatCompletion() — swapping Groq for
// OpenAI, Gemini, or Claude in production means editing this file only.

const hasKey = Boolean(process.env.GROQ_API_KEY);

const client = hasKey
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1', // Groq is OpenAI-SDK compatible
    })
  : null;

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export function isAiConnected() {
  return hasKey;
}

/**
 * Raw chat completion with optional tool-calling support.
 * Returns the full assistant message object (content + tool_calls),
 * so the orchestrator can run a proper tool-use loop.
 *
 * @param {Object} params
 * @param {Array} params.messages - full message array (system/user/assistant/tool)
 * @param {Array} [params.tools] - OpenAI-format tool schemas
 * @returns {Promise<Object>} the assistant message object
 */
export async function chatCompletion({ messages, tools }) {
  if (!client) {
    console.warn(
      '[llmProvider] No GROQ_API_KEY set — returning a placeholder reply. ' +
        'Get a free key at https://console.groq.com/keys and set it in .env'
    );
    return {
      role: 'assistant',
      content:
        '(AI not connected yet — set GROQ_API_KEY in .env to enable real replies.)',
      tool_calls: null,
    };
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: tools && tools.length ? tools : undefined,
      tool_choice: tools && tools.length ? 'auto' : undefined,
      temperature: 0.3, // low temperature: this is a support/sales agent making tool decisions, not a creative writer
      max_tokens: 400,
    });

    return completion.choices[0]?.message || { role: 'assistant', content: '' };
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
