import type {
  AppNotification,
  Conversation,
  Post,
  Story,
  User,
} from './types';

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${seed}&backgroundColor=7C3AED,a78bfa,5b21b6`;

const img = (id: string, w = 800, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const now = Date.now();
const min = 60_000;
const hr = 60 * min;

// The signed-in demo user is always "you".
export const ME_ID = 'u_me';

export const DEMO_USERS: User[] = [
  {
    id: ME_ID,
    username: 'you',
    name: 'You',
    avatar: avatar('cipher-you'),
    bio: 'Privacy first. ✶ Exploring the encrypted web.',
    publicKey: '',
    followers: ['u_aria', 'u_kojo', 'u_mei', 'u_dev', 'u_lena'],
    following: ['u_aria', 'u_kojo', 'u_mei', 'u_dev', 'u_zane', 'u_lena'],
    verified: true,
    online: true,
  },
  {
    id: 'u_aria',
    username: 'aria.codes',
    name: 'Aria Mensah',
    avatar: avatar('aria'),
    bio: 'Security engineer 🔐 | breaking & building | she/her',
    publicKey: '',
    followers: [ME_ID, 'u_kojo', 'u_dev', 'u_zane'],
    following: [ME_ID, 'u_mei'],
    verified: true,
    online: true,
  },
  {
    id: 'u_kojo',
    username: 'kojo.designs',
    name: 'Kojo Asante',
    avatar: avatar('kojo'),
    bio: 'Product designer ✷ glassmorphism enjoyer ✷ Accra → everywhere',
    publicKey: '',
    followers: [ME_ID, 'u_aria', 'u_lena'],
    following: [ME_ID, 'u_aria', 'u_mei'],
    online: false,
  },
  {
    id: 'u_mei',
    username: 'mei.lin',
    name: 'Mei Lin',
    avatar: avatar('mei'),
    bio: 'Photographer 📷 chasing soft light',
    publicKey: '',
    followers: [ME_ID, 'u_aria', 'u_kojo', 'u_dev'],
    following: [ME_ID, 'u_zane'],
    verified: true,
    online: true,
  },
  {
    id: 'u_dev',
    username: 'devpatel',
    name: 'Dev Patel',
    avatar: avatar('dev'),
    bio: 'Full-stack dev. Coffee → code → repeat ☕',
    publicKey: '',
    followers: [ME_ID, 'u_aria'],
    following: [ME_ID, 'u_aria', 'u_mei', 'u_lena'],
    online: false,
  },
  {
    id: 'u_zane',
    username: 'zane',
    name: 'Zane Okafor',
    avatar: avatar('zane'),
    bio: 'Music producer 🎧 night owl',
    publicKey: '',
    followers: [ME_ID, 'u_mei'],
    following: ['u_aria'],
    online: true,
  },
  {
    id: 'u_lena',
    username: 'lena.travels',
    name: 'Lena Brookes',
    avatar: avatar('lena'),
    bio: 'Traveler ✈️ 34 countries and counting',
    publicKey: '',
    followers: [ME_ID, 'u_kojo'],
    following: [ME_ID, 'u_dev'],
    online: false,
  },
];

export const DEMO_POSTS: Post[] = [
  {
    id: 'p1',
    authorId: 'u_aria',
    text: 'Just shipped end-to-end encryption for our group chats. The server literally cannot read your messages — and that’s exactly how it should be. 🔐',
    media: [{ type: 'image', url: img('1558494949-ef010cbdcc31') }],
    createdAt: now - 2 * hr,
    likes: [ME_ID, 'u_kojo', 'u_dev', 'u_mei', 'u_zane'],
    saves: [ME_ID, 'u_dev'],
    shares: 12,
    comments: [
      {
        id: 'c1',
        authorId: 'u_dev',
        text: 'This is the way. Zero-knowledge or bust.',
        createdAt: now - 1.5 * hr,
        likes: ['u_aria', ME_ID],
      },
      {
        id: 'c2',
        authorId: 'u_kojo',
        text: 'The UX looks so clean too 👏',
        createdAt: now - 1 * hr,
        likes: ['u_aria'],
      },
    ],
    trendingScore: 98,
  },
  {
    id: 'p2',
    authorId: 'u_mei',
    text: 'Golden hour never misses. Shot on a quiet rooftop last night ✨',
    media: [{ type: 'image', url: img('1470770841072-f978cf4d019e') }],
    createdAt: now - 5 * hr,
    likes: [ME_ID, 'u_aria', 'u_lena', 'u_zane'],
    saves: ['u_lena'],
    shares: 7,
    comments: [
      {
        id: 'c3',
        authorId: 'u_lena',
        text: 'Take me there 😍',
        createdAt: now - 4 * hr,
        likes: ['u_mei'],
      },
    ],
    trendingScore: 87,
  },
  {
    id: 'p3',
    authorId: 'u_kojo',
    text: 'Redesigned my portfolio with a dark-first glass aesthetic. Purple gradients everywhere. Thoughts? 💜',
    media: [{ type: 'image', url: img('1561070791-2526d30994b5') }],
    createdAt: now - 9 * hr,
    likes: [ME_ID, 'u_aria', 'u_dev'],
    saves: [ME_ID],
    shares: 4,
    comments: [],
    trendingScore: 72,
  },
  {
    id: 'p4',
    authorId: 'u_lena',
    text: 'Sunrise over the Atlas Mountains. Some places make you forget your phone exists — then you remember to post 📸',
    media: [{ type: 'image', url: img('1469474968028-56623f02e42e') }],
    createdAt: now - 14 * hr,
    likes: ['u_mei', 'u_kojo', ME_ID],
    saves: [],
    shares: 9,
    comments: [],
    trendingScore: 65,
  },
  {
    id: 'p5',
    authorId: 'u_zane',
    text: 'New track dropping Friday. Layered 40 tracks of analog synth for this one 🎹 who’s ready?',
    createdAt: now - 20 * hr,
    likes: ['u_mei', 'u_aria'],
    saves: [],
    shares: 3,
    comments: [],
    trendingScore: 41,
  },
  {
    id: 'p6',
    authorId: 'u_dev',
    text: 'Hot take: most apps collect 100x more data than they need. Build for privacy and your users will trust you forever.',
    createdAt: now - 26 * hr,
    likes: [ME_ID, 'u_aria', 'u_kojo'],
    saves: ['u_aria'],
    shares: 15,
    comments: [],
    trendingScore: 80,
  },
];

const story = (
  id: string,
  authorId: string,
  photoId: string,
  hoursAgo: number,
  highlighted = false
): Story => ({
  id,
  authorId,
  media: { type: 'image', url: img(photoId, 600, 1000) },
  createdAt: now - hoursAgo * hr,
  expiresAt: now - hoursAgo * hr + 24 * hr,
  viewers:
    authorId === ME_ID
      ? [
          { userId: 'u_aria', at: now - 1 * hr },
          { userId: 'u_mei', reaction: '🔥', at: now - 30 * min },
        ]
      : [],
  highlighted,
});

export const DEMO_STORIES: Story[] = [
  story('s0', ME_ID, '1517841905240-472988babdf9', 3, true),
  story('s1', 'u_aria', '1551434678-e076c223a692', 1),
  story('s2', 'u_mei', '1492691527719-9d1e07e534b4', 2),
  story('s3', 'u_kojo', '1545235617-9465d2a55698', 4),
  story('s4', 'u_lena', '1506744038136-46273834b3fb', 6),
  story('s5', 'u_zane', '1511671782779-c97d3d27a1d4', 8),
];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_aria',
    isGroup: false,
    memberIds: [ME_ID, 'u_aria'],
    createdAt: now - 3 * 24 * hr,
    lastMessageAt: now - 8 * min,
  },
  {
    id: 'conv_mei',
    isGroup: false,
    memberIds: [ME_ID, 'u_mei'],
    createdAt: now - 5 * 24 * hr,
    lastMessageAt: now - 2 * hr,
  },
  {
    id: 'conv_squad',
    isGroup: true,
    name: 'Encrypted Squad 🔐',
    memberIds: [ME_ID, 'u_aria', 'u_dev', 'u_kojo'],
    createdAt: now - 10 * 24 * hr,
    lastMessageAt: now - 35 * min,
  },
];

// Seed messages are plaintext here; the store encrypts them on first load so
// that everything persisted in the (mock) datastore is ciphertext.
export const DEMO_SEED_MESSAGES: Record<
  string,
  { senderId: string; text: string; minutesAgo: number }[]
> = {
  conv_aria: [
    { senderId: 'u_aria', text: 'Hey! Did you see the new sealed-key flow?', minutesAgo: 60 },
    { senderId: ME_ID, text: 'Yes! The fingerprint verification is slick 🔐', minutesAgo: 55 },
    { senderId: 'u_aria', text: 'Right? No one can MITM us now.', minutesAgo: 50 },
    { senderId: ME_ID, text: 'Sending you the design files in a sec', minutesAgo: 12 },
    { senderId: 'u_aria', text: 'Perfect, thank you 💜', minutesAgo: 8 },
  ],
  conv_mei: [
    { senderId: 'u_mei', text: 'That rooftop shot blew up!', minutesAgo: 180 },
    { senderId: ME_ID, text: 'Deserved! It’s gorgeous', minutesAgo: 130 },
    { senderId: 'u_mei', text: 'Want the full res? I’ll send it encrypted ofc', minutesAgo: 120 },
  ],
  conv_squad: [
    { senderId: 'u_dev', text: 'Standup in 10?', minutesAgo: 90 },
    { senderId: 'u_kojo', text: 'On my way', minutesAgo: 80 },
    { senderId: 'u_aria', text: 'Pushed the crypto module, please review 🙏', minutesAgo: 40 },
    { senderId: ME_ID, text: 'Reviewing now 👀', minutesAgo: 35 },
  ],
};

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'like', actorId: 'u_aria', targetId: 'p1', preview: 'liked your post', createdAt: now - 10 * min, read: false },
  { id: 'n2', type: 'follow', actorId: 'u_mei', createdAt: now - 40 * min, read: false },
  { id: 'n3', type: 'comment', actorId: 'u_dev', targetId: 'p1', preview: 'commented: This is the way.', createdAt: now - 1 * hr, read: false },
  { id: 'n4', type: 'reaction', actorId: 'u_mei', preview: 'reacted 🔥 to your story', createdAt: now - 30 * min, read: true },
  { id: 'n5', type: 'message', actorId: 'u_aria', targetId: 'conv_aria', preview: 'sent you a message', createdAt: now - 8 * min, read: false },
  { id: 'n6', type: 'follow', actorId: 'u_lena', createdAt: now - 5 * hr, read: true },
];
