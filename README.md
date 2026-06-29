# 🔐 Cipher — Private. Encrypted. Social.

An end-to-end encrypted social messaging web app. Cipher blends a polished social
experience (feed, stories, profiles, discover) with **private messaging that the
server can never read** — every DM and group message is encrypted on-device with
[libsodium](https://doc.libsodium.org/) before it leaves the browser.

Built with **Next.js 14 (App Router)**, **Supabase** (auth · database · realtime ·
storage), **Tailwind CSS**, and **Framer Motion**.

> **Brand:** deep black `#0A0A0A` · rich purple `#7C3AED` · soft white `#F9FAFB` · Inter

---

## ✨ Features

### End-to-end encrypted messaging
- Private DMs **and** group chats, encrypted client-side with libsodium
- Per-conversation symmetric key **sealed to each member's public key** (`crypto_box_seal`)
- Messages encrypted with `crypto_secretbox` (XSalsa20-Poly1305) + fresh nonce
- Delivery & read receipts, live typing indicators
- Emoji reactions, reply / quote, edit & delete
- Image & file sharing, **voice note** recording + waveform playback
- Safety-number (key fingerprint) verification

### Social feed
- Photo / video / text posts, like · comment · share · save
- Algorithmic-style **For You** feed (engagement + affinity + recency) and **Following** tab
- Trending posts section

### Stories
- 24-hour disappearing photo/video stories with tap-through progress
- Story reactions, **viewer list** with reactions, profile **highlights**

### Profile · Discover · Notifications
- Avatar, bio, follower/following system, post grid, mutual friends
- Search users, trending posts, suggested friends
- Real-time alerts for likes, comments, messages, follows, story reactions

### UI
- Dark-first aesthetic, purple gradients, glassmorphism cards
- Framer Motion page transitions & micro-animations
- Mobile-first: bottom nav on mobile, sidebar on desktop

---

## 🔒 How the encryption works

1. Each user has a **Curve25519 key pair**. The public key is published; the secret key never leaves the device.
2. Each conversation gets a random **symmetric key**.
3. That key is **sealed** to every member's public key (`crypto_box_seal`) — only a member's secret key can open it.
4. Each message is encrypted with the conversation key. The server stores only `{ ciphertext, nonce }` + sealed key envelopes.

The server (Supabase) therefore stores **ciphertext only** — plaintext exists solely
in memory on member devices. See [`lib/crypto.ts`](lib/crypto.ts).

---

## 🚀 Getting started

```bash
npm install
cp .env.local.example .env.local   # optional — see Demo mode below
npm run dev
```

Open http://localhost:3000.

### Demo mode (default — zero config)
If the Supabase env vars are missing or left as the example placeholders, Cipher runs
in **fully-local demo mode**: seeded users/posts/stories/chats, **real libsodium
encryption** in your browser, mock realtime (typing, replies, receipts) and state
persisted to `localStorage`. Just `npm run dev` and explore.

### Connecting Supabase (production)
1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor (tables, RLS, realtime, new-user trigger).
   - If you ran an **early** copy of the schema, also run [`supabase/fix-rls.sql`](supabase/fix-rls.sql) — it installs recursion-safe conversation policies, the INSERT/UPDATE policies needed to create chats, the realtime publication, and the storage buckets.
3. **Auth** → Providers → Email: for the smoothest demo, turn **off** "Confirm email" (otherwise new accounts must confirm via the link, handled at `/auth/callback`).
4. Create the storage buckets `avatars`, `posts`, `stories` (public) — `fix-rls.sql` does this for you.
5. Put your keys in `.env.local` (both required):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Restart the dev server — Cipher switches off demo mode automatically. Sign up creates
   a profile (via DB trigger) and generates your on-device key pair.

> **Note:** the private key lives only in the browser's `localStorage`. Signing in on a
> new device generates a fresh key pair and republishes the public key, so messages sealed
> to the old key won't be readable there — expected for this demo's key model.

---

## ☁️ Deploy to Vercel

```bash
vercel
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel
project's Environment Variables (or omit them to ship the demo). The app is
deploy-ready as-is.

---

## 🗂️ Project structure

```
app/
  (app)/              # authenticated shell (sidebar + bottom nav)
    feed/  messages/  discover/  notifications/  profile/  u/[username]/
  login/  page.tsx    # landing + auth
components/
  chat/   post/   story/   profile/   shell/   ui/
lib/
  crypto.ts           # libsodium E2EE
  store.tsx           # client data layer (demo mode) + actions
  supabase/           # browser + server clients
  demo-data.ts  types.ts  utils.ts  config.ts  nav.ts
supabase/schema.sql   # full Postgres schema + RLS + realtime
```

## 🛠️ Tech
Next.js 14 · React 18 · TypeScript · Tailwind CSS · Framer Motion ·
libsodium-wrappers · Supabase · lucide-react

---

*Cipher is a portfolio demo. The cryptographic design demonstrates a real sealed-key
E2EE model; audit and harden key storage/rotation before any production use.*
