import { AppError } from '../middleware/error.middleware.js';

const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/**
 * Execute a chat completion request to the Groq API.
 * Uses native fetch (Node 18+) for maximum portability and zero setup overhead.
 *
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {number} [options.maxTokens]
 * @param {Object} [options.responseFormat]
 * @returns {Promise<{content: string, model: string, usage: Object}>}
 */
async function callGroqChat({
  messages,
  model = process.env.GROQ_MODEL || DEFAULT_MODEL,
  temperature = 0.2,
  maxTokens = 4096,
  responseFormat,
}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new AppError(
      'GROQ_API_KEY is not configured in environment variables. Please add GROQ_API_KEY to your .env file.',
      500
    );
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AppError('Messages array is required for Groq completion.', 400);
  }

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  let response;
  try {
    response = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw new AppError(
      `Failed to reach Groq API: ${networkError.message}`,
      502
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data?.error?.message ||
      `Groq API responded with status ${response.status} (${response.statusText})`;
    throw new AppError(`Groq API Error: ${errorMsg}`, response.status >= 500 ? 502 : 400);
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';

  return {
    content,
    model: data.model || model,
    usage: data.usage || {},
  };
}

export { callGroqChat, DEFAULT_MODEL };
