'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function MessagesIndex() {
  return (
    <div className="grid h-screen place-items-center px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-cipher-gradient shadow-lg shadow-cipher-600/30">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold">Your messages</h2>
        <p className="mt-2 text-sm text-white/50">
          Select a conversation or start a new one. Everything you send here is
          end-to-end encrypted on your device.
        </p>
      </motion.div>
    </div>
  );
}
