// FireClaw client for LobsterBot.
//
// LobsterBot uses this to raise an urgent "fire" signal to the local FireClaw
// daemon (default http://127.0.0.1:8797), which forwards to the NemoClaw n8n
// webhook. Node 18+ (native fetch).
//
// Usage:
//   const { fire } = require('./setup/fireclaw_client');
//   await fire({ severity: 'high', message: 'molt alert', meta: { chat: 123 } });

const FIRECLAW_URL   = process.env.FIRECLAW_URL   || 'http://127.0.0.1:8797/fire';
const FIRECLAW_TOKEN = process.env.FIRECLAW_TOKEN || '';

/**
 * @param {{ severity?: 'low'|'med'|'high', message: string, meta?: object, source?: string }} signal
 * @returns {Promise<{ ok: boolean, forwarded?: boolean, id?: string, error?: string }>}
 */
async function fire(signal) {
  const payload = {
    source: signal.source || 'lobsterbot',
    severity: signal.severity || 'med',
    message: signal.message,
    meta: signal.meta || {},
  };
  const headers = { 'Content-Type': 'application/json' };
  if (FIRECLAW_TOKEN) headers.Authorization = `Bearer ${FIRECLAW_TOKEN}`;

  try {
    const res = await fetch(FIRECLAW_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
    return body;
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

module.exports = { fire };
