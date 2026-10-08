// Floating audio player with live captions, and the small "Listen" button used on tips, tour and lessons.
import React from 'react';
import { useUI } from '../store/store';
import { useVoice, play, stop, pause, resume, jump, setRate } from '../lib/voice';
import type { Clip } from '../lib/audio-scripts';
import { useT } from '../lib/useT';
import { cls } from '../lib/util';
import { Volume2, Pause, Play, Square, SkipBack, SkipForward, Headphones } from 'lucide-react';

export function ListenButton({ clip, clips, className = '', label, size = 'md', onEnd }: { clip?: Clip; clips?: Clip[]; className?: string; label?: string; size?: 'sm' | 'md'; onEnd?: () => void }) {
  const t = useT();
  const first = clip || clips?.[0];
  const active = useVoice((s) => s.status !== 'idle' && !!first && (s.clip?.id === first.id || (clips || []).some((c) => c.id === s.clip?.id)));
  const rate = useUI((s) => s.voiceRate);
  if (!first) return null;
  return (
    <button type="button" data-listen={first.id} aria-pressed={active}
      onClick={(e) => { e.stopPropagation(); if (active) stop(); else { setRate(rate || 0.95); play(clips || [first], { onEnd }); } }}
      className={cls('inline-flex items-center gap-1.5 rounded-lg font-semibold transition shrink-0', size === 'sm' ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3 text-[13px]', active ? 'bg-violet text-white' : 'bg-violet/10 text-violet hover:bg-violet/15', className)}>
      {active ? <Square size={size === 'sm' ? 12 : 14} /> : <Volume2 size={size === 'sm' ? 14 : 16} />}{active ? t('Stop') : label || t('Listen')}
    </button>
  );
}

export function VoicePlayer() {
  const t = useT();
  const { clip, idx, status, mode, queue } = useVoice();
  const rate = useUI((s) => s.voiceRate);
  const set = useUI((s) => s.set);
  // the welcome card and the tour show their own text and Stop button, so the floating player stays out of the way
  const covered = useUI((s) => s.tour === 'run' || (s.signedIn && s.guide && !s.toursDone['welcome:' + s.userId]));
  if (!clip || covered) return null;
  const line = clip.lines[idx] || '';
  return (
    <div className="fixed z-[85] left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+8px)] md:top-auto md:right-auto md:left-5 lg:left-[272px] md:w-[420px] md:bottom-5 card shadow-pop p-3.5 animate-up" role="region" aria-label={t('Audio guide')}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-violet/10 text-violet grid place-items-center shrink-0"><Headphones size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-muted">{t('Audio guide')} · {idx + 1}/{clip.lines.length}{queue.length ? ` · +${queue.length}` : ''}</div>
          <div className="font-semibold text-[13.5px] truncate">{clip.title}</div>
        </div>
        <button className="btn-icon" aria-label={t('Stop')} onClick={stop}><Square size={15} /></button>
      </div>
      <p className="mt-2.5 text-[15px] leading-relaxed min-h-[2.8em]" aria-live="polite" lang="hi">{line}</p>
      <div className="h-1 rounded-full bg-line mt-2 overflow-hidden"><div className="h-full bg-violet transition-all" style={{ width: `${((idx + 1) / clip.lines.length) * 100}%` }} /></div>
      <div className="flex items-center gap-1 mt-2.5">
        <button className="btn-icon" aria-label={t('Previous line')} onClick={() => jump(-1)}><SkipBack size={16} /></button>
        {status === 'playing' ? <button className="btn-icon" aria-label={t('Pause')} onClick={pause}><Pause size={17} /></button> : <button className="btn-icon" aria-label={t('Play')} onClick={resume}><Play size={17} /></button>}
        <button className="btn-icon" aria-label={t('Next line')} onClick={() => jump(1)}><SkipForward size={16} /></button>
        <span className="flex-1" />
        <div className="inline-flex p-0.5 rounded-lg bg-surface2 border border-line" role="group" aria-label={t('Speed')}>
          {[0.8, 0.95, 1.1].map((r) => <button key={r} className={cls('h-7 px-2 rounded-md text-[11.5px] font-semibold', Math.abs((rate || 0.95) - r) < 0.01 ? 'bg-surface shadow-card' : 'text-muted')} onClick={() => { set({ voiceRate: r } as any); setRate(r); }}>{r === 0.8 ? t('Slow') : r === 0.95 ? t('Normal') : t('Fast')}</button>)}
        </div>
      </div>
      {mode === 'captions' && <p className="text-[11.5px] text-muted mt-2">{t('No Hindi voice on this device, so only the text is shown. On Android: Settings → Text-to-speech → Google → install Hindi. On Windows: Settings → Time & language → Speech → add Hindi.')}</p>}
    </div>
  );
}
