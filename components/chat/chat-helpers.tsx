'use client';

import { useApp } from '@/lib/store';
import type { Conversation } from '@/lib/types';

export function useConversationMeta(conv: Conversation) {
  const { userById, me, messages } = useApp();
  const others = conv.memberIds.filter((id) => id !== me.id).map(userById);
  const title = conv.isGroup ? conv.name ?? 'Group chat' : others[0]?.name ?? 'Unknown';
  const avatar = conv.isGroup ? conv.avatar ?? others[0]?.avatar : others[0]?.avatar;
  const online = !conv.isGroup && others[0]?.online;
  const subtitle = conv.isGroup
    ? `${conv.memberIds.length} members`
    : others[0]?.online
      ? 'Active now'
      : `@${others[0]?.username}`;

  const convMessages = messages
    .filter((m) => m.conversationId === conv.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const last = convMessages[convMessages.length - 1];
  const unread = convMessages.filter(
    (m) => m.senderId !== me.id && !m.readBy.includes(me.id)
  ).length;

  return { others, title, avatar, online, subtitle, last, unread, convMessages };
}

export function lastMessagePreview(
  last: ReturnType<typeof useConversationMeta>['last']
): string {
  if (!last) return 'No messages yet';
  if (last.deleted) return 'Message deleted';
  if (last.kind === 'call') return `📞 ${last.plaintext ?? 'Call'}`;
  if (last.kind === 'voice') return '🎤 Voice message';
  if (last.kind === 'image') return '📷 Photo';
  if (last.kind === 'file') return `📎 ${last.meta?.fileName ?? 'File'}`;
  return last.plaintext ?? '🔒 Encrypted message';
}
