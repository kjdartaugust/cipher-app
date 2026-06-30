'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, ShieldCheck, Video } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { CipherBadge } from '@/components/ui/cipher-badge';
import { BlackHole } from './black-hole';
import { GroupPanel } from './group-panel';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { useConversationMeta } from './chat-helpers';
import { useApp } from '@/lib/store';
import { keyFingerprint } from '@/lib/crypto';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { conversations, me, typing, markConversationRead, userById, setChatting } = useApp();
  const conv = conversations.find((c) => c.id === conversationId);
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [showSafety, setShowSafety] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const meta = useConversationMeta(conv ?? ({ id: '', isGroup: false, memberIds: [me.id], createdAt: 0, lastMessageAt: 0 } as any));

  useEffect(() => {
    if (conversationId) markConversationRead(conversationId);
  }, [conversationId, meta.convMessages.length, markConversationRead]);

  // Broadcast "in a Cipher" presence while this thread is open.
  useEffect(() => {
    setChatting(true);
    return () => setChatting(false);
  }, [setChatting]);

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

  return (
    <div className="flex h-screen flex-col">
      {/* header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-black px-4 py-3">
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
          <Avatar src={meta.avatar ?? ''} alt={meta.title} size={42} online={meta.online} />
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
        <BlackHole count={meta.convMessages.length} />
        <button className="hidden rounded-full p-2 text-white/50 hover:bg-white/10 sm:block"><Phone className="h-5 w-5" /></button>
        <button className="hidden rounded-full p-2 text-white/50 hover:bg-white/10 sm:block"><Video className="h-5 w-5" /></button>
        <button onClick={() => setShowSafety((s) => !s)} className="rounded-full p-2 text-cipher-300 hover:bg-white/10">
          <ShieldCheck className="h-5 w-5" />
        </button>
      </header>

      {showSafety && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden border-b border-white/5 bg-cipher-600/10 px-4 py-3 text-xs"
        >
          <p className="flex items-center gap-1.5 font-medium text-cipher-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Safety number — verify this matches on both devices
          </p>
          <p className="mt-1 font-mono text-white/60">{fingerprint || 'calculating…'}</p>
        </motion.div>
      )}

      {/* messages */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto py-4">
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

      <MessageComposer conversationId={conversationId} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />

      {conv.isGroup && <GroupPanel conv={conv} open={showGroup} onClose={() => setShowGroup(false)} />}
    </div>
  );
}
