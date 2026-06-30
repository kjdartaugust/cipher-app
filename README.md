# 🔐 Cipher — Private. Encrypted. Social.

A private, end-to-end encrypted social network with a **"private club"** identity.
Cipher pairs a distinctive social experience — a swipeable feed, disappearing
mood drops, and live presence — with **messaging the server can never read**:
every DM and group message is encrypted on-device with
[libsodium](https://doc.libsodium.org/) before it ever leaves the browser.

Built with **Next.js 14 (App Router)**, **Supabase** (auth · database · realtime ·
storage), **Tailwind CSS**, and **Framer Motion**.

> **Identity:** pure black `#000000` · electric violet `#6D28D9` · pure white `#FFFFFF` · Inter
> · floating command bar · bubble-free chat · private by default

**Live demo:** https://cipher-app-blush.vercel.app

---

## ✨ Features

### 🔒 End-to-end encrypted messaging
- 1:1 DMs **and** group chats, encrypted client-side with libsodium
- Per-conversation symmetric key **sealed to each member's public key** (`crypto_box_seal`)
- Messages encrypted with `crypto_secretbox` (XSalsa20-Poly1305) + fresh nonce
- Delivery & read receipts, **live typing indicators**
- Emoji reactions, reply / quote, edit & delete
- Image & file sharing, **real microphone voice notes** (record → upload → playback)
- Bubble-free **message rows** with a per-message lock glyph and safety-number verification
- **Group management:** rename, set avatar, add/remove members, leave (keys re-sealed on add)

### 🃏 Today Board (feed)
- Full-screen **swipeable card stack** — swipe right to like, left to skip, tap to expand
- Keyboard support (← skip, → like) and spring physics; classic list view via a toggle
- Like · comment · share · save; algorithmic ordering blending engagement, affinity & recency

### 💜 Moments (stories, reimagined)
- Encrypted **text or voice mood drops** that expire in **6 hours**
- Shown as a pulsing violet orbit ring around your avatar; full-screen viewer with
  large type or a waveform audio player — no camera, no filters
- Viewer list with reactions

### 📡 Pulse (live presence)
- See your circle **right now** — green (online) · violet (in a Cipher) · grey (away),
  powered by **Supabase Realtime Presence**
- Mood emoji, latest post, and live status rings

### 👤 Profile · 🔔 Notifications · ⚙️ Settings
- Minimal centered profile: avatar, bio, **Posts / Ciphers sent / Mutuals**, masonry grid, highlights
- Real-time alerts for likes, comments, messages, follows, reactions
- Settings hub: **safety number**, **change password** (re-wraps your portable key),
  **private account**, **blocked accounts**, **delete account**

### 🕵️ Private by default
- People aren't publicly listed — you're discoverable **only by your username**
- Pulse and suggestions show your circle only; new people are found via username search

### 🎨 UI
- Pure black/white with a single electric-violet accent — no gradients or glassmorphism
- Floating **command bar** (frosted, icon-only) on mobile; sidebar on desktop
- Inter at display weights, "Cipher Protected" badges, 150–200 ms snappy motion
- Reduced-motion support, keyboard focus rings, branded loading skeletons

---

## 🔒 How the encryption works

1. Each user owns a **Curve25519 key pair**. The public key is published; the private key
   never leaves the device.
2. The private key is also **wrapped with a key derived from your password** (BLAKE2b) and
   stored server-side, so **any device you log into can recover the same key** — the server
   never sees the password or the plaintext key. ([`lib/keys.ts`](lib/keys.ts), [`lib/crypto.ts`](lib/crypto.ts))
3. Each conversation gets a random **symmetric key**, **sealed** to every member's public
   key (`crypto_box_seal`) — only a member's private key can open it.
4. Each message is encrypted with the conversation key. Supabase stores only
   `{ ciphertext, nonce }` + sealed key envelopes — **plaintext exists solely in memory on
   member devices.**

---

## 🚀 Getting started

```bash
npm install
cp .env.local.example .env.local   # optional — see Demo mode below
npm run dev
```

Open http://localhost:3000.

### Demo mode (default — zero config)
If the Supabase env vars are missing or left as the example placeholders, Cipher runs in
**fully-local demo mode**: seeded users/posts/moments/chats, **real libsodium encryption**
in your browser, mock realtime, and state persisted to `localStorage`. Just `npm run dev`.

### Connecting Supabase (production)
1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL files in the editor, in order:
   - [`supabase/schema.sql`](supabase/schema.sql) — tables, RLS, realtime, new-user trigger
   - [`supabase/fix-rls.sql`](supabase/fix-rls.sql) — recursion-safe conversation policies, chat
     INSERT/UPDATE policies, realtime publication, **storage buckets**
   - [`supabase/keys-migration.sql`](supabase/keys-migration.sql) — portable-key columns
   - [`supabase/settings-migration.sql`](supabase/settings-migration.sql) — private flag + blocks
   - [`supabase/moments-migration.sql`](supabase/moments-migration.sql) — text/voice moments
   - [`supabase/groups-migration.sql`](supabase/groups-migration.sql) — leave/remove member policy
3. **Auth → Email:** turn **off** "Confirm email" for the smoothest flow (otherwise new
   accounts confirm via the link, handled at `/auth/callback`).
4. Add your keys to `.env.local` (both required — use the **anon public** key, never the service role):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Restart — Cipher leaves demo mode automatically. Sign-up creates a profile (DB trigger),
   generates your key pair, and stores the password-wrapped copy for multi-device recovery.

---

## ☁️ Deploy to Vercel

```bash
vercel --prod
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the project's
Environment Variables (or omit them to ship the demo). Deploy-ready as-is.

> **Build note:** the published `libsodium-wrappers` ESM build has a broken relative import;
> [`next.config.mjs`](next.config.mjs) aliases it to the CommonJS build to fix it.

---

## 🗂️ Project structure

```
app/
  (app)/              # authenticated shell + page transitions
    feed/  messages/  discover/(Pulse)  notifications/  profile/  settings/  u/[username]/
  auth/callback/  login/  page.tsx      # landing + real auth
components/
  chat/  feed/  post/  story/  profile/  shell/  ui/
lib/
  crypto.ts           # libsodium E2EE + password-wrapped keys
  keys.ts use-recorder.ts
  store.tsx           # demo provider (localStorage)
  store-supabase.tsx  # live provider (DB · realtime · presence · storage)
  app-context.ts      # shared context interface
  supabase/           # clients + db queries/mutations + storage
supabase/*.sql        # schema + ordered migrations
```

## 🛠️ Tech
Next.js 14 · React 18 · TypeScript · Tailwind CSS · Framer Motion ·
libsodium-wrappers · Supabase · lucide-react

---

*Cipher is a portfolio project. The cryptographic design demonstrates a real sealed-key,
password-portable E2EE model; audit and harden key management (and tighten profile RLS for
true anti-enumeration) before any production use.*
