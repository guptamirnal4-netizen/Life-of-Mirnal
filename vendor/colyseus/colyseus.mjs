// ES module wrapper for the Colyseus client SDK (@colyseus/sdk 0.18.10, MIT, see LICENSE).
// The SDK ships its self-contained browser build only as UMD (colyseus.umd.js, copied unchanged from
// node_modules/@colyseus/sdk/dist/colyseus.js). Imported as a module, the UMD sees no `exports`/`define` and puts
// its API on globalThis.Colyseus; this file re-exports it so the game can `import { Client } from '@colyseus/sdk'`.
import './colyseus.umd.js';
const C = globalThis.Colyseus;
export const { Client, Room, Callbacks, CloseCode, ErrorCode, ServerError, MatchMakeError, getStateCallbacks } = C;
export default C;
