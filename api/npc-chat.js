import { npcChat, llmEnabled, disableLLM, Anthropic } from '../lib/npc-llm.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!llmEnabled) return res.status(503).json({ error: 'llm disabled' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (JSON.stringify(body).length > 20000) return res.status(413).json({ error: 'too large' });
  try {
    const text = await npcChat(body);
    return text ? res.status(200).json({ text }) : res.status(422).json({ error: 'no reply' });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) disableLLM();
    console.warn('npc-chat failed:', err.message);
    return res.status(502).json({ error: 'llm failed' });
  }
}
