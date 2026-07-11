'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PenSquare, Search, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { NewChatModal } from './new-chat-modal';
import { useConversationMeta, lastMessagePreview } from './chat-helpers';
import { useApp } from '@/lib/store';
import type { Conversation } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

export function ConversationList() {
  const { conversations, messages } = useApp();
  const [query, setQuery] = useState('');
  const [newChat, setNewChat] = useState(false);

  // Sort by each conversation's newest message time — the same source the row's
  // timestamp/preview use — so the order always matches what's shown. Sorting by
  // the stored conv.lastMessageAt desyncs whenever a code path adds a message
  // without bumping it (e.g. logCall, or before an incoming refetch lands).
  const lastActivity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of messages) {
      if (m.createdAt > (map[m.conversationId] ?? 0)) map[m.conversationId] = m.createdAt;
    }
    return map;
  }, [messages]);

  const sorted = [...conversations].sort(
    (a, b) => (lastActivity[b.id] ?? b.lastMessageAt) - (lastActivity[a.id] ?? a.lastMessageAt)
  );

  return (
    <div className="flex h-[100dvh] flex-col border-r border-white/5 pb-[max(5rem,env(safe-area-inset-bottom))] lg:h-screen lg:pb-0">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          <button onClick={() => setNewChat(true)} className="rounded-full p-2 text-cipher-300 hover:bg-white/10">
            <PenSquare className="h-5 w-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="input pl-11 py-2.5"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.map((c) => (
          <Row key={c.id} conv={c} query={query} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-white/5 py-3 text-xs text-white/30">
        <ShieldCheck className="h-3.5 w-3.5" /> End-to-end encrypted
      </div>

      <NewChatModal open={newChat} onClose={() => setNewChat(false)} />
    </div>
  );
}

function Row({ conv, query }: { conv: Conversation; query: string }) {
  const params = useParams();
  const active = params?.id === conv.id;
  const { title, avatar, status, last, unread } = useConversationMeta(conv);

  if (query && !title.toLowerCase().includes(query.toLowerCase())) return null;

  return (
    <Link
      href={`/messages/${conv.id}`}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition hover:bg-white/5',
        active && 'bg-white/[0.06]'
      )}
    >
      <Avatar src={avatar ?? ''} alt={title} size={52} status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate', unread ? 'font-bold' : 'font-semibold')}>{title}</span>
          <span className="shrink-0 text-xs text-white/40">{last ? timeAgo(last.createdAt) : ''}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm', unread ? 'text-white/90' : 'text-white/45')}>
            {lastMessagePreview(last)}
          </span>
          {unread > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-cipher-600 px-1.5 text-xs font-bold text-white">
              {unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
