'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, CornerUpLeft, Lock, Pencil, Smile, Trash2 } from 'lucide-react';
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

  return (
    <Wrap mine={mine} showAvatar={showAvatar} sender={sender} isGroup={isGroup}>
      <div className={cn('group relative max-w-[80%]', mine && 'flex flex-col items-end')}>
        {!mine && (
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-400">
            {isGroup ? sender.name : sender.name}
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
            'relative text-[15px] leading-relaxed text-white',
            mine ? 'text-right' : 'text-left'
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
                className="bg-transparent text-white outline-none"
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.plaintext} alt="" className="max-h-72 rounded-lg" />
          ) : message.kind === 'file' ? (
            <a className="flex items-center gap-2 underline" href={message.plaintext || '#'} target="_blank" rel="noreferrer">
              📎 {message.meta?.fileName ?? 'file'}
            </a>
          ) : (
            <span className="whitespace-pre-wrap break-words">{message.plaintext}</span>
          )}

          <span className={cn('mt-0.5 flex items-center gap-1 text-[10px] text-white/30', mine ? 'justify-end' : 'justify-start')}>
            <Lock className="h-2.5 w-2.5 text-violet-400/50" strokeWidth={2.5} />
            {message.editedAt && <span>edited ·</span>}
            {clockTime(message.createdAt)}
            {mine && (read ? <CheckCheck className="h-3 w-3 text-violet-300" /> : delivered ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
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
            'absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition group-hover:opacity-100',
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

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}
