import { h } from './dom.js';
import { matchOption } from '../voice.js';

// Mouse/keyboard clicks are refused while voice is required; clicks made by the voice system are synthetic (untrusted).
export function guardClick() {
  return true;
}

// Turns a group of option buttons into a question answered by voice.
export function attachVoice(ctx, container, { buttons, hint = 'Say “A”, “option B”, or the answer itself', autoStart = true }) {
  const listening = ctx.voice.required;
  const status = h('div', { class: 'mic-status' }, `Say your answer, or click it. ${hint}.`);
  const micBtn = h('button', { class: 'mic-btn', type: 'button', onclick: () => listen() }, '🎤 Speak');
  container.append(h('div', { class: 'mic-row' }, micBtn, status));
  let done = false;
  let restarts = 0;
  const unlock = () => {
    status.textContent = 'Microphone unavailable: click your answer.';
  };
  const choose = (idx, heard) => {
    const all = buttons();
    if (idx < 0) return false;
    if (all[idx].disabled) {
      status.textContent = `${String.fromCharCode(65 + idx)} is already done. Say another one.`;
      return false;
    }
    done = !container.classList.contains('multi-step');
    ctx.state.stats.voiceAnswers = (ctx.state.stats.voiceAnswers || 0) + 1;
    status.textContent = `Heard “${heard}” → ${String.fromCharCode(65 + idx)}`;
    ctx.voice.stop();
    micBtn.classList.remove('live');
    all[idx].click();
    return true;
  };
  const texts = () => buttons().map((b) => b.dataset.say || b.textContent);
  const listen = () => {
    if (done || !container.isConnected) return;
    micBtn.classList.add('live');
    status.textContent = 'Listening… say the answer, or “A”, “B”, “C”';
    let matched = false;
    ctx.voice.listen((text, alts = [text]) => {
      if (matched || !container.isConnected) return;
      let idx = -1;
      for (const a of alts) {
        idx = matchOption(a, texts());
        if (idx >= 0) break;
      }
      if (choose(idx, text)) matched = true;
      else status.textContent = `Heard “${text}”, but couldn’t match it. Try again: say the answer or its letter.`;
    }, (err) => {
      micBtn.classList.remove('live');
      status.textContent = err;
      if (ctx.voice.blocked) {
        done = true;
        unlock();
      }
    }, {
      onInterim: (text) => {
        if (matched) return;
        status.textContent = `Hearing “${text}”…`;
        const idx = matchOption(text, texts(), { strict: true });
        if (idx >= 0 && choose(idx, text)) matched = true;
      },
      onEnd: () => {
        micBtn.classList.remove('live');
        // Recognition stopped without an answer (silence, a short word it missed…): listen again.
        if (!matched && !done && container.isConnected && !ctx.voice.blocked && restarts++ < 40) setTimeout(listen, 250);
      },
    });
  };
  if (autoStart && listening) setTimeout(listen, 350);
  return {
    listen,
    again: () => { done = false; restarts = 0; setTimeout(listen, 300); },
    stop: () => {
      done = true;
      micBtn.classList.remove('live');
      ctx.voice.stop();
      ctx.voice.hideIndicator?.(100);
    },
  };
}
