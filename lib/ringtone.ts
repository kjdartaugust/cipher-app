'use client';

// Call ringing via unlocked <audio> elements — the reliable iOS pattern.
//
// A raw AudioContext gets suspended when idle on iOS and can't resume without a
// fresh gesture, so an incoming call (no gesture) stays silent. An <audio>
// element, once played during ANY tap, can be re-played later — and its `src`
// can be swapped to a different tone without re-locking. So we (1) synthesize
// ringtones as WAV data URIs at runtime, (2) unlock one incoming + one outgoing
// element on the first taps, (3) at ring time set the element's src to the right
// tone (global default, or a per-contact override) and loop-play it.
//
// Selection + per-contact assignments are per-device (localStorage).
// Caveat: like all web audio on iOS, this is muted by the hardware Silent switch.

// ---- WAV synthesis -------------------------------------------------------
function pcmToWavDataUri(samples: Float32Array, sampleRate: number): string {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buffer);
  const ws = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE');
  ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ws(36, 'data'); view.setUint32(40, n * 2, true);
  let off = 44;
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, samples[i])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2; }
  let bin = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

type ToneSpec = { at: number; len: number; freqs: number[]; vol: number; decay?: boolean };
type RingtoneDef = { id: string; label: string; cycle: number; specs: ToneSpec[] };

function addTone(buf: Float32Array, sr: number, s: ToneSpec) {
  const a = Math.floor(s.at * sr);
  const b = Math.min(buf.length, Math.floor((s.at + s.len) * sr));
  for (let i = a; i < b; i++) {
    const t = (i - a) / sr;
    const env = s.decay
      ? Math.min(1, t / 0.004) * Math.exp(-t * 7)
      : Math.min(1, t / 0.02) * Math.min(1, (s.len - t) / 0.06);
    let v = 0;
    for (const f of s.freqs) v += Math.sin(2 * Math.PI * f * (i / sr));
    buf[i] += (v / s.freqs.length) * s.vol * env;
  }
}

const SR = 8000;
const uriCache = new Map<string, string>();
function dataUri(def: RingtoneDef): string {
  const cached = uriCache.get(def.id);
  if (cached) return cached;
  const buf = new Float32Array(Math.floor(SR * def.cycle));
  for (const s of def.specs) addTone(buf, SR, s);
  const uri = pcmToWavDataUri(buf, SR);
  uriCache.set(def.id, uri);
  return uri;
}

// ---- ringtone catalog ----------------------------------------------------
const RINGTONES: RingtoneDef[] = [
  { id: 'chime', label: 'Chime', cycle: 2.4, specs: [
    { at: 0.0, len: 0.4, freqs: [523.25, 659.25], vol: 0.7 },
    { at: 0.5, len: 0.4, freqs: [587.33, 698.46], vol: 0.7 },
  ] },
  { id: 'classic', label: 'Classic', cycle: 3.0, specs: [
    { at: 0.0, len: 0.4, freqs: [480, 620], vol: 0.6 },
    { at: 0.5, len: 0.4, freqs: [480, 620], vol: 0.6 },
  ] },
  { id: 'pulse', label: 'Pulse', cycle: 2.0, specs: [
    { at: 0.0, len: 0.12, freqs: [880], vol: 0.6 },
    { at: 0.22, len: 0.12, freqs: [880], vol: 0.6 },
    { at: 0.44, len: 0.12, freqs: [880], vol: 0.6 },
  ] },
  { id: 'marimba', label: 'Marimba', cycle: 2.2, specs: [
    { at: 0.0, len: 0.4, freqs: [523.25], vol: 0.9, decay: true },
    { at: 0.18, len: 0.4, freqs: [659.25], vol: 0.9, decay: true },
    { at: 0.36, len: 0.5, freqs: [783.99], vol: 0.9, decay: true },
  ] },
  { id: 'sonar', label: 'Sonar', cycle: 2.8, specs: [
    { at: 0.0, len: 0.6, freqs: [400], vol: 0.8, decay: true },
  ] },
  { id: 'bells', label: 'Bells', cycle: 2.6, specs: [
    { at: 0.0, len: 0.6, freqs: [987.77], vol: 0.85, decay: true },
    { at: 0.3, len: 0.6, freqs: [783.99], vol: 0.85, decay: true },
    { at: 0.6, len: 0.7, freqs: [659.25], vol: 0.85, decay: true },
  ] },
  { id: 'digital', label: 'Digital', cycle: 2.0, specs: [
    { at: 0.0, len: 0.1, freqs: [1046.5], vol: 0.55 },
    { at: 0.15, len: 0.1, freqs: [1318.5], vol: 0.55 },
    { at: 0.3, len: 0.1, freqs: [1046.5], vol: 0.55 },
    { at: 0.45, len: 0.1, freqs: [1318.5], vol: 0.55 },
  ] },
  { id: 'ripple', label: 'Ripple', cycle: 2.2, specs: [
    { at: 0.0, len: 0.25, freqs: [523.25], vol: 0.85, decay: true },
    { at: 0.12, len: 0.25, freqs: [587.33], vol: 0.85, decay: true },
    { at: 0.24, len: 0.25, freqs: [659.25], vol: 0.85, decay: true },
    { at: 0.36, len: 0.3, freqs: [783.99], vol: 0.85, decay: true },
  ] },
  { id: 'beacon', label: 'Beacon', cycle: 2.4, specs: [
    { at: 0.0, len: 0.35, freqs: [700], vol: 0.75 },
  ] },
];
const OUTGOING: RingtoneDef = { id: 'ringback', label: 'Ringback', cycle: 4.0, specs: [{ at: 0.0, len: 1.0, freqs: [440, 480], vol: 0.35 }] };

export const RINGTONE_OPTIONS = RINGTONES.map((r) => ({ id: r.id, label: r.label }));

function defFor(id: string | null): RingtoneDef {
  return RINGTONES.find((r) => r.id === id) ?? RINGTONES[0];
}

// ---- element / selection state ------------------------------------------
let incomingEl: HTMLAudioElement | null = null;
let outgoingEl: HTMLAudioElement | null = null;
let previewEl: HTMLAudioElement | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let selectedId: string | null = null;
let incomingToneId = ''; // which tone incomingEl.src currently holds
let contacts: Record<string, string> | null = null;
let unlocked = false;
let wantRing = false;

function loadSelection(): string {
  try {
    const s = localStorage.getItem('cipher.ringtone');
    if (s && RINGTONES.some((r) => r.id === s)) return s;
  } catch {}
  return 'chime';
}
function loadContacts(): Record<string, string> {
  try {
    const raw = localStorage.getItem('cipher.ringtones.contacts');
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {}
  return {};
}

function ensure() {
  if (typeof window === 'undefined') return;
  if (selectedId == null) selectedId = loadSelection();
  if (contacts == null) contacts = loadContacts();
  if (!incomingEl) {
    incomingToneId = selectedId;
    incomingEl = new Audio(dataUri(defFor(selectedId)));
    incomingEl.loop = true; incomingEl.preload = 'auto';
  }
  if (!outgoingEl) { outgoingEl = new Audio(dataUri(OUTGOING)); outgoingEl.loop = true; outgoingEl.preload = 'auto'; }
}

// swap the (already-unlocked) incoming element to a given tone
function setIncomingTone(id: string) {
  ensure();
  if (!incomingEl || incomingToneId === id) return;
  incomingToneId = id;
  incomingEl.src = dataUri(defFor(id));
}

// ---- global default ------------------------------------------------------
export function getRingtone(): string {
  ensure();
  return selectedId ?? 'chime';
}
export function setRingtone(id: string) {
  ensure();
  if (!RINGTONES.some((r) => r.id === id)) return;
  selectedId = id;
  try { localStorage.setItem('cipher.ringtone', id); } catch {}
}

// ---- per-caller ----------------------------------------------------------
// `id` is a user id for a 1:1 caller, or a conversation id for a group. They
// share one map because a group and a person are the same thing here: something
// that can ring you. On an incoming group call the group's tone wins, and the
// caller's own tone is the fallback (see call-overlay).
export function getContactRingtone(id: string): string | null {
  ensure();
  return (contacts && contacts[id]) || null;
}
export function setContactRingtone(id: string, tone: string | null) {
  ensure();
  if (!contacts) contacts = {};
  if (tone && RINGTONES.some((r) => r.id === tone)) contacts[id] = tone;
  else delete contacts[id];
  try { localStorage.setItem('cipher.ringtones.contacts', JSON.stringify(contacts)); } catch {}
}

// ---- preview (loops for a while, then stops) -----------------------------
let onPreviewDone: (() => void) | null = null;

export function previewRingtone(id: string, onDone?: () => void) {
  ensure();
  if (!previewEl) { previewEl = new Audio(); previewEl.preload = 'auto'; }
  const def = defFor(id);
  // replace any running preview without firing its onDone
  if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
  previewEl.pause();
  onPreviewDone = onDone ?? null;
  previewEl.src = dataUri(def);
  previewEl.loop = true;
  previewEl.volume = 1;
  try { previewEl.currentTime = 0; } catch {}
  previewEl.play().catch(() => {});
  // play for a good few seconds so the pattern is clearly audible
  const durationMs = Math.max(6500, Math.ceil(def.cycle * 3) * 1000);
  previewTimer = setTimeout(() => {
    previewTimer = null;
    if (previewEl) { previewEl.pause(); previewEl.loop = false; }
    const cb = onPreviewDone; onPreviewDone = null;
    cb?.();
  }, durationMs);
}

export function stopPreview() {
  if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
  if (previewEl) { previewEl.pause(); previewEl.loop = false; }
  const cb = onPreviewDone; onPreviewDone = null;
  cb?.();
}

// ---- unlock + ring -------------------------------------------------------
export function primeAudio() {
  ensure();
  if (unlocked || !incomingEl || !outgoingEl) return;
  let ok = 0;
  for (const el of [incomingEl, outgoingEl]) {
    el.muted = true;
    el.play().then(() => {
      el.pause();
      try { el.currentTime = 0; } catch {}
      el.muted = false;
      if (++ok === 2) unlocked = true;
    }).catch(() => {});
  }
}

// `override` = a specific ringtone id (e.g. the caller's per-contact tone).
export function startRing(kind: 'incoming' | 'outgoing', override?: string) {
  ensure();
  if (kind === 'incoming') setIncomingTone(override || selectedId || 'chime');
  const el = kind === 'incoming' ? incomingEl : outgoingEl;
  const other = kind === 'incoming' ? outgoingEl : incomingEl;
  if (other) { other.pause(); }
  if (!el) return;
  wantRing = true;
  el.muted = false;
  el.volume = 1;
  try { el.currentTime = 0; } catch {}
  el.loop = true;
  // iOS can interrupt <audio> playback when it reconfigures the audio session
  // (notably around video calls). Keep re-attempting until we explicitly stop.
  let attempts = 0;
  const tryPlay = () => {
    if (!wantRing) return;
    el.play().catch(() => {});
    if (++attempts < 6) {
      setTimeout(() => { if (wantRing && el.paused) tryPlay(); }, 300);
    }
  };
  tryPlay();
}

export function stopRing() {
  wantRing = false;
  for (const el of [incomingEl, outgoingEl]) {
    if (el) { el.pause(); try { el.currentTime = 0; } catch {} }
  }
}
