import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, GripVertical, RefreshCw } from 'lucide-react';
import { useUI } from '../store/store';
import { fetchCommunicationOverview, fetchCommunicationMessages, sendCommunicationMessage, type CommunicationConversation, type CommunicationMessage } from '../lib/api';
import { cls, fmtDT } from '../lib/util';

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<CommunicationConversation[]>([]);
  const [selected, setSelected] = useState('');
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const nav = useUI((s) => s.nav);
  const toast = useUI((s) => s.toast);

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchCommunicationOverview();
      setConversations(result.conversations);
      setSelected((current) => current || (result.conversations[0] ? String(result.conversations[0].id) : ''));
    } catch (error) {
      toast('Chat unavailable', 'bad', error instanceof Error ? error.message : 'Request failed');
    } finally { setLoading(false); }
  };
  useEffect(() => {
    if (!open) return;
    if (!position) setPosition({ x: Math.max(12, window.innerWidth - 390), y: Math.max(70, window.innerHeight - 570) });
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, [open]);
  useEffect(() => {
    if (!open || !selected) return;
    let live = true;
    const read = () => fetchCommunicationMessages(selected).then((result) => { if (live) setMessages(result.messages); }).catch(() => {});
    void read();
    const timer = window.setInterval(read, 8000);
    return () => { live = false; window.clearInterval(timer); };
  }, [open, selected]);
  const startDrag = (event: React.PointerEvent) => {
    if (!position) return;
    const target = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!target) return;
    drag.current = { dx: event.clientX - target.left, dy: event.clientY - target.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent) => {
    if (!drag.current) return;
    const width = 370, height = 540;
    setPosition({ x: Math.min(Math.max(8, event.clientX - drag.current.dx), Math.max(8, window.innerWidth - width - 8)), y: Math.min(Math.max(8, event.clientY - drag.current.dy), Math.max(8, window.innerHeight - height - 8)) });
  };
  const stopDrag = () => { drag.current = null; };
  const send = async () => {
    if (!selected || !body.trim()) return;
    try { await sendCommunicationMessage(selected, { body: body.trim() }); setBody(''); const result = await fetchCommunicationMessages(selected); setMessages(result.messages); void load(); }
    catch (error) { toast('Message was not sent', 'bad', error instanceof Error ? error.message : 'Request failed'); }
  };
  const conversation = conversations.find((item) => String(item.id) === selected);
  return <>
    <button onClick={() => setOpen((value) => !value)} aria-label="Open team chat" title="Open team chat" className={cls('fixed right-0 top-1/2 -translate-y-1/2 z-[45] flex flex-col items-center gap-1 rounded-l-xl px-2 py-3 shadow-pop border border-r-0 transition [writing-mode:vertical-rl] rotate-180', open ? 'bg-brand text-white border-brand' : 'bg-surface text-violet border-violet/40 hover:bg-violet hover:text-white')}><MessageCircle size={18} /><span className="text-[11px] font-bold tracking-wide">Chat</span></button>
    {open && position && <section className="fixed z-[44] w-[min(370px,calc(100vw-24px))] h-[min(540px,calc(100vh-92px))] bg-surface border border-line rounded-2xl shadow-pop overflow-hidden flex flex-col" style={{ left: position.x, top: position.y }} aria-label="Team chat messenger">
      <header onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} className="h-12 shrink-0 px-3 flex items-center gap-2 bg-side text-white cursor-move select-none touch-none"><GripVertical size={16} className="opacity-60" /><MessageCircle size={17} /><b className="flex-1 text-sm">Team Chat</b><button onPointerDown={(event) => event.stopPropagation()} onClick={() => void load()} className="p-1.5 rounded hover:bg-white/10" aria-label="Refresh chat"><RefreshCw size={14} /></button><button onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/10" aria-label="Close chat"><X size={16} /></button></header>
      <div className="flex min-h-0 flex-1"><div className="w-[132px] shrink-0 border-r border-line overflow-auto">{loading && !conversations.length ? <div className="p-2 text-[11px] text-muted">Loading…</div> : conversations.map((item) => <button key={item.id} onClick={() => setSelected(String(item.id))} className={cls('w-full text-left px-2.5 py-2 border-b border-line', selected === String(item.id) ? 'bg-violet/[.1]' : 'hover:bg-surface2')}><div className="font-semibold text-[11.5px] truncate">{item.subject}</div><div className="text-[10px] text-muted truncate">{item.last_message?.body || 'No messages'}</div></button>)}{!conversations.length && !loading && <button onClick={() => nav('communication')} className="p-2 text-left text-[11px] text-violet">Open Team Chat to start</button>}</div><div className="min-w-0 flex-1 flex flex-col"><div className="px-2.5 py-2 border-b border-line text-[11.5px] font-semibold truncate">{conversation?.subject || 'Select a conversation'}</div><div className="flex-1 overflow-auto p-2.5 space-y-2">{messages.map((message) => <div key={message.id} className="rounded-lg bg-surface2 p-2 text-[11.5px]"><div className="flex gap-1 text-[10px] text-muted"><b>{message.sender}</b><span>{fmtDT(message.created_at)}</span></div><div className="whitespace-pre-wrap mt-0.5">{message.body}</div></div>)}{conversation && !messages.length && <div className="text-[11px] text-muted text-center py-5">No messages yet.</div>}</div><div className="border-t border-line p-2 flex gap-1.5"><input className="input min-w-0 flex-1 text-[11.5px]" placeholder="Write a message…" value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void send(); } }} /><button className="btn-primary btn-sm px-2" onClick={() => void send()} disabled={!selected || !body.trim()} aria-label="Send message"><Send size={14} /></button></div></div></div>
    </section>}
  </>;
}
