'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppContext,
  type AppContextValue,
  type AppState,
  uid,
  useApp,
} from './app-context';
import {
  decryptMessage,
  encryptMessage,
  generateConversationKey,
  generateKeyPair,
  keyFingerprint,
  openSealedKey,
  sealKeyForMember,
} from './crypto';
import {
  DEMO_CONVERSATIONS,
  DEMO_NOTIFICATIONS,
  DEMO_POSTS,
  DEMO_SEED_MESSAGES,
  DEMO_STORIES,
  DEMO_USERS,
  ME_ID,
} from './demo-data';
import type {
  AppNotification,
  Comment,
  Conversation,
  Message,
  MessageKind,
  Post,
  Story,
  User,
} from './types';

const LS_KEY = 'cipher.state.v1';
const LS_KEYS = 'cipher.keys.v1';

interface Keystore {
  // userId -> {publicKey, privateKey}. In demo mode we hold every member's keys
  // so sealed-key E2EE can be demonstrated end to end. In production only the
  // signed-in user's private key would live on-device.
  pairs: Record<string, { publicKey: string; privateKey: string }>;
  // conversationId -> sealed conversation key per member (server-storable)
  sealed: Record<string, Record<string, string>>;
}

export { useApp };

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    users: DEMO_USERS,
    posts: DEMO_POSTS,
    stories: DEMO_STORIES,
    conversations: DEMO_CONVERSATIONS,
    messages: [],
    notifications: DEMO_NOTIFICATIONS,
  });
  const [ready, setReady] = useState(false);
  const [typing, setTyping] = useState<Record<string, string[]>>({});
  const [blocked, setBlocked] = useState<string[]>([]);
  const keys = useRef<Keystore>({ pairs: {}, sealed: {} });
  const convKeyCache = useRef<Record<string, string>>({});

  // ---- bootstrap: keys, sealed conversation keys, encrypt seed messages ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. keys
      const savedKeys = localStorage.getItem(LS_KEYS);
      if (savedKeys) keys.current = JSON.parse(savedKeys);
      for (const u of DEMO_USERS) {
        if (!keys.current.pairs[u.id]) {
          keys.current.pairs[u.id] = await generateKeyPair();
        }
      }
      const users = DEMO_USERS.map((u) => ({
        ...u,
        publicKey: keys.current.pairs[u.id].publicKey,
      }));

      // 2. conversation keys sealed to each member
      for (const conv of DEMO_CONVERSATIONS) {
        if (!keys.current.sealed[conv.id]) {
          const ck = await generateConversationKey();
          const envelope: Record<string, string> = {};
          for (const m of conv.memberIds) {
            envelope[m] = await sealKeyForMember(ck, keys.current.pairs[m].publicKey);
          }
          keys.current.sealed[conv.id] = envelope;
        }
      }

      // 3. restore or seed+encrypt messages
      const saved = localStorage.getItem(LS_KEY);
      let messages: Message[] = [];
      let restored: Partial<AppState> = {};
      if (saved) {
        restored = JSON.parse(saved);
        messages = restored.messages ?? [];
      } else {
        for (const [convId, seeds] of Object.entries(DEMO_SEED_MESSAGES)) {
          const ck = await unwrap(convId);
          for (const s of seeds) {
            const encrypted = await encryptMessage(s.text, ck);
            messages.push({
              id: uid('m'),
              conversationId: convId,
              senderId: s.senderId,
              kind: 'text',
              encrypted,
              createdAt: Date.now() - s.minutesAgo * 60_000,
              reactions: [],
              deliveredTo: DEMO_CONVERSATIONS.find((c) => c.id === convId)!.memberIds,
              readBy: [s.senderId],
            });
          }
        }
        messages.sort((a, b) => a.createdAt - b.createdAt);
      }

      if (cancelled) return;
      localStorage.setItem(LS_KEYS, JSON.stringify(keys.current));
      setState((prev) => ({
        users,
        posts: restored.posts ?? prev.posts,
        stories: restored.stories ?? prev.stories,
        conversations: restored.conversations ?? prev.conversations,
        messages,
        notifications: restored.notifications ?? prev.notifications,
      }));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state, ready]);

  const unwrap = useCallback(async (conversationId: string) => {
    if (convKeyCache.current[conversationId]) return convKeyCache.current[conversationId];
    const sealed = keys.current.sealed[conversationId]?.[ME_ID];
    const mine = keys.current.pairs[ME_ID];
    const ck = await openSealedKey(sealed, mine.publicKey, mine.privateKey);
    convKeyCache.current[conversationId] = ck;
    return ck;
  }, []);

  const me = useMemo(
    () => state.users.find((u) => u.id === ME_ID)!,
    [state.users]
  );
  const userById = useCallback(
    (id: string) => state.users.find((u) => u.id === id) ?? state.users[0],
    [state.users]
  );

  const pushNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      setState((s) => ({
        ...s,
        notifications: [
          { ...n, id: uid('n'), createdAt: Date.now(), read: false },
          ...s.notifications,
        ],
      }));
    },
    []
  );

  // ---------------- social actions ----------------
  const toggleLike = useCallback((postId: string) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              likes: p.likes.includes(ME_ID)
                ? p.likes.filter((i) => i !== ME_ID)
                : [...p.likes, ME_ID],
            }
          : p
      ),
    }));
  }, []);

  const toggleSave = useCallback((postId: string) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              saves: p.saves.includes(ME_ID)
                ? p.saves.filter((i) => i !== ME_ID)
                : [...p.saves, ME_ID],
            }
          : p
      ),
    }));
  }, []);

  const sharePost = useCallback((postId: string) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) => (p.id === postId ? { ...p, shares: p.shares + 1 } : p)),
    }));
  }, []);

  const addComment = useCallback((postId: string, text: string) => {
    const c: Comment = {
      id: uid('c'),
      authorId: ME_ID,
      text,
      createdAt: Date.now(),
      likes: [],
    };
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, c] } : p
      ),
    }));
  }, []);

  const deletePost = useCallback((postId: string) => {
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== postId) }));
  }, []);

  const createPost = useCallback((text: string, media?: Post['media']) => {
    const p: Post = {
      id: uid('p'),
      authorId: ME_ID,
      text,
      media,
      createdAt: Date.now(),
      likes: [],
      saves: [],
      shares: 0,
      comments: [],
    };
    setState((s) => ({ ...s, posts: [p, ...s.posts] }));
  }, []);

  const toggleFollow = useCallback(
    (userId: string) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) => {
          if (u.id === ME_ID) {
            const has = u.following.includes(userId);
            return {
              ...u,
              following: has
                ? u.following.filter((i) => i !== userId)
                : [...u.following, userId],
            };
          }
          if (u.id === userId) {
            const has = u.followers.includes(ME_ID);
            return {
              ...u,
              followers: has
                ? u.followers.filter((i) => i !== ME_ID)
                : [...u.followers, ME_ID],
            };
          }
          return u;
        }),
      }));
      if (!me.following.includes(userId)) pushNotification({ type: 'follow', actorId: ME_ID, targetId: userId });
    },
    [me.following, pushNotification]
  );

  const viewStory = useCallback((storyId: string, reaction?: string) => {
    setState((s) => ({
      ...s,
      stories: s.stories.map((st) => {
        if (st.id !== storyId) return st;
        const existing = st.viewers.find((v) => v.userId === ME_ID);
        if (existing && !reaction) return st;
        return {
          ...st,
          viewers: [
            ...st.viewers.filter((v) => v.userId !== ME_ID),
            { userId: ME_ID, reaction: reaction ?? existing?.reaction, at: Date.now() },
          ],
        };
      }),
    }));
  }, []);

  // ---------------- messaging ----------------
  const decryptedFor = useCallback(
    (conversationId: string) =>
      state.messages.filter((m) => m.conversationId === conversationId),
    [state.messages]
  );

  // background decryption: whenever messages change, decrypt any missing plaintext
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const pending = state.messages.filter((m) => m.plaintext === undefined && !m.deleted);
      if (pending.length === 0) return;
      const updates: Record<string, string> = {};
      for (const m of pending) {
        const ck = await unwrap(m.conversationId);
        updates[m.id] = await decryptMessage(m.encrypted, ck);
      }
      if (cancelled) return;
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          updates[m.id] !== undefined ? { ...m, plaintext: updates[m.id] } : m
        ),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [state.messages, ready, unwrap]);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      kind: MessageKind,
      text: string,
      meta?: Message['meta'],
      replyTo?: string
    ) => {
      const ck = await unwrap(conversationId);
      const encrypted = await encryptMessage(text, ck);
      const conv = state.conversations.find((c) => c.id === conversationId)!;
      const msg: Message = {
        id: uid('m'),
        conversationId,
        senderId: ME_ID,
        kind,
        encrypted,
        plaintext: text,
        meta,
        createdAt: Date.now(),
        reactions: [],
        deliveredTo: [ME_ID],
        readBy: [ME_ID],
        replyTo,
      };
      setState((s) => ({
        ...s,
        messages: [...s.messages, msg],
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, lastMessageAt: msg.createdAt } : c
        ),
      }));

      // simulate delivery + a contextual encrypted reply from another member
      const other = conv.memberIds.find((m) => m !== ME_ID)!;
      setTimeout(() => {
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === msg.id ? { ...m, deliveredTo: conv.memberIds } : m
          ),
        }));
      }, 600);
      if (!conv.isGroup) {
        setTimeout(() => setTyping((t) => ({ ...t, [conversationId]: [other] })), 1100);
        setTimeout(async () => {
          setTyping((t) => ({ ...t, [conversationId]: [] }));
          const replyText = pickReply(text);
          const enc = await encryptMessage(replyText, ck);
          const reply: Message = {
            id: uid('m'),
            conversationId,
            senderId: other,
            kind: 'text',
            encrypted: enc,
            plaintext: replyText,
            createdAt: Date.now(),
            reactions: [],
            deliveredTo: conv.memberIds,
            readBy: [other],
          };
          setState((s) => ({
            ...s,
            messages: [
              ...s.messages.map((m) =>
                m.senderId === ME_ID && m.conversationId === conversationId
                  ? { ...m, readBy: Array.from(new Set([...m.readBy, other])) }
                  : m
              ),
              reply,
            ],
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, lastMessageAt: reply.createdAt } : c
            ),
          }));
          pushNotification({
            type: 'message',
            actorId: other,
            targetId: conversationId,
            preview: 'sent you a message',
          });
        }, 2600);
      }
    },
    [unwrap, state.conversations, pushNotification]
  );

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => {
        if (m.id !== messageId) return m;
        const mine = m.reactions.find((r) => r.userId === ME_ID);
        const reactions =
          mine && mine.emoji === emoji
            ? m.reactions.filter((r) => r.userId !== ME_ID)
            : [...m.reactions.filter((r) => r.userId !== ME_ID), { userId: ME_ID, emoji }];
        return { ...m, reactions };
      }),
    }));
  }, []);

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      const target = state.messages.find((m) => m.id === messageId);
      if (!target) return;
      const ck = await unwrap(target.conversationId);
      const encrypted = await encryptMessage(text, ck);
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId
            ? { ...m, encrypted, plaintext: text, editedAt: Date.now() }
            : m
        ),
      }));
    },
    [state.messages, unwrap]
  );

  const deleteMessage = useCallback((messageId: string) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        m.id === messageId
          ? { ...m, deleted: true, plaintext: '', reactions: [] }
          : m
      ),
    }));
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) =>
        m.conversationId === conversationId && !m.readBy.includes(ME_ID)
          ? { ...m, readBy: [...m.readBy, ME_ID] }
          : m
      ),
      notifications: s.notifications.map((n) =>
        n.type === 'message' && n.targetId === conversationId ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    // local indicator only; cleared by send. (Realtime broadcast in production.)
    setTyping((t) => ({ ...t, [`self_${conversationId}`]: [ME_ID] }));
  }, []);

  const createConversation = useCallback(
    async (memberIds: string[], name?: string) => {
      const ids = Array.from(new Set([ME_ID, ...memberIds]));
      const existing = state.conversations.find(
        (c) =>
          !name &&
          c.memberIds.length === ids.length &&
          ids.every((i) => c.memberIds.includes(i))
      );
      if (existing) return existing.id;
      const id = uid('conv');
      const ck = await generateConversationKey();
      const envelope: Record<string, string> = {};
      for (const m of ids) {
        envelope[m] = await sealKeyForMember(ck, keys.current.pairs[m].publicKey);
      }
      keys.current.sealed[id] = envelope;
      convKeyCache.current[id] = ck;
      localStorage.setItem(LS_KEYS, JSON.stringify(keys.current));
      const conv: Conversation = {
        id,
        isGroup: ids.length > 2 || !!name,
        name,
        memberIds: ids,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      };
      setState((s) => ({ ...s, conversations: [conv, ...s.conversations] }));
      return id;
    },
    [state.conversations]
  );

  const markAllNotificationsRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const value: AppContextValue = {
    ...state,
    me,
    ready,
    typing,
    needsUnlock: false,
    unlock: async () => true,
    presence: {},
    setChatting: () => {},
    toggleLike,
    toggleSave,
    sharePost,
    addComment,
    createPost,
    deletePost,
    toggleFollow,
    viewStory,
    createMoment: async (kind, text, durationSec) => {
      const now = Date.now();
      setState((s) => ({
        ...s,
        stories: [
          {
            id: uid('moment'),
            authorId: ME_ID,
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
    },
    sendMessage,
    reactToMessage,
    editMessage,
    deleteMessage,
    markConversationRead,
    startTyping,
    createConversation,
    renameGroup: async (id, name) => {
      setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? { ...c, name } : c)) }));
    },
    setGroupAvatar: async (id, url) => {
      setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? { ...c, avatar: url } : c)) }));
    },
    addGroupMembers: async (id, userIds) => {
      const ck = await unwrap(id);
      for (const m of userIds) {
        if (!keys.current.pairs[m]) keys.current.pairs[m] = await generateKeyPair();
        keys.current.sealed[id] = {
          ...keys.current.sealed[id],
          [m]: await sealKeyForMember(ck, keys.current.pairs[m].publicKey),
        };
      }
      localStorage.setItem(LS_KEYS, JSON.stringify(keys.current));
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, memberIds: Array.from(new Set([...c.memberIds, ...userIds])) } : c
        ),
      }));
    },
    removeGroupMember: async (id, userId) => {
      if (keys.current.sealed[id]) delete keys.current.sealed[id][userId];
      localStorage.setItem(LS_KEYS, JSON.stringify(keys.current));
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, memberIds: c.memberIds.filter((m) => m !== userId) } : c
        ),
      }));
    },
    leaveGroup: async (id) => {
      setState((s) => ({ ...s, conversations: s.conversations.filter((c) => c.id !== id) }));
    },
    decryptedFor,
    markAllNotificationsRead,
    userById,
    updateProfile: async (patch) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === ME_ID ? { ...u, ...patch } : u)),
      }));
    },
    blocked,
    toggleBlock: async (userId) => {
      setBlocked((b) => (b.includes(userId) ? b.filter((i) => i !== userId) : [...b, userId]));
    },
    setPrivacy: async (isPrivate) => {
      setState((s) => ({ ...s, users: s.users.map((u) => (u.id === ME_ID ? { ...u, private: isPrivate } : u)) }));
    },
    changePassword: async () => {
      // Demo mode has no real auth — succeed silently.
    },
    deleteAccount: async () => {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_KEYS);
      window.location.href = '/';
    },
    myFingerprint: () => keyFingerprint(me.publicKey),
    signOut: async () => {},
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function pickReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('?')) return 'Good question — let me check and get back to you 🔐';
  if (t.includes('thank')) return 'Anytime! 💜';
  if (t.includes('file') || t.includes('send')) return 'Got it, decrypting now 👀';
  const generic = [
    'Totally agree 💯',
    'Haha love that',
    'Encrypted and delivered ✨',
    'Nice! Talk soon.',
    'On it 🔥',
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}
