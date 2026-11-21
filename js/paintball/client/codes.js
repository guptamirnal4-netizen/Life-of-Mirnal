// Room codes in the browser (the same alphabet as server/logic/match.js).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const normaliseCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
export const isCode = (s) => s.length === 5 && [...s].every((ch) => CODE_ALPHABET.includes(ch));
export const shareLink = (code) => `${location.origin}${location.pathname}?room=${code}`;
