'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { AppContext, type AppContextValue, type AppState } from './app-context';
import { createClient } from './supabase/client';
import { db, loadEverything, mapMessage } from './supabase/db';
import {
  decryptMessage,
  encryptMessage,
  generateConversationKey,
  openSealedKey,
  sealKeyForMember,
} from './crypto';
import { ensureKeyPair } from './keys';
import type { KeyPair } from './crypto';
import type { Message, MessageKind, Post, User } from './types';
import { useApp } from './app-context';

export { useApp };

const EMPTY: AppState = { users: [], posts: [], stories: [], conversations: [], messages: [], notifications: [] };

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [typing, setTyping] = useState<Record<string, string[]>>({});

  const sb = useRef<SupabaseClient | null>(null);
  const myId = useRef<string>('');
  const keypair = useRef<KeyPair | null>(null);
  const sealed = useRef<Record<string, string>>({});
  const convKey = useRef<Record<string, string>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  if (!sb.current) sb.current = createClient();

  // -------------------------------- bootstrap --------------------------------
  useEffect(() => {
    let cancelled = false;
    const supabase = sb.current;
    if (!supabase) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return; // layout will have redirected to /login
      myId.current = auth.user.id;
      const { pair } = await ensureKeyPair(auth.user.id);
      keypair.current = pair;

      const data = await loadEverything(supabase, auth.user.id);
      sealed.current = data.sealedKeys;
      const messages = await decryptAll(data.messages);
      if (cancelled) return;
      setState({
        users: data.users,
        posts: data.posts,
        stories: data.stories,
        conversations: data.conversations,
        messages,
        notifications: data.notifications,
      });
      setReady(true);
      subscribe(supabase, data.conversations.map((c) => c.id));
    })();
    return () => {
      cancelled = true;
      channel.current?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unwrap = useCallback(async (conversationId: string) => {
    if (convKey.current[conversationId]) return convKey.current[conversationId];
    const env = sealed.current[conversationId];
    const kp = keypair.current!;
    const key = await openSealedKey(env, kp.publicKey, kp.privateKey);
    convKey.current[conversationId] = key;
    return key;
  }, []);

  const decryptAll = useCallback(async (msgs: Message[]) => {
    const out: Message[] = [];
    for (const m of msgs) {
      if (m.deleted) { out.push(m); continue; }
      try {
        const key = await unwrap(m.conversationId);
        out.push({ ...m, plaintext: await decryptMessage(m.encrypted, key) });
      } catch {
        out.push({ ...m, plaintext: '🔒 Unable to decrypt' });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unwrap]);

  // background decrypt for any message lacking plaintext (e.g. realtime arrivals)
  useEffect(() => {
    if (!ready) return;
    const pending = state.messages.filter((m) => m.plaintext === undefined && !m.deleted);
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      for (const m of pending) {
        try {
          updates[m.id] = await decryptMessage(m.encrypted, await unwrap(m.conversationId));
        } catch {
          updates[m.id] = '🔒 Unable to decrypt';
        }
      }
      if (cancelled) return;
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) => (updates[m.id] !== undefined ? { ...m, plaintext: updates[m.id] } : m)),
      }));
    })();
    return () => { cancelled = true; };
  }, [state.messages, ready, unwrap]);

  // -------------------------------- realtime ---------------------------------
  const channel = useRef<RealtimeChannel | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>();

  const reloadSocial = useCallback(() => {
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(async () => {
      const supabase = sb.current;
      if (!supabase || !myId.current) return;
      const data = await loadEverything(supabase, myId.current);
      sealed.current = data.sealedKeys;
      setState((s) => ({
        ...s,
        users: data.users,
        posts: data.posts,
        stories: data.stories,
        conversations: data.conversations,
        notifications: data.notifications,
      }));
    }, 350);
  }, []);

  const refetchMessageMeta = useCallback(async (messageId: string) => {
    const supabase = sb.current!;
    const [{ data: r }, { data: rc }] = await Promise.all([
      supabase.from('message_reactions').select('*').eq('message_id', messageId),
      supabase.from('message_receipts').select('*').eq('message_id', messageId),
    ]);
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          reactions: (r ?? []).map((x: any) => ({ userId: x.user_id, emoji: x.emoji })),
          deliveredTo: Array.from(new Set([m.senderId, ...(rc ?? []).filter((x: any) => x.delivered).map((x: any) => x.user_id)])),
          readBy: Array.from(new Set([m.senderId, ...(rc ?? []).filter((x: any) => x.read).map((x: any) => x.user_id)])),
        };
      }),
    }));
  }, []);

  function subscribe(supabase: SupabaseClient, convIds: string[]) {
    const ch = supabase.channel('cipher-rt');

    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (p: any) => {
      const row = p.new ?? p.old;
      if (!row || !convIds.includes(row.conversation_id)) return;
      if (p.eventType === 'INSERT') {
        setState((s) => {
          if (s.messages.some((m) => m.id === row.id)) return s;
          return { ...s, messages: [...s.messages, mapMessage(row, [], [])] };
        });
        if (row.sender_id !== myId.current) {
          db.receiptDelivered(supabase, row.id, myId.current);
        }
      } else if (p.eventType === 'UPDATE') {
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === row.id
              ? { ...m, deleted: row.deleted, editedAt: row.edited_at ? new Date(row.edited_at).getTime() : m.editedAt, encrypted: { ciphertext: row.ciphertext, nonce: row.nonce }, plaintext: row.deleted ? '' : undefined }
              : m
          ),
        }));
      }
    });
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (p: any) => {
      const id = (p.new ?? p.old)?.message_id;
      if (id) refetchMessageMeta(id);
    });
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts' }, (p: any) => {
      const id = (p.new ?? p.old)?.message_id;
      if (id) refetchMessageMeta(id);
    });
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId.current}` }, () => reloadSocial());
    for (const t of ['posts', 'likes', 'saves', 'comments', 'follows', 'profiles', 'stories', 'story_views']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => reloadSocial());
    }
    // typing indicators via broadcast
    ch.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
      if (payload.userId === myId.current) return;
      setTyping((t) => ({ ...t, [payload.convId]: [payload.userId] }));
      clearTimeout(typingTimers.current[payload.convId]);
      typingTimers.current[payload.convId] = setTimeout(
        () => setTyping((t) => ({ ...t, [payload.convId]: [] })),
        3000
      );
    });

    ch.subscribe();
    channel.current = ch;
  }

  // -------------------------------- derived ----------------------------------
  const me: User = useMemo(
    () =>
      state.users.find((u) => u.id === myId.current) ?? {
        id: myId.current, username: 'you', name: 'You', avatar: '', bio: '', publicKey: '', followers: [], following: [], online: true,
      },
    [state.users]
  );
  const userById = useCallback(
    (id: string) => state.users.find((u) => u.id === id) ?? { id, username: 'unknown', name: 'Unknown', avatar: '', bio: '', publicKey: '', followers: [], following: [] },
    [state.users]
  );

  // -------------------------------- actions ----------------------------------
  const supa = () => sb.current!;
  const mine = () => myId.current;

  const toggleLike = useCallback((postId: string) => {
    const liked = state.posts.find((p) => p.id === postId)?.likes.includes(mine());
    setState((s) => ({ ...s, posts: s.posts.map((p) => p.id === postId ? { ...p, likes: liked ? p.likes.filter((i) => i !== mine()) : [...p.likes, mine()] } : p) }));
    const post = state.posts.find((p) => p.id === postId);
    (liked ? db.unlike(supa(), postId, mine()) : db.like(supa(), postId, mine())).then(() => {
      if (!liked && post && post.authorId !== mine()) db.notify(supa(), { user_id: post.authorId, actor_id: mine(), type: 'like', target_id: postId, preview: 'liked your post' });
    });
  }, [state.posts]);

  const toggleSave = useCallback((postId: string) => {
    const saved = state.posts.find((p) => p.id === postId)?.saves.includes(mine());
    setState((s) => ({ ...s, posts: s.posts.map((p) => p.id === postId ? { ...p, saves: saved ? p.saves.filter((i) => i !== mine()) : [...p.saves, mine()] } : p) }));
    saved ? db.unsave(supa(), postId, mine()) : db.save(supa(), postId, mine());
  }, [state.posts]);

  const sharePost = useCallback((postId: string) => {
    const post = state.posts.find((p) => p.id === postId);
    const shares = (post?.shares ?? 0) + 1;
    setState((s) => ({ ...s, posts: s.posts.map((p) => p.id === postId ? { ...p, shares } : p) }));
    db.setShares(supa(), postId, shares);
  }, [state.posts]);

  const addComment = useCallback((postId: string, text: string) => {
    const post = state.posts.find((p) => p.id === postId);
    db.insertComment(supa(), postId, mine(), text).then(({ data }) => {
      if (data) setState((s) => ({ ...s, posts: s.posts.map((p) => p.id === postId ? { ...p, comments: [...p.comments, { id: data.id, authorId: mine(), text, createdAt: Date.now(), likes: [] }] } : p) }));
      if (post && post.authorId !== mine()) db.notify(supa(), { user_id: post.authorId, actor_id: mine(), type: 'comment', target_id: postId, preview: `commented: ${text.slice(0, 40)}` });
    });
  }, [state.posts]);

  const createPost = useCallback((text: string, media?: Post['media']) => {
    db.insertPost(supa(), { author_id: mine(), text, media }).then(({ data }) => {
      if (data) setState((s) => ({ ...s, posts: [{ id: data.id, authorId: mine(), text, media, createdAt: Date.now(), likes: [], saves: [], shares: 0, comments: [] }, ...s.posts] }));
    });
  }, []);

  const toggleFollow = useCallback((userId: string) => {
    const following = me.following.includes(userId);
    setState((s) => ({
      ...s,
      users: s.users.map((u) => {
        if (u.id === mine()) return { ...u, following: following ? u.following.filter((i) => i !== userId) : [...u.following, userId] };
        if (u.id === userId) return { ...u, followers: following ? u.followers.filter((i) => i !== mine()) : [...u.followers, mine()] };
        return u;
      }),
    }));
    if (following) db.unfollow(supa(), mine(), userId);
    else db.follow(supa(), mine(), userId).then(() => db.notify(supa(), { user_id: userId, actor_id: mine(), type: 'follow' }));
  }, [me.following]);

  const viewStory = useCallback((storyId: string, reaction?: string) => {
    setState((s) => ({
      ...s,
      stories: s.stories.map((st) => st.id === storyId ? { ...st, viewers: [...st.viewers.filter((v) => v.userId !== mine()), { userId: mine(), reaction: reaction ?? st.viewers.find((v) => v.userId === mine())?.reaction, at: Date.now() }] } : st),
    }));
    const story = state.stories.find((st) => st.id === storyId);
    db.viewStory(supa(), storyId, mine(), reaction);
    if (reaction && story && story.authorId !== mine()) db.notify(supa(), { user_id: story.authorId, actor_id: mine(), type: 'reaction', preview: `reacted ${reaction} to your story` });
  }, [state.stories]);

  const decryptedFor = useCallback(
    (conversationId: string) => state.messages.filter((m) => m.conversationId === conversationId),
    [state.messages]
  );

  const sendMessage = useCallback(async (conversationId: string, kind: MessageKind, text: string, meta?: Message['meta'], replyTo?: string) => {
    const key = await unwrap(conversationId);
    const enc = await encryptMessage(text, key);
    const { data } = await db.insertMessage(supa(), { conversation_id: conversationId, sender_id: mine(), kind, ciphertext: enc.ciphertext, nonce: enc.nonce, meta, reply_to: replyTo });
    if (data) {
      setState((s) => ({
        ...s,
        messages: [...s.messages, { id: data.id, conversationId, senderId: mine(), kind, encrypted: enc, plaintext: text, meta, createdAt: Date.now(), reactions: [], deliveredTo: [mine()], readBy: [mine()], replyTo }],
        conversations: s.conversations.map((c) => c.id === conversationId ? { ...c, lastMessageAt: Date.now() } : c),
      }));
    }
    db.touchConversation(supa(), conversationId);
    db.receiptRead(supa(), [{ message_id: data!.id, user_id: mine() }]);
    const conv = state.conversations.find((c) => c.id === conversationId);
    conv?.memberIds.filter((id) => id !== mine()).forEach((id) =>
      db.notify(supa(), { user_id: id, actor_id: mine(), type: 'message', target_id: conversationId, preview: 'sent you a message' })
    );
  }, [unwrap, state.conversations]);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    const msg = state.messages.find((m) => m.id === messageId);
    const existing = msg?.reactions.find((r) => r.userId === mine());
    const remove = existing?.emoji === emoji;
    setState((s) => ({ ...s, messages: s.messages.map((m) => m.id === messageId ? { ...m, reactions: remove ? m.reactions.filter((r) => r.userId !== mine()) : [...m.reactions.filter((r) => r.userId !== mine()), { userId: mine(), emoji }] } : m) }));
    remove ? db.reactDelete(supa(), messageId, mine()) : db.reactUpsert(supa(), messageId, mine(), emoji);
  }, [state.messages]);

  const editMessage = useCallback(async (messageId: string, text: string) => {
    const msg = state.messages.find((m) => m.id === messageId);
    if (!msg) return;
    const enc = await encryptMessage(text, await unwrap(msg.conversationId));
    setState((s) => ({ ...s, messages: s.messages.map((m) => m.id === messageId ? { ...m, encrypted: enc, plaintext: text, editedAt: Date.now() } : m) }));
    db.editMessage(supa(), messageId, enc.ciphertext, enc.nonce);
  }, [state.messages, unwrap]);

  const deleteMessage = useCallback((messageId: string) => {
    setState((s) => ({ ...s, messages: s.messages.map((m) => m.id === messageId ? { ...m, deleted: true, plaintext: '', reactions: [] } : m) }));
    db.deleteMessage(supa(), messageId);
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    const unreadIds = state.messages.filter((m) => m.conversationId === conversationId && m.senderId !== mine() && !m.readBy.includes(mine())).map((m) => m.id);
    if (unreadIds.length) {
      setState((s) => ({ ...s, messages: s.messages.map((m) => unreadIds.includes(m.id) ? { ...m, readBy: [...m.readBy, mine()] } : m) }));
      db.receiptRead(supa(), unreadIds.map((id) => ({ message_id: id, user_id: mine() })));
    }
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => n.type === 'message' && n.targetId === conversationId ? { ...n, read: true } : n) }));
    db.markConvNotifRead(supa(), mine(), conversationId);
  }, [state.messages]);

  const startTyping = useCallback((conversationId: string) => {
    channel.current?.send({ type: 'broadcast', event: 'typing', payload: { convId: conversationId, userId: mine() } });
  }, []);

  const createConversation = useCallback(async (memberIds: string[], name?: string) => {
    const ids = Array.from(new Set([mine(), ...memberIds]));
    const existing = state.conversations.find((c) => !name && c.memberIds.length === ids.length && ids.every((i) => c.memberIds.includes(i)));
    if (existing) return existing.id;
    const isGroup = ids.length > 2 || !!name;
    const { data: conv } = await db.insertConversation(supa(), { is_group: isGroup, name });
    const { data: keys } = await db.publicKeys(supa(), ids);
    const ck = await generateConversationKey();
    const rows = [] as { conversation_id: string; user_id: string; sealed_key: string }[];
    for (const id of ids) {
      const pk = (keys ?? []).find((k: any) => k.id === id)?.public_key;
      if (!pk) continue;
      rows.push({ conversation_id: conv.id, user_id: id, sealed_key: await sealKeyForMember(ck, pk) });
    }
    await db.insertMembers(supa(), rows);
    sealed.current[conv.id] = rows.find((r) => r.user_id === mine())!.sealed_key;
    convKey.current[conv.id] = ck;
    setState((s) => ({ ...s, conversations: [{ id: conv.id, isGroup, name, memberIds: ids, createdAt: Date.now(), lastMessageAt: Date.now() }, ...s.conversations] }));
    return conv.id;
  }, [state.conversations]);

  const markAllNotificationsRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    db.markNotifRead(supa(), mine());
  }, []);

  const signOut = useCallback(async () => {
    await sb.current?.auth.signOut();
    window.location.href = '/login';
  }, []);

  const value: AppContextValue = {
    ...state, me, ready, typing,
    toggleLike, toggleSave, sharePost, addComment, createPost, toggleFollow,
    viewStory, sendMessage, reactToMessage, editMessage, deleteMessage,
    markConversationRead, startTyping, createConversation, decryptedFor,
    markAllNotificationsRead, userById, signOut,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
