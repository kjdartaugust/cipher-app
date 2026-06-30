'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Loader2, Mic, Paperclip, Send, Smile, Trash2, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { uploadPublic } from '@/lib/supabase/storage';
import { useRecorder } from '@/lib/use-recorder';
import type { Message } from '@/lib/types';

const EMOJIS = ['😀','😂','🥰','😎','🤔','😮','😢','🔥','💜','👍','🙏','✨','🎉','💯','👀','🔐','📷','🎤'];

export function MessageComposer({
  conversationId,
  replyTo,
  onClearReply,
}: {
  conversationId: string;
  replyTo: Message | null;
  onClearReply: () => void;
}) {
  const { sendMessage, startTyping, userById } = useApp();
  const { recording, seconds, error: recError, start, stop, cancel } = useRecorder();
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function send() {
    const value = text.trim();
    if (!value) return;
    sendMessage(conversationId, 'text', value, undefined, replyTo?.id);
    setText('');
    onClearReply();
  }

  async function startRec() {
    await start();
  }
  async function stopRec(sendIt: boolean) {
    if (!sendIt) {
      cancel();
      return;
    }
    const res = await stop();
    if (!res) return;
    setUploading(true);
    const url = (await uploadPublic('posts', res.blob)) ?? URL.createObjectURL(res.blob);
    setUploading(false);
    sendMessage(conversationId, 'voice', url, { duration: res.duration, mime: res.blob.type }, replyTo?.id);
    onClearReply();
  }

  // Upload the file to public storage and send the (encrypted) URL so the other
  // member can actually load it. Falls back to a local object URL in demo mode.
  async function attachImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    const url = (await uploadPublic('posts', f)) ?? URL.createObjectURL(f);
    setUploading(false);
    sendMessage(conversationId, 'image', url, { mime: f.type }, replyTo?.id);
    onClearReply();
  }

  async function attachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    const url = (await uploadPublic('posts', f)) ?? URL.createObjectURL(f);
    setUploading(false);
    sendMessage(conversationId, 'file', url, { fileName: f.name, mime: f.type }, replyTo?.id);
    onClearReply();
  }

  return (
    <div className="border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)]">
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 overflow-hidden border-l-2 border-cipher-400 bg-white/5 px-4 py-2"
          >
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-medium text-cipher-300">Replying to {userById(replyTo.senderId).name}</p>
              <p className="truncate text-white/50">{replyTo.plaintext || 'attachment'}</p>
            </div>
            <button onClick={onClearReply} className="rounded-full p-1 text-white/40 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {emoji && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-1 overflow-hidden px-4 py-2"
          >
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setText((t) => t + e)} className="rounded-lg p-1.5 text-xl transition hover:bg-white/10">
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {recError && !recording && (
        <p className="px-4 pt-2 text-xs text-rose-300">{recError}</p>
      )}

      {recording ? (
        <div className="flex items-center gap-3 p-3">
          <button onClick={() => stopRec(false)} className="rounded-full p-2 text-rose-400 hover:bg-white/10">
            <Trash2 className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white/5 px-4 py-2.5">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            <span className="text-sm text-white/70">Recording… {seconds}s</span>
            <div className="ml-2 flex flex-1 items-center gap-[2px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="w-[3px] animate-pulse rounded-full bg-cipher-400" style={{ height: 4 + ((i * 7 + seconds * 3) % 18), animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          </div>
          <button onClick={() => stopRec(true)} className="grid h-10 w-10 place-items-center rounded-full bg-cipher-gradient text-white">
            <Send className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 p-3">
          <button onClick={() => setEmoji((s) => !s)} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white">
            <Smile className="h-5 w-5" />
          </button>
          <button onClick={() => imgRef.current?.click()} disabled={uploading} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-50">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-50">
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={imgRef} type="file" accept="image/*" hidden onChange={attachImage} />
          <input ref={fileRef} type="file" hidden onChange={attachFile} />

          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); startTyping(conversationId); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Message — encrypted"
            className="max-h-32 flex-1 resize-none rounded-2xl bg-white/5 px-4 py-2.5 text-[15px] outline-none placeholder:text-white/30 focus:bg-white/10"
          />

          {text.trim() ? (
            <button onClick={send} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cipher-gradient text-white transition active:scale-90">
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={startRec} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
