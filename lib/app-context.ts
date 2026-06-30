'use client';

import { createContext, useContext } from 'react';
import type {
  AppNotification,
  Conversation,
  Message,
  MessageKind,
  Post,
  Story,
  User,
} from './types';

export interface AppState {
  users: User[];
  posts: Post[];
  stories: Story[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
}

export interface AppContextValue extends AppState {
  me: User;
  ready: boolean;
  typing: Record<string, string[]>; // conversationId -> userIds typing
  needsUnlock: boolean; // true when this device's key can't decrypt — prompt for password
  unlock: (password: string) => Promise<boolean>;
  // live presence (Supabase Realtime): userId -> status
  presence: Record<string, { status: 'online' | 'chatting'; at: number }>;
  setChatting: (on: boolean) => void;
  // social
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  sharePost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  createPost: (text: string, media?: Post['media']) => void;
  deletePost: (postId: string) => void;
  editPost: (postId: string, text: string) => void;
  toggleFollow: (userId: string) => void;
  // stories / moments
  viewStory: (storyId: string, reaction?: string) => void;
  createMoment: (kind: 'text' | 'voice', text: string, durationSec?: number) => Promise<void>;
  // messaging
  sendMessage: (
    conversationId: string,
    kind: MessageKind,
    text: string,
    meta?: Message['meta'],
    replyTo?: string
  ) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => void;
  // posts a call record into the conversation (durationSec null = missed)
  logCall: (conversationId: string, callKind: 'voice' | 'video', durationSec: number | null) => void;
  editMessage: (messageId: string, text: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  markConversationRead: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  createConversation: (memberIds: string[], name?: string) => Promise<string>;
  // group management
  renameGroup: (conversationId: string, name: string) => Promise<void>;
  setGroupAvatar: (conversationId: string, url: string) => Promise<void>;
  addGroupMembers: (conversationId: string, userIds: string[]) => Promise<void>;
  removeGroupMember: (conversationId: string, userId: string) => Promise<void>;
  leaveGroup: (conversationId: string) => Promise<void>;
  decryptedFor: (conversationId: string) => Message[];
  // notifications
  markAllNotificationsRead: () => void;
  userById: (id: string) => User;
  // profile
  updateProfile: (patch: { name?: string; bio?: string; avatar?: string }) => Promise<void>;
  // settings & security
  blocked: string[]; // userIds the current user has blocked
  toggleBlock: (userId: string) => Promise<void>;
  setPrivacy: (isPrivate: boolean) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  myFingerprint: () => Promise<string>;
  // auth (no-op in demo mode)
  signOut: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

let mid = 0;
export const uid = (p: string) => `${p}_${Date.now()}_${mid++}`;
