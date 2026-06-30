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
  generateKeyPair,
  keyFingerprint,
  openSealedKey,
  randomSalt,
  sealKeyForMember,
  unwrapPrivateKey,
  wrapPrivateKey,
} from './crypto';
import { loadKeyPair, storeKeyPair } from './keys';
import type { KeyPair } from './crypto';
import type { Message, MessageKind, Post, User } from './types';
import { useApp } from './app-context';

export { useApp };

const EMPTY: AppState = { users: [], posts: [], stories: [], conversations: [], messages: [], notifications: [] };

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [typing, setTyping] = useState<Record<string, string[]>>({});
  const [blocked, setBlocked] = useState<string[]>([]);
  const [presence, setPresence] = useState<Record<string, { status: 'online' | 'chatting'; at: number }>>({});
  const presenceCh = useRef<RealtimeChannel | null>(null);

  const sb = useRef<SupabaseClient | null>(null);
  const myId = useRef<string>('');
  const keypair = useRef<KeyPair | null>(null);
  const sealed = useRef<Record<string, string>>({});
  const convKey = useRef<Record<string, string>>({});
  const convIdsRef = useRef<string[]>([]);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const convReloadTimer = useRef<ReturnType<typeof setTimeout>>();

  if (!sb.current) sb.current = createClient();

  // -------------------------------- bootstrap --------------------------------
  // The provider mounts once in the root layout — possibly before there is a
  // session (e.g. on /login). So we load both on mount AND whenever auth state
  // changes (sign-in/sign-up), and we never leave the UI hung on an error.
  useEffect(() => {
    let cancelled = false;
    const supabase = sb.current;
    if (!supabase) return;

    async function boot(userId: string) {
      if (cancelled || myId.current === userId) return;
      myId.current = userId;
      try {
        // Use whatever key this device already holds (NEVER generate here — the
        // login page is the single owner of key creation/recovery). If it's
        // missing or doesn't match the published key, prompt to unlock.
        keypair.current = loadKeyPair(userId);
        // Authorize the realtime socket so RLS-protected change events reach us.
        const { data: sess } = await supabase!.auth.getSession();
        if (sess.session?.access_token) supabase!.realtime.setAuth(sess.session.access_token);
        const data = await loadEverything(supabase!, userId);
        sealed.current = data.sealedKeys;
        convIdsRef.current = data.conversations.map((c) => c.id);
        setBlocked(data.blocked);
        const myPub = data.users.find((u) => u.id === userId)?.publicKey;
        const mismatch = !keypair.current || (!!myPub && keypair.current.publicKey !== myPub);
        if (cancelled) return;
        setNeedsUnlock(mismatch);
        const messages = mismatch ? data.messages : await decryptAll(data.messages);
        if (cancelled) return;
        setState({
          users: data.users,
          posts: data.posts,
          stories: data.stories,
          conversations: data.conversations,
          messages,
          notifications: data.notifications,
        });
        subscribe(supabase!);
        subscribePresence(supabase!, userId);
      } catch (err) {
        // Don't trap the user on "Generating your keys…" — surface and continue.
        console.error('[Cipher] bootstrap failed:', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) boot(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      if (session?.user) boot(session.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      presenceCh.current?.unsubscribe();
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
      setBlocked(data.blocked);
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

  // Reload conversations + messages (e.g. when added to a new chat). Merges so
  // already-decrypted plaintext and optimistic messages are preserved.
  const refreshConversations = useCallback(() => {
    clearTimeout(convReloadTimer.current);
    convReloadTimer.current = setTimeout(async () => {
      const supabase = sb.current;
      if (!supabase || !myId.current) return;
      const data = await loadEverything(supabase, myId.current);
      sealed.current = data.sealedKeys;
      convIdsRef.current = data.conversations.map((c) => c.id);
      setState((s) => {
        const seen = new Map(s.messages.map((m) => [m.id, m]));
        const merged = data.messages.map((m) => {
          const old = seen.get(m.id);
          return old?.plaintext !== undefined ? { ...m, plaintext: old.plaintext } : m;
        });
        for (const m of s.messages) if (!merged.some((x) => x.id === m.id)) merged.push(m);
        return { ...s, conversations: data.conversations, messages: merged };
      });
    }, 250);
  }, []);

  // Polling fallback: even if the realtime socket isn't delivering events,
  // refresh conversations/messages every few seconds so nothing requires a
  // manual page refresh. Realtime (above) still provides instant updates when
  // available; this just guarantees eventual consistency.
  useEffect(() => {
    if (!ready) return;
    const iv = setInterval(() => refreshConversations(), 4000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshConversations(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVisible); };
  }, [ready, refreshConversations]);

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

  function subscribe(supabase: SupabaseClient) {
    const ch = supabase.channel('cipher-rt');

    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (p: any) => {
      const row = p.new ?? p.old;
      if (!row) return;
      // A message in a conversation we don't know about yet = we were just added.
      if (!convIdsRef.current.includes(row.conversation_id)) {
        refreshConversations();
        return;
      }
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
    // New conversation membership for me → load the new chat live.
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${myId.current}` }, () => refreshConversations());
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

  // ---- live presence: who is online / in a chat right now ----
  function subscribePresence(supabase: SupabaseClient, userId: string) {
    const ch = supabase.channel('presence:cipher', { config: { presence: { key: userId } } });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, { status?: 'online' | 'chatting'; at?: number }[]>;
      const map: Record<string, { status: 'online' | 'chatting'; at: number }> = {};
      for (const [id, metas] of Object.entries(state)) {
        const m = metas[metas.length - 1] ?? {};
        map[id] = { status: m.status === 'chatting' ? 'chatting' : 'online', at: m.at ?? Date.now() };
      }
      setPresence(map);
    });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') ch.track({ status: 'online', at: Date.now() });
    });
    presenceCh.current = ch;
  }

  const setChatting = useCallback((on: boolean) => {
    presenceCh.current?.track({ status: on ? 'chatting' : 'online', at: Date.now() });
  }, []);

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

  const createMoment = useCallback(async (kind: 'text' | 'voice', text: string, durationSec?: number) => {
    const now = Date.now();
    const expiresAt = new Date(now + 6 * 60 * 60 * 1000).toISOString();
    const { data } = await db.insertMoment(supa(), {
      author_id: mine(),
      kind,
      text: text || undefined, // text content, or the audio URL for voice
      audio_duration: kind === 'voice' ? durationSec : undefined,
      expires_at: expiresAt,
    });
    if (data) {
      setState((s) => ({
        ...s,
        stories: [
          {
            id: data.id,
            authorId: mine(),
            kind,
            text: text || undefined, // text content, or the audio URL for voice
            audioDuration: kind === 'voice' ? durationSec : undefined,
            createdAt: now,
            expiresAt: now + 6 * 60 * 60 * 1000,
            viewers: [],
          },
          ...s.stories,
        ],
      }));
    }
  }, []);

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
    const convId = crypto.randomUUID();

    // Fetch every member's public key up front so we can seal the conversation key.
    const { data: keys, error: keyErr } = await db.publicKeys(supa(), ids);
    if (keyErr) throw new Error(keyErr.message);
    const missing = ids.filter((id) => !(keys ?? []).find((k: any) => k.id === id)?.public_key);
    if (missing.length) throw new Error('A selected member has not set up encryption keys yet.');

    const ck = await generateConversationKey();
    const rows: { conversation_id: string; user_id: string; sealed_key: string }[] = [];
    for (const id of ids) {
      const pk = (keys ?? []).find((k: any) => k.id === id)!.public_key;
      rows.push({ conversation_id: convId, user_id: id, sealed_key: await sealKeyForMember(ck, pk) });
    }

    const { error: convErr } = await db.insertConversation(supa(), { id: convId, is_group: isGroup, name });
    if (convErr) throw new Error(convErr.message);
    const { error: memErr } = await db.insertMembers(supa(), rows);
    if (memErr) throw new Error(memErr.message);

    sealed.current[convId] = rows.find((r) => r.user_id === mine())!.sealed_key;
    convKey.current[convId] = ck;
    convIdsRef.current = [convId, ...convIdsRef.current];
    setState((s) => ({ ...s, conversations: [{ id: convId, isGroup, name, memberIds: ids, createdAt: Date.now(), lastMessageAt: Date.now() }, ...s.conversations] }));
    return convId;
  }, [state.conversations]);

  const renameGroup = useCallback(async (id: string, name: string) => {
    setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? { ...c, name } : c)) }));
    const { error } = await db.updateConversation(supa(), id, { name });
    if (error) throw new Error(error.message);
  }, []);

  const setGroupAvatar = useCallback(async (id: string, url: string) => {
    setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? { ...c, avatar: url } : c)) }));
    const { error } = await db.updateConversation(supa(), id, { avatar: url });
    if (error) throw new Error(error.message);
  }, []);

  const addGroupMembers = useCallback(async (id: string, userIds: string[]) => {
    // Seal the existing conversation key for each new member's public key.
    const ck = await unwrap(id);
    const { data: keys, error: keyErr } = await db.publicKeys(supa(), userIds);
    if (keyErr) throw new Error(keyErr.message);
    const rows: { conversation_id: string; user_id: string; sealed_key: string }[] = [];
    for (const uid of userIds) {
      const pk = (keys ?? []).find((k: any) => k.id === uid)?.public_key;
      if (!pk) throw new Error('A selected member has not set up encryption keys yet.');
      rows.push({ conversation_id: id, user_id: uid, sealed_key: await sealKeyForMember(ck, pk) });
    }
    const { error } = await db.insertMembers(supa(), rows);
    if (error) throw new Error(error.message);
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, memberIds: Array.from(new Set([...c.memberIds, ...userIds])) } : c
      ),
    }));
  }, [unwrap]);

  const removeGroupMember = useCallback(async (id: string, userId: string) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, memberIds: c.memberIds.filter((m) => m !== userId) } : c
      ),
    }));
    const { error } = await db.removeMember(supa(), id, userId);
    if (error) throw new Error(error.message);
  }, []);

  const leaveGroup = useCallback(async (id: string) => {
    convIdsRef.current = convIdsRef.current.filter((c) => c !== id);
    setState((s) => ({ ...s, conversations: s.conversations.filter((c) => c.id !== id) }));
    await db.removeMember(supa(), id, mine());
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    db.markNotifRead(supa(), mine());
  }, []);

  const updateProfile = useCallback(async (patch: { name?: string; bio?: string; avatar?: string }) => {
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === mine() ? { ...u, ...patch } : u)) }));
    const { error } = await db.updateProfile(supa(), mine(), patch);
    if (error) throw new Error(error.message);
  }, []);

  const toggleBlock = useCallback(async (userId: string) => {
    const isBlocked = blocked.includes(userId);
    setBlocked((b) => (isBlocked ? b.filter((i) => i !== userId) : [...b, userId]));
    if (isBlocked) await db.unblock(supa(), mine(), userId);
    else await db.block(supa(), mine(), userId);
  }, [blocked]);

  const setPrivacy = useCallback(async (isPrivate: boolean) => {
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === mine() ? { ...u, private: isPrivate } : u)) }));
    await db.updateProfile(supa(), mine(), { private: isPrivate });
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const supabase = supa();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    // The private key was wrapped with the OLD password — re-wrap it so recovery
    // on other devices keeps working with the new password.
    if (keypair.current) {
      const salt = await randomSalt();
      const encPrivate = await wrapPrivateKey(keypair.current.privateKey, newPassword, salt);
      await supabase.from('profiles').update({ enc_private_key: encPrivate, key_salt: salt }).eq('id', mine());
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    const supabase = supa();
    // Removing the profile cascades the user's posts, messages, memberships, etc.
    await db.deleteProfile(supabase, mine());
    await supabase.auth.signOut();
    window.location.href = '/';
  }, []);

  const myFingerprint = useCallback(() => keyFingerprint(me.publicKey), [me.publicKey]);

  // Recover this device's key pair from the password-wrapped key in the DB, then
  // re-decrypt everything. Returns false if the password is wrong.
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const supabase = supa();
    const userId = mine();
    const { data: prof } = await supabase
      .from('profiles')
      .select('public_key, enc_private_key, key_salt')
      .eq('id', userId)
      .single();
    if (!prof) return false;

    let kp: KeyPair | null = null;
    if (prof.enc_private_key && prof.key_salt) {
      try {
        const privateKey = await unwrapPrivateKey(prof.enc_private_key, password, prof.key_salt);
        kp = { publicKey: prof.public_key, privateKey };
      } catch {
        return false;
      }
    } else {
      // No wrapped key yet: establish one for this account from this device.
      const local = loadKeyPair(userId);
      kp = local ?? (await generateKeyPair());
      const salt = await randomSalt();
      const encPrivate = await wrapPrivateKey(kp.privateKey, password, salt);
      await supabase.from('profiles').update({ public_key: kp.publicKey, enc_private_key: encPrivate, key_salt: salt }).eq('id', userId);
    }
    if (!kp) return false;

    storeKeyPair(userId, kp);
    keypair.current = kp;
    convKey.current = {};
    setNeedsUnlock(false);
    // Force re-decryption of all messages with the recovered key.
    setState((s) => ({ ...s, messages: s.messages.map((m) => ({ ...m, plaintext: m.deleted ? '' : undefined })) }));
    refreshConversations();
    return true;
  }, [refreshConversations]);

  const signOut = useCallback(async () => {
    await sb.current?.auth.signOut();
    window.location.href = '/login';
  }, []);

  const value: AppContextValue = {
    ...state, me, ready, typing, needsUnlock, blocked,
    toggleLike, toggleSave, sharePost, addComment, createPost, toggleFollow,
    viewStory, createMoment, sendMessage, reactToMessage, editMessage, deleteMessage,
    markConversationRead, startTyping, createConversation, decryptedFor,
    renameGroup, setGroupAvatar, addGroupMembers, removeGroupMember, leaveGroup,
    markAllNotificationsRead, userById, updateProfile, unlock,
    toggleBlock, setPrivacy, changePassword, deleteAccount, myFingerprint, signOut,
    presence, setChatting,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
