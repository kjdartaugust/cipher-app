'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, Phone, PhoneOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useCall } from './call-provider';

function Stream({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

export function CallOverlay() {
  const { state, call, localStream, remoteStream, muted, camOff, accept, decline, hangup, toggleMute, toggleCam } = useCall();
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (state !== 'connected') { setSecs(0); return; }
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  if (state === 'idle' || !call) return null;
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  // Incoming ring
  if (state === 'incoming') {
    return (
      <Shell>
        <p className="kicker mb-2">{call.video ? 'Incoming video call' : 'Incoming call'}</p>
        <h2 className="headline text-3xl">{call.peerName}</h2>
        <p className="mt-1 text-sm text-white/50">is calling you on Cipher</p>
        <div className="mt-10 flex items-center justify-center gap-10">
          <Action onClick={decline} className="bg-rose-600" label="Decline"><PhoneOff className="h-7 w-7" /></Action>
          <Action onClick={accept} className="bg-green-500" label="Accept"><Phone className="h-7 w-7" /></Action>
        </div>
      </Shell>
    );
  }

  const showVideo = call.video;
  return (
    <Shell dark>
      {/* remote */}
      {showVideo && remoteStream ? (
        <Stream stream={remoteStream} className="absolute inset-0 h-full w-full bg-black object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-cipher-gradient text-3xl font-bold">
              {call.peerName.charAt(0)}
            </div>
            <h2 className="headline text-2xl">{call.peerName}</h2>
            <p className="mt-1 text-sm text-white/50">{state === 'outgoing' ? 'Ringing…' : mmss}</p>
            {/* hidden audio so the call is audible */}
            <Stream stream={remoteStream} className="hidden" />
          </div>
        </div>
      )}

      {/* local PiP (video calls) */}
      {showVideo && localStream && (
        <div className="absolute right-4 top-4 h-40 w-28 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-xl">
          <Stream stream={localStream} muted className="h-full w-full -scale-x-100 object-cover" />
        </div>
      )}

      {/* top status for video */}
      {showVideo && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-gradient-to-b from-black/60 to-transparent p-4 text-sm">
          <span className="font-semibold">{call.peerName}</span>
          <span className="text-white/60">· {state === 'outgoing' ? 'Ringing…' : mmss}</span>
        </div>
      )}

      {/* controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-5 bg-gradient-to-t from-black/70 to-transparent p-8">
        <Action onClick={toggleMute} className={muted ? 'bg-white/20' : 'bg-white/10'} label="Mute">
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Action>
        {showVideo && (
          <Action onClick={toggleCam} className={camOff ? 'bg-white/20' : 'bg-white/10'} label="Camera">
            {camOff ? <VideoOff className="h-6 w-6" /> : <VideoIcon className="h-6 w-6" />}
          </Action>
        )}
        <Action onClick={hangup} className="bg-rose-600" label="End"><PhoneOff className="h-6 w-6" /></Action>
      </div>
    </Shell>
  );
}

function Shell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`fixed inset-0 z-[80] grid place-items-center ${dark ? 'bg-black' : 'bg-ink/95 backdrop-blur-sm'}`}
      >
        <div className="relative h-full w-full">
          {dark ? children : <div className="grid h-full place-items-center px-6 text-center">{children}</div>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Action({ children, onClick, className, label }: { children: React.ReactNode; onClick: () => void; className?: string; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className={`grid h-16 w-16 place-items-center rounded-full text-white transition active:scale-90 ${className}`}>
      {children}
    </button>
  );
}
