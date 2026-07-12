'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Music, Phone, ShieldCheck, Video } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { RingtonePicker } from '@/components/shell/ringtone-picker';
import { CipherBadge } from '@/components/ui/cipher-badge';
import { BlackHole } from './black-hole';
import { GroupPanel } from './group-panel';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { useConversationMeta } from './chat-helpers';
import { useApp } from '@/lib/store';
import { useCall } from '@/components/call/call-provider';
import { keyFingerprint } from '@/lib/crypto';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { conversations, me, typing, markConversationRead, userById } = useApp();
  const { startCall, startGroupCall } = useCall();
  const conv = conversations.find((c) => c.id === conversationId);
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [showSafety, setShowSafety] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showRingtone, setShowRingtone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const meta = useConversationMeta(conv ?? ({ id: '', isGroup: false, memberIds: [me.id], createdAt: 0, lastMessageAt: 0 } as any));

  useEffect(() => {
    if (conversationId) markConversationRead(conversationId);
  }, [conversationId, meta.convMessages.length, markConversationRead]);

  // Composer + keyboard handling. When the keyboard is CLOSED we do nothing and
  // let the CSS height (100dvh) fill the visible viewport — header at top,
  // composer at bottom. Only while a text field is focused (keyboard OPEN) do we
  // shrink the thread to window.visualViewport.height, since iOS Safari never
  // shrinks 100dvh for the keyboard. Forcing the height at all times is wrong:
  // Safari under-reports visualViewport.height on first load and collapses it.
  useEffect(() => {
    const el = rootRef.current;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    if (!el || !vv) {
      return () => { document.body.style.overflow = prevOverflow; };
    }

    const desktop = () => window.matchMedia('(min-width: 1024px)').matches;
    const isField = (n: Element | null) => !!n && (n.tagName === 'TEXTAREA' || n.tagName === 'INPUT');
    const update = () => {
      if (desktop() || !isField(document.activeElement)) {
        el.style.height = ''; // keyboard closed → fall back to CSS 100dvh
        return;
      }
      el.style.height = `${vv.height}px`; // keyboard open → sit above it
      bottomRef.current?.scrollIntoView({ block: 'end' });
    };

    const onFocusOut = () => setTimeout(update, 50); // let activeElement settle
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onFocusOut);
    vv.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onFocusOut);
      vv.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meta.convMessages.length, typing]);

  useEffect(() => {
    const other = conv?.memberIds.find((id) => id !== me.id);
    if (other) keyFingerprint(userById(other).publicKey).then(setFingerprint).catch(() => {});
  }, [conv, me.id, userById]);

  const isTyping = (typing[conversationId]?.length ?? 0) > 0;

  const grouped = useMemo(() => {
    return meta.convMessages.map((m, i) => {
      const prev = meta.convMessages[i - 1];
      const showAvatar = !prev || prev.senderId !== m.senderId;
      return { m, showAvatar };
    });
  }, [meta.convMessages]);

  if (!conv) {
    return <div className="grid h-screen place-items-center text-white/40">Conversation not found.</div>;
  }

  const holeSize = Math.min(520, 150 + Math.sqrt(meta.convMessages.length) * 38);

  return (
    <div ref={rootRef} className="relative flex h-[100dvh] flex-col overflow-hidden lg:h-screen">
      {/* growing black hole — its mass is the weight of the conversation */}
      <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center overflow-hidden opacity-[0.28]" style={{ contain: 'layout paint' }}>
        <BlackHole size={holeSize} count={meta.convMessages.length} />
      </div>

      {/* header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-black px-4 py-3">
        <Link href="/messages" className="rounded-full p-1.5 hover:bg-white/10 lg:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button
          onClick={() => {
            if (conv.isGroup) setShowGroup(true);
            else if (meta.others[0]) router.push(`/u/${meta.others[0].username}`);
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-80"
        >
          <Avatar src={meta.avatar ?? ''} alt={meta.title} size={42} status={meta.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{meta.title}</p>
            <div className="flex items-center gap-2">
              <p className="truncate text-xs text-white/45">
                {isTyping ? <span className="text-cipher-300">typing…</span> : conv.isGroup ? 'Tap for group info' : meta.subtitle}
              </p>
              <CipherBadge className="hidden sm:inline-flex" />
            </div>
          </div>
        </button>
        {!conv.isGroup && meta.others[0] && (
          <>
            <button
              onClick={() => startCall(conversationId, meta.others[0].id, meta.others[0].name, false)}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Voice call"
            >
              <Phone className="h-5 w-5" />
            </button>
            <button
              onClick={() => startCall(conversationId, meta.others[0].id, meta.others[0].name, true)}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Video call"
            >
              <Video className="h-5 w-5" />
            </button>
          </>
        )}
        {conv.isGroup && (
          <>
            <button
              onClick={() => startGroupCall(conversationId, false)}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Group voice call"
            >
              <Phone className="h-5 w-5" />
            </button>
            <button
              onClick={() => startGroupCall(conversationId, true)}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Group video call"
            >
              <Video className="h-5 w-5" />
            </button>
          </>
        )}
        <button
          onClick={() => setShowRingtone((s) => !s)}
          className={`rounded-full p-2 hover:bg-white/10 ${showRingtone ? 'text-cipher-300' : 'text-white/50 hover:text-white'}`}
          aria-label="Ringtone for this chat"
        >
          <Music className="h-5 w-5" />
        </button>
        <button onClick={() => setShowSafety((s) => !s)} className="rounded-full p-2 text-cipher-300 hover:bg-white/10">
          <ShieldCheck className="h-5 w-5" />
        </button>
      </header>

      {showRingtone && (conv.isGroup || meta.others[0]) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden border-b border-white/5 bg-white/[0.02] px-4 py-3"
        >
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/60">
            <Music className="h-3.5 w-3.5" /> Ringtone for {conv.isGroup ? meta.title : meta.others[0].name}
          </p>
          {conv.isGroup && (
            <p className="mb-2 text-[11px] text-white/35">
              Plays whenever anyone in this group starts a call, whatever tone you&apos;ve given them
              individually.
            </p>
          )}
          {/* a group keys off the conversation, a 1:1 off the person */}
          <RingtonePicker targetId={conv.isGroup ? conv.id : meta.others[0].id} />
        </motion.div>
      )}

      {showSafety && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden border-b border-white/5 bg-cipher-600/10 px-4 py-3 text-xs"
        >
          <p className="flex items-center gap-1.5 font-medium text-cipher-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Safety number — verify this matches on both devices
          </p>
          <p className="mt-1 break-all font-mono text-white/60">{fingerprint || 'calculating…'}</p>
        </motion.div>
      )}

      {/* messages */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden py-4">
        <div className="mx-auto mb-3 flex max-w-sm items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-center text-[11px] text-white/40">
          <ShieldCheck className="h-3.5 w-3.5 text-cipher-400" />
          Messages are end-to-end encrypted. No one outside this chat can read them.
        </div>

        {grouped.map(({ m, showAvatar }) => {
          const replied = m.replyTo ? meta.convMessages.find((x) => x.id === m.replyTo) : null;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              isGroup={conv.isGroup}
              showAvatar={showAvatar}
              onReply={setReplyTo}
              replyPreview={
                replied
                  ? { name: userById(replied.senderId).name, text: replied.plaintext || 'attachment' }
                  : null
              }
            />
          );
        })}

        {isTyping && (
          <div className="flex items-end gap-2 px-2">
            {conv.isGroup && <span className="w-7" />}
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white/[0.08] px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-white/60"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="relative z-10">
        <MessageComposer conversationId={conversationId} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
      </div>

      {conv.isGroup && <GroupPanel conv={conv} open={showGroup} onClose={() => setShowGroup(false)} />}
    </div>
  );
}
