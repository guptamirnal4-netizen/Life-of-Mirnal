import { llmEnabled, MODEL } from '../lib/npc-llm.mjs';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ llm: llmEnabled, model: llmEnabled ? MODEL : null });
}
