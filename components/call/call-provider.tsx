'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/store';
import { sendPush } from '@/lib/push';
import { primeAudio } from '@/lib/ringtone';

type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected';

interface ActiveCall {
  convId: string;
  peerId: string;
  peerName: string;
  video: boolean;
  isGroup?: boolean;
  offer?: RTCSessionDescriptionInit; // stored for an incoming call until accepted
}

export interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
}

interface CallCtx {
  state: CallState;
  call: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participants: Participant[]; // remote peers in a group call
  isGroup: boolean;
  muted: boolean;
  camOff: boolean;
  reconnecting: boolean;
  startCall: (convId: string, peerId: string, peerName: string, video: boolean) => void;
  startGroupCall: (convId: string, video: boolean) => void;
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

// Fallback used until /api/turn responds (and if TURN isn't configured).
const FALLBACK_ICE: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { me, conversations, logCall, setChatting } = useApp();
  const [state, setState] = useState<CallState>('idle');
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // ── group-call (mesh) state — a peer connection per other participant ──
  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const gPendingIce = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const gNames = useRef<Record<string, string>>({});
  const inGroup = useRef(false);
  const gConvId = useRef('');
  const gVideo = useRef(false);
  const isGroupRef = useRef(false);
  const [isGroup, setIsGroup] = useState(false);

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
  const iceConfig = useRef<RTCConfiguration>(FALLBACK_ICE);
  const iceFetchedAt = useRef(0);

  // Pull fresh ICE servers (incl. Cloudflare TURN) from /api/turn. Cached for an
  // hour; creds are valid 24h. Never throws — worst case we keep the fallback.
  const ensureIce = useCallback(async () => {
    if (iceFetchedAt.current && Date.now() - iceFetchedAt.current < 60 * 60 * 1000) return;
    try {
      const res = await fetch('/api/turn');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length) {
        iceConfig.current = { iceServers: data.iceServers };
        iceFetchedAt.current = Date.now();
      }
    } catch {
      // keep whatever config we already have
    }
  }, []);

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
    const peer = new RTCPeerConnection(iceConfig.current);
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

  // Broadcast "in a call" presence to others while a call is active.
  useEffect(() => {
    setChatting(state !== 'idle');
  }, [state, setChatting]);

  // Keep the audio context warm so the *receiver's* ringtone can play when a
  // call arrives. iOS only lets audio start inside a user gesture and re-suspends
  // it when idle/backgrounded, so we re-prime on every interaction — not just the
  // first — and again whenever the app returns to the foreground.
  useEffect(() => {
    const prime = () => primeAudio();
    window.addEventListener('pointerdown', prime);
    window.addEventListener('touchstart', prime, { passive: true });
    window.addEventListener('keydown', prime);
    document.addEventListener('visibilitychange', prime);
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('touchstart', prime);
      window.removeEventListener('keydown', prime);
      document.removeEventListener('visibilitychange', prime);
    };
  }, []);

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
      // group mesh peers
      Object.values(peers.current).forEach((gp) => {
        if (gp.connectionState === 'disconnected' || gp.connectionState === 'failed') gp.restartIce?.();
      });
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
    if (typeof p.kind === 'string' && p.kind.startsWith('g-')) { await handleGroupSignal(convId, p); return; }
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

  // ────────────────────────── group calls (mesh) ──────────────────────────
  // Everyone opens a direct RTCPeerConnection to everyone else. Signaling is
  // targeted with a `to` field. To avoid two-sided offers ("glare"), for any
  // pair the lower userId makes the offer and the other answers.

  function ensureParticipant(id: string, name?: string) {
    if (name) gNames.current[id] = name;
    if (!gNames.current[id]) gNames.current[id] = 'Guest';
    setParticipants((ps) => (ps.some((p) => p.id === id) ? ps : [...ps, { id, name: gNames.current[id], stream: null }]));
  }

  function markGroupConnected() {
    if (connectedAt.current === 0) connectedAt.current = Date.now();
    setReconnecting(false);
    setState('connected');
  }

  function removeGroupPeer(id: string) {
    peers.current[id]?.getSenders().forEach((s) => s.track?.stop());
    peers.current[id]?.close();
    delete peers.current[id];
    delete gPendingIce.current[id];
    setParticipants((ps) => {
      const next = ps.filter((p) => p.id !== id);
      if (next.length === 0 && inGroup.current) {
        // everyone else has left — end the call
        setTimeout(() => { conclude(); cleanupGroup(); }, 0);
      }
      return next;
    });
  }

  function buildGroupPeer(convId: string, peerId: string) {
    const peer = new RTCPeerConnection(iceConfig.current);
    peer.onicecandidate = (e) => {
      if (e.candidate) send(convId, { kind: 'g-ice', to: peerId, candidate: e.candidate.toJSON() });
    };
    peer.ontrack = (e) => {
      const stream = e.streams[0];
      setParticipants((ps) =>
        ps.some((p) => p.id === peerId)
          ? ps.map((p) => (p.id === peerId ? { ...p, stream } : p))
          : [...ps, { id: peerId, name: gNames.current[peerId] ?? 'Guest', stream }]
      );
    };
    peer.onconnectionstatechange = () => {
      const st = peer.connectionState;
      if (st === 'connected') markGroupConnected();
      else if (st === 'failed' || st === 'closed') removeGroupPeer(peerId);
    };
    peers.current[peerId] = peer;
    return peer;
  }

  async function connectToPeer(convId: string, peerId: string) {
    if (peers.current[peerId] || !localRef.current) return;
    ensureParticipant(peerId);
    if (me.id < peerId) {
      const peer = buildGroupPeer(convId, peerId);
      localRef.current.getTracks().forEach((t) => peer.addTrack(t, localRef.current!));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      send(convId, { kind: 'g-offer', to: peerId, sdp: offer, fromName: me.name });
    }
    // else: I have the higher id — wait for their offer
  }

  function cleanupGroup() {
    clearGrace();
    Object.values(peers.current).forEach((pc2) => { pc2.getSenders().forEach((s) => s.track?.stop()); pc2.close(); });
    peers.current = {};
    gPendingIce.current = {};
    gNames.current = {};
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    inGroup.current = false;
    isGroupRef.current = false;
    gConvId.current = '';
    setParticipants([]);
    setIsGroup(false);
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCamOff(false);
    setReconnecting(false);
    setState('idle');
    setCall(null);
  }

  async function handleGroupSignal(convId: string, p: any) {
    if (p.to && p.to !== me.id) return; // targeted at someone else

    if (p.kind === 'g-ring') {
      // Already in this call (e.g. two people started at once) → just connect.
      if (inGroup.current && convId === gConvId.current) {
        ensureParticipant(p.from, p.fromName);
        send(convId, { kind: 'g-present', to: p.from, fromName: me.name, video: gVideo.current });
        await connectToPeer(convId, p.from);
        return;
      }
      if (inGroup.current || callRef.current) return; // busy elsewhere
      gNames.current[p.from] = p.fromName ?? 'Someone';
      isGroupRef.current = true;
      gConvId.current = convId;
      gVideo.current = !!p.video;
      const incoming: ActiveCall = { convId, peerId: p.from, peerName: p.fromName ?? 'Someone', video: !!p.video, isGroup: true };
      callRef.current = incoming;
      setCall(incoming);
      setIsGroup(true);
      setState('incoming');
      return;
    }

    if (p.kind === 'g-join') {
      if (!inGroup.current) return;
      ensureParticipant(p.from, p.fromName);
      send(convId, { kind: 'g-present', to: p.from, fromName: me.name, video: gVideo.current });
      await connectToPeer(convId, p.from);
      return;
    }

    if (p.kind === 'g-present') {
      if (!inGroup.current) return;
      ensureParticipant(p.from, p.fromName);
      await connectToPeer(convId, p.from);
      return;
    }

    if (p.kind === 'g-offer') {
      if (!inGroup.current || !localRef.current) return;
      ensureParticipant(p.from, p.fromName);
      let peer = peers.current[p.from];
      if (!peer) {
        peer = buildGroupPeer(convId, p.from);
        localRef.current.getTracks().forEach((t) => peer.addTrack(t, localRef.current!));
      }
      await peer.setRemoteDescription(new RTCSessionDescription(p.sdp));
      for (const c of gPendingIce.current[p.from] ?? []) await peer.addIceCandidate(c).catch(() => {});
      gPendingIce.current[p.from] = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send(convId, { kind: 'g-answer', to: p.from, sdp: answer });
      markGroupConnected();
      return;
    }

    if (p.kind === 'g-answer') {
      const peer = peers.current[p.from];
      if (!peer) return;
      await peer.setRemoteDescription(new RTCSessionDescription(p.sdp));
      for (const c of gPendingIce.current[p.from] ?? []) await peer.addIceCandidate(c).catch(() => {});
      gPendingIce.current[p.from] = [];
      markGroupConnected();
      return;
    }

    if (p.kind === 'g-ice') {
      const peer = peers.current[p.from];
      if (peer?.remoteDescription) await peer.addIceCandidate(p.candidate).catch(() => {});
      else (gPendingIce.current[p.from] ??= []).push(p.candidate);
      return;
    }

    if (p.kind === 'g-leave') {
      removeGroupPeer(p.from);
    }
  }

  async function acceptGroup() {
    const c = callRef.current;
    if (!c) return;
    try {
      gConvId.current = c.convId;
      gVideo.current = c.video;
      ensureParticipant(c.peerId, c.peerName);
      await Promise.all([getMedia(c.video), ensureIce()]);
      inGroup.current = true;
      markGroupConnected();
      send(c.convId, { kind: 'g-join', video: c.video, fromName: me.name });
    } catch {
      alert('Could not access your microphone/camera.');
      cleanupGroup();
    }
  }

  function hangupGroup() {
    if (gConvId.current) send(gConvId.current, { kind: 'g-leave' });
    conclude();
    cleanupGroup();
  }

  const startGroupCall = useCallback(async (convId: string, video: boolean) => {
    if (!sb.current) { alert('Calling requires the live app (Supabase mode).'); return; }
    if (callRef.current || inGroup.current) return;
    try {
      isGroupRef.current = true;
      gConvId.current = convId;
      gVideo.current = video;
      isCaller.current = true;
      concluded.current = false;
      connectedAt.current = 0;
      const c: ActiveCall = { convId, peerId: '', peerName: 'Group call', video, isGroup: true };
      callRef.current = c;
      setCall(c);
      setIsGroup(true);
      setState('outgoing');
      await Promise.all([getMedia(video), ensureIce()]);
      inGroup.current = true;
      send(convId, { kind: 'g-ring', video, fromName: me.name });
      const conv = conversations.find((cv) => cv.id === convId);
      const others = conv?.memberIds.filter((id) => id !== me.id) ?? [];
      if (others.length) {
        sendPush({ userIds: others, title: me.name, body: `Group ${video ? 'video' : 'voice'} call`, url: `/messages/${convId}`, tag: `call-${convId}`, call: true });
      }
    } catch {
      alert('Could not access your microphone/camera.');
      cleanupGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send, ensureIce, me.id, me.name, conversations]);

  const startCall = useCallback(async (convId: string, peerId: string, peerName: string, video: boolean) => {
    if (!sb.current) { alert('Calling requires the live app (Supabase mode).'); return; }
    if (callRef.current) return;
    try {
      isCaller.current = true;
      concluded.current = false;
      connectedAt.current = 0;
      setCall({ convId, peerId, peerName, video });
      setState('outgoing');
      const [stream] = await Promise.all([getMedia(video), ensureIce()]);
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
  }, [buildPeer, send, me.name, cleanup, ensureIce]);

  const accept = useCallback(async () => {
    if (callRef.current?.isGroup) { await acceptGroup(); return; }
    const c = callRef.current;
    if (!c?.offer) return;
    try {
      const [stream] = await Promise.all([getMedia(c.video), ensureIce()]);
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
  }, [buildPeer, send, ensureIce]);

  const decline = useCallback(() => {
    if (callRef.current?.isGroup) { cleanupGroup(); return; }
    if (callRef.current) send(callRef.current.convId, { kind: 'decline' });
    cleanup();
  }, [send, cleanup]);

  const hangup = useCallback(() => {
    if (isGroupRef.current || callRef.current?.isGroup) { hangupGroup(); return; }
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
    if (!callRef.current?.video || !localRef.current) return;
    const usingGroup = isGroupRef.current;
    if (!usingGroup && !pc.current) return;
    const next = facingMode.current === 'user' ? 'environment' : 'user';
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false });
      const nt = ns.getVideoTracks()[0];
      if (!nt) return;
      if (usingGroup) {
        Object.values(peers.current).forEach((peer) => {
          peer.getSenders().find((s) => s.track?.kind === 'video')?.replaceTrack(nt);
        });
      } else {
        await pc.current!.getSenders().find((s) => s.track?.kind === 'video')?.replaceTrack(nt);
      }
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
    <Ctx.Provider value={{ state, call, localStream, remoteStream, participants, isGroup, muted, camOff, reconnecting, startCall, startGroupCall, accept, decline, hangup, toggleMute, toggleCam, switchCamera }}>
      {children}
    </Ctx.Provider>
  );
}
