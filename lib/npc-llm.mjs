// Claude-powered NPC replies, shared by the local server (server.mjs) and Vercel functions (api/).
// The API key comes from the environment and never reaches the browser.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.NPC_MODEL || 'claude-opus-5-5';

let client = null;
if (process.env.NPC_LLM !== 'off') {
  try {
    client = new Anthropic();
  } catch {
    client = null;
  }
}
export let llmEnabled = !!client && !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);

const RULES = `You voice one character in "Life of Mirnal in School", a gentle first-person game set in a fictional CBSE school in India (Sunrise Public School). The player is Mirnal, a student.
Rules:
- Reply as the character only, in 1–2 short spoken sentences (max ~35 words). No stage directions, no emojis unless playful, no lists.
- Answer exactly what Mirnal just said. If it is unclear, say so briefly and ask what they meant.
- Use only the FACTS given about the school day, lessons, Mirnal and memories. Never invent marks, events or things Mirnal did.
- A rule-based DRAFT reply is provided: keep its meaning and any facts in it (times, places, topic explanations), but make it sound natural and specific to this character.
- Stay age-appropriate and kind. If Mirnal is rude, the character reacts hurt or firm, not cruel. Never discuss adult, violent or unsafe topics; steer back to school life.
- Natural Indian English; a little Hindi/Hinglish is fine ("arre", "yaar", "beta" for adults).`;

const clamp = (s, n) => String(s ?? '').slice(0, n);

export async function npcChat(body) {
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const messages = [];
  for (const turn of history) {
    const role = turn.role === 'me' ? 'user' : 'assistant';
    const content = role === 'user' ? `Mirnal: ${clamp(turn.text, 300)}` : clamp(turn.text, 300);
    if (!messages.length && role === 'assistant') messages.push({ role: 'user', content: 'Mirnal walks up to you.' });
    if (messages.length && messages.at(-1).role === role) messages.at(-1).content += `\n${content}`;
    else messages.push({ role, content });
  }
  const facts = (Array.isArray(body.facts) ? body.facts : []).map((f) => `- ${clamp(f, 400)}`).join('\n');
  const final = `FACTS:\n${facts}\n\nDetected intent: ${clamp(body.intent, 40)}\nDRAFT reply: ${clamp(body.draft, 500)}\n\nMirnal: ${clamp(body.text, 300)}`;
  if (messages.length && messages.at(-1).role === 'user') messages.at(-1).content += `\n\n${final}`;
  else messages.push({ role: 'user', content: final });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2048,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: RULES },
      { type: 'text', text: `CHARACTER: ${clamp(body.persona, 800)}` },
    ],
    messages,
  });
  if (response.stop_reason === 'refusal') return null;
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  return text || null;
}


export function disableLLM() {
  llmEnabled = false;
}

export { MODEL, Anthropic };
