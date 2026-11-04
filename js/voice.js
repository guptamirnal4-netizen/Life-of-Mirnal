// Voice pipeline: microphone → browser speech-to-text → intent matching → (text reply) → text-to-speech.
// No audio is stored. Recognition is provided by the browser (Chrome may process audio on its servers).
// To plug in an LLM later, call setResponder() with a function that calls YOUR backend; never put API keys here.

const norm = (s) => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ');
export const tokens = (s) => norm(s).split(/\s+/).filter(Boolean);

const LETTERS = {
  a: 0, ay: 0, eh: 0, 'ए': 0,
  b: 1, bee: 1, be: 1, bi: 1, 'बी': 1,
  c: 2, see: 2, sea: 2, si: 2, 'सी': 2,
  d: 3, dee: 3, di: 3, 'डी': 3,
};
const NUMBERS = {
  one: 0, first: 0, '1': 0, 'एक': 0, pehla: 0,
  two: 1, second: 1, '2': 1, 'दो': 1, doosra: 1,
  three: 2, third: 2, '3': 2, 'तीन': 2, teesra: 2,
  four: 3, fourth: 3, '4': 3, 'चार': 3,
  five: 4, fifth: 4, '5': 4,
};
const CUE = new Set(['option', 'answer', 'number', 'choice', 'letter', 'step', 'उत्तर', 'विकल्प']);
const CUE_ONLY = { for: 3, to: 1, too: 1, won: 0 };
const FILLER = new Set(['is', 'the', 'it', 'its', 's', 'will', 'be', 'number', 'hai', 'mera']);
const ORDINALS = new Set(['first', 'second', 'third', 'fourth', 'fifth', 'pehla', 'doosra', 'teesra']);

const SPOKEN_DIGITS = {
  zero: '0', one: '1', won: '1', two: '2', to: '2', too: '2', three: '3', tree: '3', four: '4', for: '4', five: '5', six: '6',
  seven: '7', eight: '8', ate: '8', nine: '9', ten: '10', half: '1/2', minus: '−',
  eleven: '11', twelve: '12', fifteen: '15', twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60',
  seventy: '70', eighty: '80', ninety: '90', hundred: '100',
  minutes: 'min', minute: 'min', mins: 'min', seconds: 's', second: 's', percent: '', per: '', cent: '',
  ohms: 'ω', ohm: 'ω', volts: 'v', volt: 'v', amps: 'a', amp: 'a', joules: 'j', joule: 'j', newtons: 'n', newton: 'n',
};
const canon = (s) => tokens(s).map((w) => SPOKEN_DIGITS[w] ?? w).filter(Boolean).join(' ')
  .replace(/\b(\d+) (\d)\b/g, (m, x, y) => (x.endsWith('0') && x.length > 1 ? String(Number(x) + Number(y)) : m))
  .replace(/[−-]\s+/g, '−');

// Returns the index of the option the speaker meant, or -1.
// strict: only accept unambiguous answers (used on partial, still-being-spoken results).
export function matchOption(text, optionTexts, { strict = false } = {}) {
  const t = tokens(text);
  if (!t.length) return -1;
  const n = optionTexts.length;
  const ok = (i) => (i >= 0 && i < n ? i : -1);
  // Saying the option itself wins: "four" picks the option that reads "4", not option D.
  const said = canon(text);
  const exact = optionTexts.map((o) => canon(o)).indexOf(said);
  const hasCue = t.some((w) => CUE.has(w));
  if (exact >= 0 && !hasCue) return exact;
  if (!hasCue && /^[\d./−]+$/.test(said)) {
    const cores = optionTexts.map((o) => canon(o).match(/^([\d./−]+)\b/)?.[1] ?? null);
    const hits = cores.map((c, i) => (c === said ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 1) return hits[0];
  }
  if (!hasCue) {
    const short = optionTexts.map((o, i) => ({ c: canon(o), i })).filter((o) => o.c.length && o.c.split(' ').length <= 3);
    const hit = short.filter((o) => ` ${said} `.includes(` ${o.c} `));
    if (hit.length === 1 && t.length <= 6) return hit[0].i;
  }
  for (let i = 0; i < t.length; i++) {
    if (!CUE.has(t[i])) continue;
    let j = i + 1;
    while (j < t.length && FILLER.has(t[j])) j++;
    // "the answer is 4" means the option that says 4; "option 4" means the fourth option.
    if (t[i] === 'answer' || t[i] === 'उत्तर') {
      const rest = canon(t.slice(j).join(' '));
      const byText = optionTexts.map((o) => canon(o)).indexOf(rest);
      if (byText >= 0) return byText;
    }
    const w = t[j];
    const v = w === undefined ? undefined : LETTERS[w] ?? NUMBERS[w] ?? CUE_ONLY[w];
    if (v !== undefined) return ok(v);
  }
  if (strict) return -1;
  if (t.length <= 2) {
    for (const w of t) {
      const v = LETTERS[w] ?? NUMBERS[w];
      if (v !== undefined) return ok(v);
    }
  }
  if (t.length <= 5) {
    const ord = t.find((w) => ORDINALS.has(w));
    if (ord) return ok(NUMBERS[ord]);
  }
  const saidSet = new Set(t);
  const saidJoined = t.join('');
  let best = -1;
  let bestScore = 0;
  optionTexts.forEach((opt, i) => {
    const ot = tokens(opt);
    if (!ot.length) return;
    const hits = ot.filter((w) => saidSet.has(w)).length;
    let score = hits / ot.length;
    if (saidJoined && ot.join('').length > 1 && saidJoined.includes(ot.join(''))) score = Math.max(score, 1);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return bestScore >= 0.5 ? best : -1;
}

export class Voice {
  constructor(getSettings) {
    this.getSettings = getSettings;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.SR = SR;
    this.supported = !!SR;
    this.blocked = false;
    this.micReady = false;
    this.mock = false;
    this.listening = false;
    this.pending = null;
    this.indicator = document.getElementById('mic');
    this.responder = null;
  }

  // Voice is required when the player has it switched on and the browser can actually do it.
  get required() {
    return !!this.getSettings().voiceRequired && (this.mock || (this.supported && !this.blocked));
  }

  setResponder(fn) {
    this.responder = fn;
  }

  async requestMic() {
    if (this.mock) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((tr) => tr.stop());
      this.micReady = true;
      this.blocked = false;
      return true;
    } catch {
      this.blocked = true;
      return false;
    }
  }

  speak(text, onEnd = null) {
    const s = this.getSettings();
    if (!s.tts || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (onEnd) {
      let fired = false;
      const once = () => { if (!fired) { fired = true; onEnd(); } };
      u.onend = once;
      u.onerror = once;
      setTimeout(once, 1500 + text.length * 70);
    }
    const lang = s.voiceLang === 'hi-IN' ? 'hi-IN' : 'en-IN';
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith('en'));
    if (voice) u.voice = voice;
    u.lang = lang;
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }

  stopSpeaking() {
    window.speechSynthesis?.cancel();
  }

  showIndicator(text) {
    this.indicator.classList.add('on');
    this.indicator.querySelector('.mic-text').textContent = text;
  }

  hideIndicator(delay = 900) {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.indicator.classList.remove('on'), delay);
  }

  // One utterance. onText(final transcript); onError(message).
  listen(onText, onError, { lang = null, onInterim = null, onEnd = null } = {}) {
    this.stop();
    this.stopSpeaking();
    if (this.mock) {
      this.pending = { onText, onError };
      this.listening = true;
      this.showIndicator('Listening… (test mode)');
      return;
    }
    if (!this.supported) {
      onError?.('Voice input is not supported in this browser. Use Chrome to play with your voice.');
      return;
    }
    const rec = new this.SR();
    this.rec = rec;
    const setting = this.getSettings().voiceLang;
    rec.lang = lang || (setting === 'hinglish' ? 'en-IN' : setting);
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    this.listening = true;
    this.showIndicator('Listening…');
    let finished = false;
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      const text = r[0].transcript;
      this.showIndicator(`“${text}”`);
      onInterim?.(text);
      if (r.isFinal && !finished) {
        finished = true;
        const alts = Array.from({ length: r.length }, (_, k) => r[k].transcript);
        onText(text, alts);
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.blocked = true;
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'network') onError?.('Chrome’s speech service is unreachable. Voice needs an internet connection.');
      else if (e.error === 'audio-capture') onError?.('No microphone was found. Check that one is connected.');
      else onError?.(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone permission was denied.' : `Voice error: ${e.error}`);
    };
    rec.onend = () => {
      if (this.rec !== rec) return;
      this.listening = false;
      this.rec = null;
      this.hideIndicator();
      onEnd?.(finished);
    };
    try {
      rec.start();
    } catch {
      this.listening = false;
      this.rec = null;
      setTimeout(() => onEnd?.(false), 300);
    }
  }

  stop() {
    this.pending = null;
    if (this.rec) {
      try { this.rec.abort(); } catch { /* already stopped */ }
      this.rec = null;
    }
    this.listening = false;
  }

  // Test hook: deliver a transcript as if the player had spoken it.
  inject(text) {
    const p = this.pending;
    this.pending = null;
    this.listening = false;
    this.hideIndicator(200);
    if (p) p.onText(text, [text]);
    return !!p;
  }

  // Continuous listening while singing: loudness meter + recognised words.
  async startSinging({ lang = 'hi-IN', onWords = null } = {}) {
    const ctl = { voicedSeconds: 0, level: 0, heard: '', available: false, stop: () => {} };
    if (this.mock) {
      ctl.available = true;
      ctl.mockLevel = 0;
      ctl.tick = (dt) => {
        ctl.level = ctl.mockLevel;
        if (ctl.level > 0.02) ctl.voicedSeconds += dt;
      };
      return ctl;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
    } catch {
      this.blocked = true;
      return ctl;
    }
    ctl.available = true;
    const ac = new AudioContext();
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    ctl.tick = (dt) => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      ctl.level = Math.sqrt(sum / buf.length);
      if (ctl.level > 0.02) ctl.voicedSeconds += dt;
    };
    let rec = null;
    let stopped = false;
    if (this.supported) {
      const startRec = () => {
        if (stopped) return;
        rec = new this.SR();
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let text = '';
          for (let k = 0; k < e.results.length; k++) text += ` ${e.results[k][0].transcript}`;
          ctl.heard = text;
          onWords?.(text);
        };
        rec.onend = () => { if (!stopped) setTimeout(startRec, 150); };
        rec.onerror = () => {};
        try { rec.start(); } catch { /* ignore */ }
      };
      startRec();
    }
    this.showIndicator('🎤 Singing…');
    ctl.stop = () => {
      stopped = true;
      try { rec?.abort(); } catch { /* ignore */ }
      stream.getTracks().forEach((tr) => tr.stop());
      ac.close();
      this.hideIndicator(200);
    };
    return ctl;
  }

  // Pick the on-screen button whose text (or data-voice hint) best matches what was said.
  matchButton(text, container) {
    if (!container) return null;
    const options = [...container.querySelectorAll('button.option:not([disabled])')];
    if (options.length) {
      const i = matchOption(text, options.map((b) => b.dataset.say || b.textContent));
      if (i >= 0) return options[i];
    }
    const said = new Set(tokens(text));
    let best = null;
    let bestScore = 0;
    for (const b of container.querySelectorAll('button:not([disabled])')) {
      const target = tokens(`${b.textContent} ${b.dataset.voice || ''}`).filter((w) => w.length > 1);
      if (!target.length) continue;
      const hits = target.filter((w) => said.has(w)).length;
      const score = hits / Math.sqrt(target.length);
      if (score > bestScore) {
        best = b;
        bestScore = score;
      }
    }
    return bestScore >= 0.34 ? best : null;
  }
}
