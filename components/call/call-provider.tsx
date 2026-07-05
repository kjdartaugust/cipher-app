'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/store';
import { sendPush } from '@/lib/push';

type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected';

interface ActiveCall {
  convId: string;
  peerId: string;
  peerName: string;
  video: boolean;
  offer?: RTCSessionDescriptionInit; // stored for an incoming call until accepted
}

interface CallCtx {
  state: CallState;
  call: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  camOff: boolean;
  reconnecting: boolean;
  startCall: (convId: string, peerId: string, peerName: string, video: boolean) => void;
  accept: () => void;
  decline: () => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleCam: () => void;
  switchCamera: () => void;
}

const Ctx = createContext<CallCtx | null>(null);
export const useCall = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCall must be used within CallProvider');
  return c;
};

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { me, conversations, logCall } = useApp();
  const [state, setState] = useState<CallState>('idle');
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const sb = useRef(createClient());
  const pc = useRef<RTCPeerConnection | null>(null);
  const channels = useRef<Record<string, RealtimeChannel>>({});
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  callRef.current = call;
  const isCaller = useRef(false);
  const connectedAt = useRef(0);
  const concluded = useRef(false);
  const facingMode = useRef<'user' | 'environment'>('user');

  // Only the caller posts the call record (avoids duplicates).
  const conclude = useCallback(() => {
    if (!isCaller.current || concluded.current) return;
    const c = callRef.current;
    if (!c) return;
    concluded.current = true;
    const dur = connectedAt.current ? Math.round((Date.now() - connectedAt.current) / 1000) : null;
    logCall(c.convId, c.video ? 'video' : 'voice', dur);
  }, [logCall]);

  const send = useCallback((convId: string, payload: Record<string, unknown>) => {
    channels.current[convId]?.send({ type: 'broadcast', event: 'signal', payload: { ...payload, from: me.id } });
  }, [me.id]);

  const clearGrace = useCallback(() => {
    if (graceTimer.current) { clearTimeout(graceTimer.current); graceTimer.current = null; }
  }, []);

  const cleanup = useCallback(() => {
    clearGrace();
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    pc.current?.close();
    pc.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCamOff(false);
    setReconnecting(false);
    setState('idle');
    setCall(null);
  }, [clearGrace]);

  // End the call for real: tell the peer, log it, tear down. Used when the
  // connection can't recover (e.g. one side backgrounded on iOS and stayed away).
  const endGracefully = useCallback(() => {
    if (callRef.current) send(callRef.current.convId, { kind: 'hangup' });
    conclude();
    cleanup();
  }, [send, conclude, cleanup]);

  const buildPeer = useCallback((convId: string) => {
    const peer = new RTCPeerConnection(ICE);
    peer.onicecandidate = (e) => {
      if (e.candidate) send(convId, { kind: 'ice', candidate: e.candidate.toJSON() });
    };
    peer.ontrack = (e) => setRemoteStream(e.streams[0]);
    peer.onconnectionstatechange = () => {
      const st = peer.connectionState;
      if (st === 'connected') {
        // recovered (or first connect) — clear any pending "give up" timer
        clearGrace();
        setReconnecting(false);
      } else if (st === 'disconnected') {
        // transient — usually one side backgrounded. Show "Reconnecting…" and
        // give it a window to come back before we conclude the call.
        setReconnecting(true);
        clearGrace();
        graceTimer.current = setTimeout(endGracefully, 15000);
      } else if (st === 'failed') {
        endGracefully();
      }
    };
    pc.current = peer;
    return peer;
  }, [send, clearGrace, endGracefully]);

  async function getMedia(video: boolean) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }

  // Coming back to the foreground (iOS suspends WebRTC while the PWA is
  // backgrounded). If the connection is limping, nudge ICE to re-establish
  // instead of leaving a frozen call.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) return;
      const peer = pc.current;
      if (peer && callRef.current && (peer.connectionState === 'disconnected' || peer.connectionState === 'failed')) {
        peer.restartIce?.();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // ── signaling: subscribe to a call channel per conversation ──
  useEffect(() => {
    const supabase = sb.current;
    if (!supabase) return;
    const active = new Set(conversations.map((c) => c.id));

    for (const conv of conversations) {
      if (channels.current[conv.id]) continue;
      const ch = supabase.channel(`call:${conv.id}`);
      ch.on('broadcast', { event: 'signal' }, ({ payload }: { payload: any }) => {
        if (payload.from === me.id) return;
        handleSignal(conv.id, payload);
      });
      ch.subscribe();
      channels.current[conv.id] = ch;
    }
    // drop channels for removed conversations
    for (const id of Object.keys(channels.current)) {
      if (!active.has(id)) {
        channels.current[id].unsubscribe();
        delete channels.current[id];
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, me.id]);

  async function handleSignal(convId: string, p: any) {
    if (p.kind === 'offer') {
      const existing = callRef.current;
      if (existing) {
        // Glare: we both dialed each other at the same moment, so each of us is
        // mid-outgoing and sees the other's offer. If both just send "busy" the
        // two calls cancel and nothing connects. Resolve it deterministically —
        // the lower userId stays the caller; the other abandons its own offer
        // and answers this one, so the call goes through either way.
        const glare = existing.peerId === p.from && isCaller.current && connectedAt.current === 0;
        if (glare && me.id < p.from) {
          return; // I win — keep my outgoing offer; ignore theirs (they'll answer mine)
        }
        if (glare) {
          // I lose — tear down my outgoing attempt and answer their offer.
          pc.current?.getSenders().forEach((s) => s.track?.stop());
          pc.current?.close();
          pc.current = null;
          localRef.current?.getTracks().forEach((t) => t.stop());
          localRef.current = null;
          pendingIce.current = [];
          isCaller.current = false;
          concluded.current = false;
          connectedAt.current = 0;
          const incoming = { convId, peerId: p.from, peerName: p.fromName ?? existing.peerName, video: !!p.video, offer: p.sdp };
          callRef.current = incoming; // so accept() sees it synchronously
          setCall(incoming);
          await accept();
          return;
        }
        // Genuinely busy — a different peer, or already in a connected call.
        send(convId, { kind: 'busy' });
        return;
      }
      isCaller.current = false;
      concluded.current = false;
      connectedAt.current = 0;
      setCall({ convId, peerId: p.from, peerName: p.fromName ?? 'Someone', video: !!p.video, offer: p.sdp });
      setState('incoming');
    } else if (p.kind === 'answer') {
      await pc.current?.setRemoteDescription(new RTCSessionDescription(p.sdp));
      for (const c of pendingIce.current) await pc.current?.addIceCandidate(c).catch(() => {});
      pendingIce.current = [];
      connectedAt.current = Date.now();
      setState('connected');
    } else if (p.kind === 'ice') {
      if (pc.current?.remoteDescription) await pc.current.addIceCandidate(p.candidate).catch(() => {});
      else pendingIce.current.push(p.candidate);
    } else if (p.kind === 'hangup' || p.kind === 'decline' || p.kind === 'busy') {
      conclude();
      cleanup();
    }
  }

  const startCall = useCallback(async (convId: string, peerId: string, peerName: string, video: boolean) => {
    if (!sb.current) { alert('Calling requires the live app (Supabase mode).'); return; }
    if (callRef.current) return;
    try {
      isCaller.current = true;
      concluded.current = false;
      connectedAt.current = 0;
      setCall({ convId, peerId, peerName, video });
      setState('outgoing');
      const stream = await getMedia(video);
      const peer = buildPeer(convId);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      send(convId, { kind: 'offer', sdp: offer, video, fromName: me.name });
      // wake the callee even if their app is closed
      sendPush({ userIds: [peerId], title: me.name, body: `Incoming ${video ? 'video' : 'voice'} call`, url: `/messages/${convId}`, tag: `call-${convId}`, call: true });
    } catch {
      alert('Could not access your microphone/camera.');
      cleanup();
    }
  }, [buildPeer, send, me.name, cleanup]);

  const accept = useCallback(async () => {
    const c = callRef.current;
    if (!c?.offer) return;
    try {
      const stream = await getMedia(c.video);
      const peer = buildPeer(c.convId);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(c.offer));
      for (const cand of pendingIce.current) await peer.addIceCandidate(cand).catch(() => {});
      pendingIce.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send(c.convId, { kind: 'answer', sdp: answer });
      connectedAt.current = Date.now();
      setState('connected');
    } catch {
      alert('Could not access your microphone/camera.');
      decline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildPeer, send]);

  const decline = useCallback(() => {
    if (callRef.current) send(callRef.current.convId, { kind: 'decline' });
    cleanup();
  }, [send, cleanup]);

  const hangup = useCallback(() => {
    if (callRef.current) send(callRef.current.convId, { kind: 'hangup' });
    conclude();
    cleanup();
  }, [send, cleanup, conclude]);

  const toggleMute = useCallback(() => {
    const t = localRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
  }, []);
  const toggleCam = useCallback(() => {
    const t = localRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOff(!t.enabled); }
  }, []);

  const switchCamera = useCallback(async () => {
    if (!callRef.current?.video || !pc.current || !localRef.current) return;
    const next = facingMode.current === 'user' ? 'environment' : 'user';
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false });
      const nt = ns.getVideoTracks()[0];
      if (!nt) return;
      await pc.current.getSenders().find((s) => s.track?.kind === 'video')?.replaceTrack(nt);
      const old = localRef.current.getVideoTracks()[0];
      if (old) { localRef.current.removeTrack(old); old.stop(); }
      localRef.current.addTrack(nt);
      setLocalStream(new MediaStream(localRef.current.getTracks()));
      facingMode.current = next;
    } catch {
      // no second camera available
    }
  }, []);

  return (
    <Ctx.Provider value={{ state, call, localStream, remoteStream, muted, camOff, reconnecting, startCall, accept, decline, hangup, toggleMute, toggleCam, switchCamera }}>
      {children}
    </Ctx.Provider>
  );
}
