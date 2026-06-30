'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AppNotification,
  Comment,
  Conversation,
  Message,
  Post,
  Story,
  User,
} from '@/lib/types';

type DB = SupabaseClient;
const ts = (s: string | null | undefined) => (s ? new Date(s).getTime() : Date.now());

export interface LoadedData {
  users: User[];
  posts: Post[];
  stories: Story[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
  sealedKeys: Record<string, string>; // conversationId -> my sealed key
  blocked: string[];
}

// ----------------------------- loading -------------------------------------
export async function loadEverything(supabase: DB, myId: string): Promise<LoadedData> {
  const [
    { data: profiles },
    { data: follows },
    { data: posts },
    { data: likes },
    { data: saves },
    { data: comments },
    { data: stories },
    { data: storyViews },
    { data: myMemberships },
    { data: notifications },
    { data: blocks },
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('follows').select('*'),
    supabase.from('posts').select('*').order('created_at', { ascending: false }),
    supabase.from('likes').select('*'),
    supabase.from('saves').select('*'),
    supabase.from('comments').select('*').order('created_at'),
    supabase.from('stories').select('*').gt('expires_at', new Date().toISOString()),
    supabase.from('story_views').select('*'),
    supabase.from('conversation_members').select('*').eq('user_id', myId),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', myId),
  ]);

  const convIds = (myMemberships ?? []).map((m: any) => m.conversation_id);
  const sealedKeys: Record<string, string> = {};
  for (const m of myMemberships ?? []) sealedKeys[m.conversation_id] = m.sealed_key;

  let conversations: any[] = [];
  let allMembers: any[] = [];
  let messages: any[] = [];
  let reactions: any[] = [];
  let receipts: any[] = [];
  if (convIds.length) {
    const [conv, members, msgs] = await Promise.all([
      supabase.from('conversations').select('*').in('id', convIds),
      supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', convIds),
      supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at'),
    ]);
    conversations = conv.data ?? [];
    allMembers = members.data ?? [];
    messages = msgs.data ?? [];
    const msgIds = messages.map((m) => m.id);
    if (msgIds.length) {
      const [r, rc] = await Promise.all([
        supabase.from('message_reactions').select('*').in('message_id', msgIds),
        supabase.from('message_receipts').select('*').in('message_id', msgIds),
      ]);
      reactions = r.data ?? [];
      receipts = rc.data ?? [];
    }
  }

  // ---- map profiles -> User[] with derived follow arrays ----
  const users: User[] = (profiles ?? []).map((p: any) => ({
    id: p.id,
    username: p.username,
    name: p.name,
    avatar: p.avatar ?? `https://api.dicebear.com/9.x/glass/svg?seed=${p.username}`,
    bio: p.bio ?? '',
    publicKey: p.public_key ?? '',
    verified: p.verified ?? false,
    online: false,
    private: p.private ?? false,
    followers: (follows ?? []).filter((f: any) => f.following_id === p.id).map((f: any) => f.follower_id),
    following: (follows ?? []).filter((f: any) => f.follower_id === p.id).map((f: any) => f.following_id),
  }));

  // ---- posts ----
  const mappedPosts: Post[] = (posts ?? []).map((p: any) => {
    const postLikes = (likes ?? []).filter((l: any) => l.post_id === p.id).map((l: any) => l.user_id);
    const postComments: Comment[] = (comments ?? [])
      .filter((c: any) => c.post_id === p.id)
      .map((c: any) => ({ id: c.id, authorId: c.author_id, text: c.text, createdAt: ts(c.created_at), likes: [] }));
    return {
      id: p.id,
      authorId: p.author_id,
      text: p.text ?? '',
      media: p.media ?? [],
      createdAt: ts(p.created_at),
      likes: postLikes,
      saves: (saves ?? []).filter((s: any) => s.post_id === p.id).map((s: any) => s.user_id),
      shares: p.shares ?? 0,
      comments: postComments,
      trendingScore: postLikes.length * 3 + postComments.length * 4 + (p.shares ?? 0) * 2,
    };
  });

  // ---- stories ----
  const mappedStories: Story[] = (stories ?? []).map((s: any) => ({
    id: s.id,
    authorId: s.author_id,
    kind: s.kind ?? 'photo',
    media: s.media ?? undefined,
    text: s.text ?? undefined,
    audioDuration: s.audio_duration ?? undefined,
    createdAt: ts(s.created_at),
    expiresAt: ts(s.expires_at),
    highlighted: s.highlighted ?? false,
    viewers: (storyViews ?? [])
      .filter((v: any) => v.story_id === s.id)
      .map((v: any) => ({ userId: v.viewer_id, reaction: v.reaction ?? undefined, at: ts(v.viewed_at) })),
  }));

  // ---- conversations ----
  const mappedConvs: Conversation[] = conversations.map((c: any) => ({
    id: c.id,
    isGroup: c.is_group,
    name: c.name ?? undefined,
    avatar: c.avatar ?? undefined,
    memberIds: allMembers.filter((m) => m.conversation_id === c.id).map((m) => m.user_id),
    createdAt: ts(c.created_at),
    lastMessageAt: ts(c.last_message_at),
  }));

  // ---- messages (still encrypted; provider decrypts) ----
  const mappedMsgs: Message[] = messages.map((m: any) => mapMessage(m, reactions, receipts));

  // ---- notifications ----
  const mappedNotifs: AppNotification[] = (notifications ?? []).map((n: any) => ({
    id: n.id,
    type: n.type,
    actorId: n.actor_id,
    targetId: n.target_id ?? undefined,
    preview: n.preview ?? undefined,
    createdAt: ts(n.created_at),
    read: n.read ?? false,
  }));

  return {
    users,
    posts: mappedPosts,
    stories: mappedStories,
    conversations: mappedConvs,
    messages: mappedMsgs,
    notifications: mappedNotifs,
    sealedKeys,
    blocked: (blocks ?? []).map((b: any) => b.blocked_id),
  };
}

export function mapMessage(m: any, reactions: any[], receipts: any[]): Message {
  const r = reactions.filter((x) => x.message_id === m.id);
  const rc = receipts.filter((x) => x.message_id === m.id);
  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    kind: m.kind ?? 'text',
    encrypted: { ciphertext: m.ciphertext, nonce: m.nonce },
    meta: m.meta ?? undefined,
    createdAt: ts(m.created_at),
    editedAt: m.edited_at ? ts(m.edited_at) : undefined,
    deleted: m.deleted ?? false,
    replyTo: m.reply_to ?? undefined,
    reactions: r.map((x) => ({ userId: x.user_id, emoji: x.emoji })),
    deliveredTo: Array.from(new Set([m.sender_id, ...rc.filter((x) => x.delivered).map((x) => x.user_id)])),
    readBy: Array.from(new Set([m.sender_id, ...rc.filter((x) => x.read).map((x) => x.user_id)])),
  };
}

// ----------------------------- mutations ------------------------------------
export const db = {
  insertPost: (s: DB, row: { author_id: string; text: string; media: Post['media'] }) =>
    s.from('posts').insert({ author_id: row.author_id, text: row.text, media: row.media ?? [] }).select().single(),

  insertComment: (s: DB, postId: string, authorId: string, text: string) =>
    s.from('comments').insert({ post_id: postId, author_id: authorId, text }).select().single(),
  deletePost: (s: DB, postId: string) => s.from('posts').delete().eq('id', postId),

  like: (s: DB, postId: string, userId: string) => s.from('likes').insert({ post_id: postId, user_id: userId }),
  unlike: (s: DB, postId: string, userId: string) => s.from('likes').delete().match({ post_id: postId, user_id: userId }),
  save: (s: DB, postId: string, userId: string) => s.from('saves').insert({ post_id: postId, user_id: userId }),
  unsave: (s: DB, postId: string, userId: string) => s.from('saves').delete().match({ post_id: postId, user_id: userId }),
  setShares: (s: DB, postId: string, shares: number) => s.from('posts').update({ shares }).eq('id', postId),

  follow: (s: DB, follower: string, following: string) => s.from('follows').insert({ follower_id: follower, following_id: following }),
  unfollow: (s: DB, follower: string, following: string) => s.from('follows').delete().match({ follower_id: follower, following_id: following }),

  viewStory: (s: DB, storyId: string, viewerId: string, reaction?: string) =>
    s.from('story_views').upsert({ story_id: storyId, viewer_id: viewerId, reaction: reaction ?? null, viewed_at: new Date().toISOString() }),

  // Note: no .select() here — the creator is not a member yet, so the RLS
  // SELECT policy would hide the returned row. We supply the id ourselves.
  insertConversation: (s: DB, row: { id: string; is_group: boolean; name?: string }) =>
    s.from('conversations').insert({ id: row.id, is_group: row.is_group, name: row.name ?? null }),
  insertMembers: (s: DB, rows: { conversation_id: string; user_id: string; sealed_key: string }[]) =>
    s.from('conversation_members').insert(rows),
  updateConversation: (s: DB, id: string, patch: { name?: string; avatar?: string }) =>
    s.from('conversations').update(patch).eq('id', id),
  removeMember: (s: DB, conversationId: string, userId: string) =>
    s.from('conversation_members').delete().match({ conversation_id: conversationId, user_id: userId }),

  insertMessage: (
    s: DB,
    row: { conversation_id: string; sender_id: string; kind: string; ciphertext: string; nonce: string; meta?: any; reply_to?: string }
  ) => s.from('messages').insert({ ...row, meta: row.meta ?? {}, reply_to: row.reply_to ?? null }).select().single(),
  touchConversation: (s: DB, id: string) => s.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', id),

  reactDelete: (s: DB, messageId: string, userId: string) => s.from('message_reactions').delete().match({ message_id: messageId, user_id: userId }),
  reactUpsert: (s: DB, messageId: string, userId: string, emoji: string) =>
    s.from('message_reactions').upsert({ message_id: messageId, user_id: userId, emoji }),

  editMessage: (s: DB, id: string, ciphertext: string, nonce: string) =>
    s.from('messages').update({ ciphertext, nonce, edited_at: new Date().toISOString() }).eq('id', id),
  deleteMessage: (s: DB, id: string) => s.from('messages').update({ deleted: true }).eq('id', id),

  receiptDelivered: (s: DB, messageId: string, userId: string) =>
    s.from('message_receipts').upsert({ message_id: messageId, user_id: userId, delivered: true, at: new Date().toISOString() }),
  receiptRead: (s: DB, rows: { message_id: string; user_id: string }[]) =>
    s.from('message_receipts').upsert(rows.map((r) => ({ ...r, delivered: true, read: true, at: new Date().toISOString() }))),

  notify: (s: DB, row: { user_id: string; actor_id: string; type: string; target_id?: string; preview?: string }) =>
    s.from('notifications').insert({ ...row, target_id: row.target_id ?? null, preview: row.preview ?? null }),
  markNotifRead: (s: DB, userId: string) => s.from('notifications').update({ read: true }).eq('user_id', userId),
  markConvNotifRead: (s: DB, userId: string, convId: string) =>
    s.from('notifications').update({ read: true }).match({ user_id: userId, type: 'message', target_id: convId }),

  publicKeys: (s: DB, ids: string[]) => s.from('profiles').select('id,public_key').in('id', ids),

  updateProfile: (s: DB, id: string, patch: { name?: string; bio?: string; avatar?: string; private?: boolean }) =>
    s.from('profiles').update(patch).eq('id', id),

  insertMoment: (
    s: DB,
    row: { author_id: string; kind: string; text?: string; audio_duration?: number; expires_at: string }
  ) =>
    s.from('stories').insert({
      author_id: row.author_id,
      kind: row.kind,
      text: row.text ?? null,
      audio_duration: row.audio_duration ?? null,
      media: null,
      expires_at: row.expires_at,
    }).select().single(),

  myBlocks: (s: DB, me: string) => s.from('blocks').select('blocked_id').eq('blocker_id', me),
  block: (s: DB, me: string, target: string) => s.from('blocks').insert({ blocker_id: me, blocked_id: target }),
  unblock: (s: DB, me: string, target: string) => s.from('blocks').delete().match({ blocker_id: me, blocked_id: target }),
  deleteProfile: (s: DB, id: string) => s.from('profiles').delete().eq('id', id),
};
