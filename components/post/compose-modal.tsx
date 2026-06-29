'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Sparkles, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';

const SAMPLE_IMAGES = [
  '1517842645767-c639042777db',
  '1499092346589-b9b6be3e94b2',
  '1486312338219-ce68d2c6f44d',
  '1522202176988-66273c2fd55f',
];
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&h=800&q=80`;

export function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, createPost } = useApp();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<string | null>(null);

  function submit() {
    if (!text.trim() && !media) return;
    createPost(text.trim(), media ? [{ type: 'image', url: media }] : undefined);
    setText('');
    setMedia(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative w-full max-w-lg rounded-2xl glass-strong p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create post</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-3">
              <Avatar src={me.avatar} alt={me.name} size={44} />
              <div className="flex-1">
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-white/30"
                />
                {media && (
                  <div className="relative mt-2 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media} alt="attachment" className="max-h-64 w-full object-cover" />
                    <button
                      onClick={() => setMedia(null)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-white/40">
                <ImagePlus className="h-3.5 w-3.5" /> Add a photo
              </p>
              <div className="flex gap-2">
                {SAMPLE_IMAGES.map((id) => (
                  <button
                    key={id}
                    onClick={() => setMedia(img(id))}
                    className="h-14 w-14 overflow-hidden rounded-lg ring-2 ring-transparent transition hover:ring-cipher-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(id)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-white/40">Posting to your public feed</span>
              <button onClick={submit} disabled={!text.trim() && !media} className="btn-primary">
                <Sparkles className="h-4 w-4" /> Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
