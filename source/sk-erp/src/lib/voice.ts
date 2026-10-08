// Voice engine: reads Hinglish clips aloud with the device's Hindi voice (Web Speech API),
// one line at a time so captions can follow. With no Hindi voice it still runs the captions on a timer.
import { create } from 'zustand';
import type { Clip } from './audio-scripts';

type State = {
  clip: Clip | null; idx: number; status: 'idle' | 'playing' | 'paused'; mode: 'voice' | 'captions';
  voiceName: string; queue: Clip[]; onEnd?: (() => void) | null;
};
export const useVoice = create<State>(() => ({ clip: null, idx: 0, status: 'idle', mode: 'voice', voiceName: '', queue: [], onEnd: null }));

const synth = (): SpeechSynthesis | null => { try { return (globalThis as any).speechSynthesis || null; } catch { return null; } };
let token = 0, timer: any = null, rate = 0.95;
const PREF = [/google.*हिन्दी|google.*hindi/i, /swara|madhur/i, /lekha|kalpana|hemant|aditi/i];

export function hindiVoice(): SpeechSynthesisVoice | null {
  const s = synth(); if (!s) return null;
  const vs = s.getVoices() || [];
  const hi = vs.filter((v) => /^hi([-_]|$)/i.test(v.lang));
  for (const re of PREF) { const v = hi.find((x) => re.test(x.name)); if (v) return v; }
  return hi[0] || null;
}
export const hasVoice = () => !!hindiVoice();
// voices load asynchronously in Chrome
try { const s = synth(); if (s) { s.getVoices(); s.addEventListener?.('voiceschanged', () => useVoice.setState({ voiceName: hindiVoice()?.name || '' })); } } catch { /* */ }

export const setRate = (r: number) => { rate = r; };

function clear() { token++; clearTimeout(timer); try { synth()?.cancel(); } catch { /* */ } }

function sayLine(i: number) {
  const st = useVoice.getState(); const clip = st.clip; if (!clip) return;
  if (i >= clip.lines.length) { finish(); return; }
  useVoice.setState({ idx: i, status: 'playing' });
  const my = ++token;
  const next = () => { if (my === token && useVoice.getState().status === 'playing') sayLine(i + 1); };
  const line = clip.lines[i];
  const v = hindiVoice(), s = synth();
  if (v && s && typeof SpeechSynthesisUtterance !== 'undefined') {
    useVoice.setState({ mode: 'voice', voiceName: v.name });
    const u = new SpeechSynthesisUtterance(line);
    u.voice = v; u.lang = v.lang || 'hi-IN'; u.rate = rate; u.pitch = 1;
    let done = false; const go = () => { if (!done) { done = true; clearTimeout(timer); timer = setTimeout(next, 250); } };
    u.onend = go; u.onerror = go;
    // safety net if the engine never fires onend (some Android builds)
    clearTimeout(timer); timer = setTimeout(go, 1500 + line.length * 110 / rate);
    try { s.speak(u); } catch { go(); }
  } else {
    useVoice.setState({ mode: 'captions' });
    clearTimeout(timer); timer = setTimeout(next, Math.max(2200, line.length * 70 / rate));
  }
}

function finish() {
  const { queue, onEnd } = useVoice.getState();
  if (queue.length) { const [c, ...rest] = queue; useVoice.setState({ clip: c, queue: rest, idx: 0 }); sayLine(0); return; }
  useVoice.setState({ status: 'idle', clip: null, idx: 0, onEnd: null });
  onEnd?.();
}

/** play one clip (or a list, back to back). Replaces whatever is playing. */
export function play(clips: Clip | Clip[], opts: { onEnd?: () => void; rate?: number } = {}) {
  clear();
  const list = Array.isArray(clips) ? clips : [clips];
  if (!list.length) return;
  if (opts.rate) rate = opts.rate;
  useVoice.setState({ clip: list[0], queue: list.slice(1), idx: 0, status: 'playing', onEnd: opts.onEnd || null });
  sayLine(0);
}
export function stop() { clear(); useVoice.setState({ status: 'idle', clip: null, idx: 0, queue: [], onEnd: null }); }
export function pause() { clear(); if (useVoice.getState().clip) useVoice.setState({ status: 'paused' }); }
export function resume() { const s = useVoice.getState(); if (s.clip) sayLine(s.idx); }
export function jump(d: number) { const s = useVoice.getState(); if (!s.clip) return; clear(); sayLine(Math.max(0, Math.min(s.clip.lines.length - 1, s.idx + d))); }
export const isPlaying = (id: string) => { const s = useVoice.getState(); return s.status !== 'idle' && s.clip?.id === id; };
