// Voice chat between players: WebRTC audio, peer to peer (a mesh: fine for up to 12 audio-only peers). The
// Colyseus room only relays the signalling (offer / answer / ICE), and only between players in the same voice
// channel (js/paintball/channels.js): everyone in the lobby, your own team during a team paintball match.
// Audio never goes through the server and nothing is recorded.
//
// Push-to-talk (hold T, or the 🎤 button on touch) or open mic; mute everyone or one player. Public STUN only:
// there is no TURN relay, so some strict networks cannot connect. That is detected and reported per player.
import { voicePeers } from '../channels.js';
import { MODES_BY_ID } from '../rules.js';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const CONNECT_TIMEOUT = 15000;

export class VoiceChat {
  constructor({ room, onFail = () => {}, onChange = () => {} }) {
    this.room = room; this.onFail = onFail; this.onChange = onChange;
    this.on = false; this.stream = null; this.track = null;
    this.ptt = false; this.openMic = false; this.mutedAll = false; this.muted = new Set();
    this.peers = new Map(); // id → { pc, audio, timer, state, tracks }
    this.talkSent = false; this.level = 0; this.earlyIce = new Map();
    this.off = room.onMessage('rtc', (m) => this.signal(m));
    globalThis.__pbVoice = this; // inspected by tests/browser/paintball.mjs
  }

  get transmitting() { return !!this.track && this.track.enabled; }

  // Ask for the microphone (only now, when the player switches voice on).
  async enable() {
    if (this.on) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use a microphone for voice chat.');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    } catch (e) {
      const blocked = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      throw new Error(blocked ? 'Microphone blocked. Allow the microphone for this site (the icon in the address bar), then switch voice on again.' : `No microphone available (${e?.name || 'error'}).`);
    }
    this.track = this.stream.getAudioTracks()[0];
    this.track.enabled = false; // push-to-talk: silent until T is held
    this.meter();
    this.on = true;
    this.room.send('voice', { on: true });
    this.onChange();
  }

  disable() {
    if (!this.on) return;
    for (const id of [...this.peers.keys()]) { this.send(id, 'bye', null); this.close(id); }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null; this.track = null; this.on = false;
    this.analyser = null; this.actx?.close().catch(() => {}); this.actx = null;
    if (this.room.connection.isOpen) { this.room.send('voice', { on: false }); }
    this.talkSent = false;
    this.onChange();
  }

  setPTT(down) { this.ptt = !!down; this.apply(); }
  setOpenMic(on) { this.openMic = !!on; this.apply(); this.onChange(); }
  apply() {
    if (!this.track) return;
    this.track.enabled = this.ptt || this.openMic;
    this.talk(this.ptt || (this.openMic && this.level > 0.04));
  }
  talk(on) { if (on !== this.talkSent && this.on && this.room.connection.isOpen) { this.talkSent = on; this.room.send('talk', { on }); } }

  muteAll(on) { this.mutedAll = !!on; for (const [id, p] of this.peers) p.audio.muted = this.mutedAll || this.muted.has(id); this.onChange(); }
  mutePeer(id, on) { if (on) this.muted.add(id); else this.muted.delete(id); const p = this.peers.get(id); if (p) p.audio.muted = this.mutedAll || on; this.onChange(); }

  // A level meter on the microphone, for the open-mic talking indicator.
  meter() {
    try {
      const A = globalThis.AudioContext || globalThis.webkitAudioContext;
      this.actx = new A(); const src = this.actx.createMediaStreamSource(this.stream);
      this.analyser = this.actx.createAnalyser(); this.analyser.fftSize = 512; src.connect(this.analyser);
      this.buf = new Float32Array(this.analyser.fftSize);
    } catch { this.analyser = null; }
  }
  tick() {
    if (!this.on || !this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    let s = 0; for (const v of this.buf) s += v * v;
    this.level = this.level * 0.7 + Math.sqrt(s / this.buf.length) * 0.3;
    if (this.openMic) this.talk(this.ptt || this.level > 0.04);
  }

  // Keep exactly the peer connections of the current channel (call on every state change).
  sync(state, myId) {
    if (!this.on) return;
    const want = new Set(voicePeers(myId, state.players.entries(), { phase: state.phase, teams: MODES_BY_ID[state.mode]?.teams || 0 }));
    for (const id of [...this.peers.keys()]) if (!want.has(id)) { this.send(id, 'bye', null); this.close(id); }
    for (const id of want) if (!this.peers.has(id) && myId < id) this.call(id); // the lower id makes the offer
    this.names = (id) => state.players.get(id)?.nickname || 'a player';
  }

  peer(id) {
    let p = this.peers.get(id);
    if (p) return p;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const audio = new Audio(); audio.autoplay = true; audio.muted = this.mutedAll || this.muted.has(id);
    p = { pc, audio, state: 'new', tracks: 0, failed: false };
    this.peers.set(id, p);
    if (this.track) pc.addTrack(this.track, this.stream);
    pc.ontrack = (e) => { p.tracks++; audio.srcObject = e.streams[0] || new MediaStream([e.track]); audio.play?.().catch(() => {}); this.onChange(); };
    pc.onicecandidate = (e) => { if (e.candidate) this.send(id, 'ice', e.candidate.toJSON()); };
    pc.onconnectionstatechange = () => {
      p.state = pc.connectionState;
      if (p.state === 'connected') clearTimeout(p.timer);
      if (p.state === 'failed') this.fail(id);
      this.onChange();
    };
    p.timer = setTimeout(() => { if (p.state !== 'connected' && this.peers.get(id) === p) this.fail(id); }, CONNECT_TIMEOUT);
    return p;
  }
  fail(id) {
    const p = this.peers.get(id); if (!p || p.failed) return;
    p.failed = true; p.state = 'failed';
    this.onFail(id, `Voice couldn't connect to ${this.names?.(id) || 'a player'} (their network blocks direct connections; there is no relay server).`);
    this.onChange();
  }
  async call(id) {
    const p = this.peer(id);
    try {
      const offer = await p.pc.createOffer(); await p.pc.setLocalDescription(offer);
      this.send(id, 'offer', { type: offer.type, sdp: offer.sdp });
    } catch { this.fail(id); }
  }
  async signal({ from, kind, data }) {
    if (!this.on || typeof from !== 'string') return;
    try {
      if (kind === 'bye') return this.close(from);
      if (kind === 'offer') {
        if (this.peers.has(from) && this.peers.get(from).pc.signalingState !== 'stable') this.close(from);
        else if (this.peers.has(from)) this.close(from);
        const p = this.peer(from);
        await p.pc.setRemoteDescription(data);
        await this.flushIce(from, p);
        const ans = await p.pc.createAnswer(); await p.pc.setLocalDescription(ans);
        this.send(from, 'answer', { type: ans.type, sdp: ans.sdp });
      } else if (kind === 'answer') {
        const p = this.peers.get(from); if (p && p.pc.signalingState === 'have-local-offer') { await p.pc.setRemoteDescription(data); await this.flushIce(from, p); }
      } else if (kind === 'ice' && data) {
        const p = this.peers.get(from);
        if (p && p.pc.remoteDescription) await p.pc.addIceCandidate(data).catch(() => {});
        else { const q = this.earlyIce.get(from) || []; q.push(data); this.earlyIce.set(from, q.slice(-50)); } // before the offer/answer
      }
    } catch { this.fail(from); }
  }
  async flushIce(id, p) {
    const q = this.earlyIce.get(id) || []; this.earlyIce.delete(id);
    for (const c of q) await p.pc.addIceCandidate(c).catch(() => {});
  }
  send(to, kind, data) { if (this.room.connection.isOpen) this.room.send('rtc', { to, kind, data }); }
  close(id) {
    const p = this.peers.get(id); if (!p) return;
    clearTimeout(p.timer); p.pc.close(); p.audio.srcObject = null; this.peers.delete(id); this.onChange();
  }
  // tests: per peer connection state and received audio tracks
  debug() { return Object.fromEntries([...this.peers].map(([id, p]) => [id, { state: p.state, tracks: p.tracks, sending: this.transmitting }])); }
  destroy() { this.disable(); this.off?.(); if (globalThis.__pbVoice === this) globalThis.__pbVoice = null; }
}
