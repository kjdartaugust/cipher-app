'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, CornerUpLeft, Download, Lock, Pencil, Phone, Smile, Trash2, Video } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { VoiceNote } from './voice-note';
import { useApp } from '@/lib/store';
import type { Message } from '@/lib/types';
import { cn, clockTime } from '@/lib/utils';

const QUICK = ['❤️', '😂', '🔥', '👍', '😮', '💜'];

export function MessageBubble({
  message,
  isGroup,
  showAvatar,
  onReply,
  replyPreview,
}: {
  message: Message;
  isGroup: boolean;
  showAvatar: boolean;
  onReply: (m: Message) => void;
  replyPreview?: { name: string; text: string } | null;
}) {
  const { me, userById, reactToMessage, deleteMessage, editMessage, conversations } = useApp();
  const mine = message.senderId === me.id;
  const sender = userById(message.senderId);
  // images get their own rounded frame; text / voice / file sit in a chat bubble
  const hasBubble = message.kind !== 'image';
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.plaintext ?? '');

  const conv = conversations.find((c) => c.id === message.conversationId);
  const recipients = conv ? conv.memberIds.filter((id) => id !== me.id) : [];
  const read = recipients.length > 0 && recipients.every((id) => message.readBy.includes(id));
  const delivered = recipients.length > 0 && recipients.every((id) => message.deliveredTo.includes(id));

  if (message.deleted) {
    return (
      <Wrap mine={mine} showAvatar={showAvatar} sender={sender} isGroup={isGroup}>
        <div className={cn('max-w-[80%] py-1 text-sm italic text-white/30', mine && 'text-right')}>
          message unsent
        </div>
      </Wrap>
    );
  }

  // call records render as a centered system pill
  if (message.kind === 'call') {
    const missed = message.meta?.duration === undefined || message.meta?.duration === null;
    const video = message.meta?.callKind === 'video';
    return (
      <div className="my-1 flex justify-center px-3">
        <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs', missed ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-white/10 bg-white/5 text-white/55')}>
          {video ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
          {message.plaintext || 'Call'}
          <span className="text-white/30">· {clockTime(message.createdAt)}</span>
        </span>
      </div>
    );
  }

  return (
    <Wrap mine={mine} showAvatar={showAvatar} sender={sender} isGroup={isGroup}>
      <div className={cn('group relative max-w-[80%]', mine && 'flex flex-col items-end')}>
        {!mine && isGroup && (
          <p className="mb-1 px-1 text-[11px] font-semibold text-violet-300">
            {sender.name}
          </p>
        )}

        {replyPreview && (
          <div
            className={cn(
              'mb-1 border-l-2 border-violet-500 pl-2.5 text-xs',
              mine ? 'border-l-0 border-r-2 pl-0 pr-2.5 text-right' : ''
            )}
          >
            <p className="font-medium text-violet-300">{replyPreview.name}</p>
            <p className="truncate text-white/40">{replyPreview.text}</p>
          </div>
        )}

        <div
          className={cn(
            'relative',
            hasBubble
              ? cn(
                  'px-3.5 py-2 text-[15px] leading-relaxed',
                  mine
                    ? 'rounded-2xl rounded-br-md bg-violet-600 text-white shadow-sm shadow-violet-950/40'
                    : 'rounded-2xl rounded-bl-md border border-white/5 bg-white/[0.06] text-white'
                )
              : 'text-[15px] leading-relaxed text-white'
          )}
        >
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) {
                    editMessage(message.id, draft.trim());
                    setEditing(false);
                  }
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/40"
              />
              <button
                onClick={() => {
                  if (draft.trim()) editMessage(message.id, draft.trim());
                  setEditing(false);
                }}
                className="text-xs underline"
              >
                save
              </button>
            </div>
          ) : message.kind === 'voice' ? (
            <VoiceNote duration={message.meta?.duration ?? 8} mine={mine} src={message.plaintext || undefined} />
          ) : message.kind === 'image' ? (
            <span className="group/img relative block overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={message.plaintext} alt="" className="max-h-72 rounded-2xl" />
              <button
                onClick={() => downloadImage(message.plaintext ?? '')}
                title="Download"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition group-hover/img:opacity-100"
              >
                <Download className="h-4 w-4" />
              </button>
            </span>
          ) : message.kind === 'file' ? (
            <a className="flex items-center gap-2 underline" href={message.plaintext || '#'} target="_blank" rel="noreferrer">
              📎 {message.meta?.fileName ?? 'file'}
            </a>
          ) : (
            <span className="whitespace-pre-wrap break-words">{message.plaintext}</span>
          )}

          <span
            className={cn(
              'mt-1 flex select-none items-center gap-1 text-[10px]',
              mine ? 'justify-end' : 'justify-start',
              mine && hasBubble ? 'text-white/60' : 'text-white/35'
            )}
          >
            <Lock className={cn('h-2.5 w-2.5', mine && hasBubble ? 'text-white/60' : 'text-violet-400/60')} strokeWidth={2.5} />
            {message.editedAt && <span>edited ·</span>}
            {clockTime(message.createdAt)}
            {mine && (read ? <CheckCheck className="h-3 w-3 text-white" /> : delivered ? <CheckCheck className="h-3 w-3 text-white/55" /> : <Check className="h-3 w-3 text-white/55" />)}
          </span>
        </div>

        {/* reactions */}
        {message.reactions.length > 0 && (
          <div className={cn('-mt-1.5 flex flex-wrap gap-1', mine ? 'justify-end pr-1' : 'pl-1')}>
            {Object.entries(
              message.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => reactToMessage(message.id, emoji)}
                className="rounded-full border border-white/10 bg-ink px-1.5 py-0.5 text-xs"
              >
                {emoji} {count > 1 && count}
              </button>
            ))}
          </div>
        )}

        {/* hover actions */}
        <div
          className={cn(
            'absolute top-1/2 hidden -translate-y-1/2 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 lg:flex',
            mine ? '-left-24' : '-right-24'
          )}
        >
          <IconBtn onClick={() => setPicker((p) => !p)}><Smile className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={() => onReply(message)}><CornerUpLeft className="h-4 w-4" /></IconBtn>
          {mine && message.kind === 'text' && (
            <IconBtn onClick={() => { setDraft(message.plaintext ?? ''); setEditing(true); }}><Pencil className="h-4 w-4" /></IconBtn>
          )}
          {mine && <IconBtn onClick={() => deleteMessage(message.id)}><Trash2 className="h-4 w-4" /></IconBtn>}
        </div>

        <AnimatePresence>
          {picker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'absolute z-10 flex gap-1 rounded-full border border-white/10 bg-ink p-1 shadow-xl',
                mine ? 'right-0 -top-10' : 'left-0 -top-10'
              )}
            >
              {QUICK.map((e) => (
                <button
                  key={e}
                  onClick={() => { reactToMessage(message.id, e); setPicker(false); }}
                  className="rounded-full px-1 text-lg transition hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Wrap>
  );
}

function Wrap({
  mine,
  showAvatar,
  sender,
  isGroup,
  children,
}: {
  mine: boolean;
  showAvatar: boolean;
  sender: ReturnType<typeof useApp>['me'];
  isGroup: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: mine ? 18 : -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
      className={cn('flex items-start gap-2 px-3', mine ? 'flex-row-reverse' : 'flex-row')}
    >
      {!mine && isGroup ? (
        showAvatar ? <Avatar src={sender.avatar} alt={sender.name} size={28} /> : <span className="w-7" />
      ) : null}
      {children}
    </motion.div>
  );
}

async function downloadImage(url: string) {
  if (!url) return;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj;
    a.download = `cipher-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(obj);
  } catch {
    // cross-origin / offline — fall back to opening it
    window.open(url, '_blank');
  }
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}
