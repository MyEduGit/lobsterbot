// InstantlyClaw (OpenClaw) API client
// Docs: https://docs.openclaw.ai/gateway

const GATEWAY_URL = process.env.INSTANTLYCLAW_GATEWAY_URL;
const GATEWAY_TOKEN = process.env.INSTANTLYCLAW_GATEWAY_TOKEN;

function headers() {
  return {
    'Authorization': `Bearer ${GATEWAY_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Send a chat message to the OpenClaw agent.
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [opts]
 * @param {string} [opts.sessionKey='main']  Per-user conversation session
 * @param {string} [opts.agentId='default']  Target agent (openclaw/<agentId>)
 * @returns {Promise<string>} The assistant reply text
 */
async function chat(messages, { sessionKey = 'main', agentId = 'default' } = {}) {
  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      ...headers(),
      'x-openclaw-session-key': sessionKey,
    },
    body: JSON.stringify({
      model: `openclaw/${agentId}`,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Directly invoke an OpenClaw tool (web_fetch, web_search, etc.).
 * Uses the /tools/invoke endpoint.
 *
 * @param {string} tool  Tool name, e.g. 'web_fetch'
 * @param {object} [args]  Tool arguments
 * @param {object} [opts]
 * @param {string} [opts.sessionKey='main']
 * @returns {Promise<any>} Tool result
 */
async function invoke(tool, args = {}, { sessionKey = 'main' } = {}) {
  const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ tool, args, action: 'json', sessionKey }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenClaw ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.ok) throw new Error(`Tool error: ${data.error?.message ?? JSON.stringify(data.error)}`);
  return data.result;
}

module.exports = { chat, invoke };
