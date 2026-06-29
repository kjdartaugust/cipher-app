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
  // social
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  sharePost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  createPost: (text: string, media?: Post['media']) => void;
  toggleFollow: (userId: string) => void;
  // stories
  viewStory: (storyId: string, reaction?: string) => void;
  // messaging
  sendMessage: (
    conversationId: string,
    kind: MessageKind,
    text: string,
    meta?: Message['meta'],
    replyTo?: string
  ) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => void;
  editMessage: (messageId: string, text: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  markConversationRead: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  createConversation: (memberIds: string[], name?: string) => Promise<string>;
  decryptedFor: (conversationId: string) => Message[];
  // notifications
  markAllNotificationsRead: () => void;
  userById: (id: string) => User;
  // profile
  updateProfile: (patch: { name?: string; bio?: string; avatar?: string }) => Promise<void>;
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
