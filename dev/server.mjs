// Local development server (Vercel uses api/ instead): serves the game files and (optionally) an /api/npc-chat endpoint that uses Claude
// for natural, in-character replies. The API key stays on this machine and is never sent to the browser.
//
//   npm start                         → game only (offline conversation engine)
//   ANTHROPIC_API_KEY=... npm start   → game + Claude-powered conversations
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { npcChat, llmEnabled, disableLLM, MODEL, Anthropic } from '../lib/npc-llm.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req, limit = 20000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/health') return send(res, 200, { llm: llmEnabled, model: llmEnabled ? MODEL : null });
  if (url.pathname === '/api/npc-chat' && req.method === 'POST') {
    if (!llmEnabled) return send(res, 503, { error: 'llm disabled' });
    try {
      const body = await readJson(req);
      const text = await npcChat(body);
      return text ? send(res, 200, { text }) : send(res, 422, { error: 'no reply' });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        disableLLM();
        console.warn('Claude credentials rejected: falling back to the offline conversation engine.');
      } else if (err instanceof Anthropic.APIError) console.warn(`Claude API error ${err.status}: ${err.message}`);
      else console.warn('npc-chat failed:', err.message);
      return send(res, 502, { error: 'llm failed' });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, `.${rel}`);
  if (!file.startsWith(ROOT + path.sep) || path.basename(file).startsWith('.')) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    const data = await fs.readFile(file);
    return send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  } catch {
    return send(res, 404, 'Not found', 'text/plain');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Life of Mirnal in School → http://localhost:${PORT}`);
  console.log(llmEnabled ? `Conversations: Claude (${MODEL})` : 'Conversations: offline engine (set ANTHROPIC_API_KEY for Claude-powered replies)');
});
