export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  // base64 libsodium public key used to encrypt messages addressed to this user
  publicKey: string;
  followers: string[];
  following: string[];
  verified?: boolean;
  online?: boolean;
  private?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  text: string;
  media?: { type: 'image' | 'video'; url: string }[];
  createdAt: number;
  likes: string[];
  saves: string[];
  shares: number;
  comments: Comment[];
  trendingScore?: number;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
  likes: string[];
}

export type MomentKind = 'photo' | 'text' | 'voice';

export interface Story {
  id: string;
  authorId: string;
  // Moments: photo stories carry media; text/voice "mood drops" use text/audioDuration.
  kind?: MomentKind;
  media?: { type: 'image' | 'video'; url: string };
  text?: string;
  audioDuration?: number;
  createdAt: number;
  expiresAt: number;
  viewers: { userId: string; reaction?: string; at: number }[];
  highlighted?: boolean;
}

export type MessageKind = 'text' | 'image' | 'file' | 'voice' | 'call';

export interface EncryptedPayload {
  // base64 ciphertext + nonce produced by libsodium crypto_box / secretbox
  ciphertext: string;
  nonce: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  // Server NEVER sees plaintext — only this encrypted blob is persisted.
  encrypted: EncryptedPayload;
  // Decrypted client-side at runtime; never sent to the server.
  plaintext?: string;
  meta?: { fileName?: string; duration?: number; mime?: string; callKind?: 'voice' | 'video' };
  createdAt: number;
  editedAt?: number;
  deleted?: boolean;
  replyTo?: string;
  reactions: { userId: string; emoji: string }[];
  // userIds who have received / read this message
  deliveredTo: string[];
  readBy: string[];
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  memberIds: string[];
  createdAt: number;
  lastMessageAt: number;
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'message'
  | 'reaction'
  | 'mention'
  | 'story';

export interface AppNotification {
  id: string;
  type: NotificationType;
  actorId: string;
  targetId?: string;
  preview?: string;
  createdAt: number;
  read: boolean;
}
