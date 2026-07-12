'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Mic, MicOff, Phone, PhoneOff, SwitchCamera, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useCall } from './call-provider';
import { startRing, stopRing, getContactRingtone } from '@/lib/ringtone';

function Stream({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

export function CallOverlay() {
  const { state, call, localStream, remoteStream, participants, isGroup, muted, camOff, reconnecting, accept, decline, hangup, toggleMute, toggleCam, switchCamera } = useCall();
  const [secs, setSecs] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const dragBoundsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== 'connected') { setSecs(0); return; }
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  // Always start a fresh call expanded.
  useEffect(() => {
    if (state === 'idle' || state === 'incoming') setMinimized(false);
  }, [state]);

  // Ring: chime while a call is coming in, ringback while dialing out. Also
  // buzz on incoming (Android supports Vibration; iOS ignores it).
  useEffect(() => {
    if (state === 'incoming') {
      // Most specific tone wins: the group's own, then the person calling, then
      // the default. A group you've given a tone should sound like that group no
      // matter which member dials.
      const override = call
        ? (call.isGroup ? getContactRingtone(call.convId) : null) ?? getContactRingtone(call.peerId)
        : null;
      startRing('incoming', override ?? undefined);
    } else if (state === 'outgoing') startRing('outgoing');
    else stopRing();

    let vib: ReturnType<typeof setInterval> | null = null;
    if (state === 'incoming' && typeof navigator !== 'undefined' && navigator.vibrate) {
      const buzz = () => navigator.vibrate?.([400, 200, 400]);
      buzz();
      vib = setInterval(buzz, 1600);
    }
    return () => { stopRing(); if (vib) clearInterval(vib); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, call?.peerId, call?.convId, call?.isGroup]);

  if (state === 'idle' || !call) return null;
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  // status line under the name / in the top bar during an active call
  const status = reconnecting ? 'Reconnecting…' : state === 'outgoing' ? 'Ringing…' : mmss;

  // Incoming ring
  if (state === 'incoming') {
    return (
      <Shell>
        <p className="kicker mb-2">{call.isGroup ? 'Incoming group call' : call.video ? 'Incoming video call' : 'Incoming call'}</p>
        <h2 className="headline text-3xl">{call.peerName}</h2>
        <p className="mt-1 text-sm text-white/50">{call.isGroup ? 'is starting a group call' : 'is calling you on Cipher'}</p>
        <div className="mt-10 flex items-center justify-center gap-10">
          <Action onClick={decline} className="bg-rose-600" label="Decline"><PhoneOff className="h-7 w-7" /></Action>
          <Action onClick={accept} className="bg-green-500" label="Accept"><Phone className="h-7 w-7" /></Action>
        </div>
      </Shell>
    );
  }

  const showVideo = call.video;

  // Minimized: a small floating pill so you can use the rest of the app while
  // the call stays connected. A mounted stream keeps the audio flowing.
  if (minimized && isGroup) {
    return (
      <div ref={dragBoundsRef} className="pointer-events-none fixed inset-0 z-[80]">
        <motion.div
          drag
          dragConstraints={dragBoundsRef}
          dragElastic={0.06}
          dragMomentum={false}
          whileDrag={{ scale: 1.05 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-auto absolute left-3 flex touch-none cursor-grab items-center gap-3 rounded-2xl border border-white/15 bg-ink/90 p-2 pr-3 shadow-2xl backdrop-blur active:cursor-grabbing"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
        >
          <button onClick={() => setMinimized(false)} className="flex items-center gap-3" aria-label="Expand call">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-cipher-gradient text-lg font-bold">
              {participants.length + 1}
            </div>
            <div className="pr-1 text-left">
              <p className="text-sm font-semibold leading-tight">Group call</p>
              <p className={`text-xs ${reconnecting ? 'text-amber-300' : 'text-white/50'}`}>{status}</p>
            </div>
          </button>
          <button onClick={hangup} aria-label="Leave call" className="grid h-10 w-10 place-items-center rounded-full bg-rose-600 text-white transition active:scale-90">
            <PhoneOff className="h-5 w-5" />
          </button>
          {/* keep every participant's audio flowing while collapsed */}
          {participants.map((p) => <Stream key={p.id} stream={p.stream} className="hidden" />)}
        </motion.div>
      </div>
    );
  }

  if (minimized) {
    const videoTile = showVideo && !!remoteStream;
    return (
      // full-screen, click-through boundary so the pill can be dragged anywhere
      // while the app underneath stays interactive
      <div ref={dragBoundsRef} className="pointer-events-none fixed inset-0 z-[80]">
        <motion.div
          drag
          dragConstraints={dragBoundsRef}
          dragElastic={0.06}
          dragMomentum={false}
          whileDrag={{ scale: 1.05 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`pointer-events-auto absolute left-3 touch-none cursor-grab shadow-2xl active:cursor-grabbing ${
            videoTile
              ? 'overflow-hidden rounded-2xl border border-white/20 bg-black'
              : 'flex items-center gap-3 rounded-2xl border border-white/15 bg-ink/90 p-2 pr-3 backdrop-blur'
          }`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
        >
          {videoTile ? (
            <>
              {/* proper floating video tile — tap to expand */}
              <button onClick={() => setMinimized(false)} aria-label="Expand call" className="relative block h-44 w-28">
                <Stream stream={remoteStream} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left">
                  <p className="truncate text-xs font-semibold leading-tight">{call.peerName}</p>
                  <p className={`text-[10px] ${reconnecting ? 'text-amber-300' : 'text-white/60'}`}>{status}</p>
                </div>
              </button>
              <button onClick={hangup} aria-label="End call" className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-rose-600/90 text-white transition active:scale-90">
                <PhoneOff className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setMinimized(false)} className="flex items-center gap-3" aria-label="Expand call">
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-cipher-gradient">
                  <span className="text-lg font-bold">{call.peerName.charAt(0)}</span>
                </div>
                <div className="pr-1 text-left">
                  <p className="text-sm font-semibold leading-tight">{call.peerName}</p>
                  <p className={`text-xs ${reconnecting ? 'text-amber-300' : 'text-white/50'}`}>{status}</p>
                </div>
              </button>
              <button onClick={hangup} aria-label="End call" className="grid h-10 w-10 place-items-center rounded-full bg-rose-600 text-white transition active:scale-90">
                <PhoneOff className="h-5 w-5" />
              </button>
              {/* keep remote audio alive (no big video mounted) */}
              <Stream stream={remoteStream} className="hidden" />
            </>
          )}
        </motion.div>
      </div>
    );
  }

  const MinimizeBtn = (
    <button
      onClick={() => setMinimized(true)}
      aria-label="Minimize call"
      className="absolute left-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition active:scale-90"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
    >
      <ChevronDown className="h-6 w-6" />
    </button>
  );

  const Controls = (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-5 bg-gradient-to-t from-black/70 to-transparent p-8">
      <Action onClick={toggleMute} className={muted ? 'bg-white/20' : 'bg-white/10'} label="Mute">
        {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </Action>
      {showVideo && (
        <Action onClick={toggleCam} className={camOff ? 'bg-white/20' : 'bg-white/10'} label="Camera">
          {camOff ? <VideoOff className="h-6 w-6" /> : <VideoIcon className="h-6 w-6" />}
        </Action>
      )}
      {showVideo && (
        <Action onClick={switchCamera} className="bg-white/10" label="Flip camera">
          <SwitchCamera className="h-6 w-6" />
        </Action>
      )}
      <Action onClick={hangup} className="bg-rose-600" label="End"><PhoneOff className="h-6 w-6" /></Action>
    </div>
  );

  // ── group call: a tile grid of everyone ──
  if (isGroup) {
    const tiles = participants.length + 1;
    const cols = tiles <= 1 ? 1 : tiles <= 4 ? 2 : 3;
    return (
      <Shell dark>
        {MinimizeBtn}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-gradient-to-b from-black/60 to-transparent p-4 text-sm">
          <span className="font-semibold">Group call · {tiles}</span>
          <span className={reconnecting ? 'text-amber-300' : 'text-white/60'}>· {status}</span>
        </div>
        <div
          className="absolute inset-0 grid gap-1.5 p-2 pb-28 pt-16"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: 'minmax(0, 1fr)' }}
        >
          <Tile stream={localStream} name="You" self showVideo={showVideo} />
          {participants.map((p) => (
            <Tile key={p.id} stream={p.stream} name={p.name} showVideo={showVideo} />
          ))}
        </div>
        {Controls}
      </Shell>
    );
  }

  return (
    <Shell dark>
      {MinimizeBtn}
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
            <p className={`mt-1 text-sm ${reconnecting ? 'text-amber-300' : 'text-white/50'}`}>{status}</p>
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
          <span className={reconnecting ? 'text-amber-300' : 'text-white/60'}>· {status}</span>
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
        {showVideo && (
          <Action onClick={switchCamera} className="bg-white/10" label="Flip camera">
            <SwitchCamera className="h-6 w-6" />
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

function Tile({ stream, name, self, showVideo }: { stream: MediaStream | null; name: string; self?: boolean; showVideo: boolean }) {
  return (
    <div className="relative min-h-0 overflow-hidden rounded-xl bg-white/5">
      {showVideo && stream ? (
        <Stream stream={stream} muted={self} className={`h-full w-full object-cover ${self ? '-scale-x-100' : ''}`} />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-cipher-gradient text-xl font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
          {/* keep remote audio flowing when there's no visible video */}
          {!self && stream && <Stream stream={stream} className="hidden" />}
        </div>
      )}
      <div className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/50 px-1.5 py-0.5 text-xs">{name}</div>
    </div>
  );
}

function Action({ children, onClick, className, label }: { children: React.ReactNode; onClick: () => void; className?: string; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className={`grid h-16 w-16 place-items-center rounded-full text-white transition active:scale-90 ${className}`}>
      {children}
    </button>
  );
}
