'use client';

import { useRef, useState } from 'react';

// Real microphone capture via getUserMedia + MediaRecorder.
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const startedAt = useRef(0);

  async function start(): Promise<boolean> {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Recording is not supported on this device.');
      return false;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mr = new MediaRecorder(s);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.start();
      rec.current = mr;
      startedAt.current = Date.now();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
      return true;
    } catch {
      setError('Microphone permission denied.');
      setRecording(false);
      return false;
    }
  }

  function teardown() {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    rec.current = null;
    setRecording(false);
  }

  // Stop and resolve the recorded blob + duration (null if nothing usable).
  function stop(): Promise<{ blob: Blob; duration: number } | null> {
    return new Promise((resolve) => {
      const mr = rec.current;
      const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      if (!mr) { teardown(); setSeconds(0); resolve(null); return; }
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        teardown();
        setSeconds(0);
        resolve(blob.size ? { blob, duration } : null);
      };
      try { mr.stop(); } catch { teardown(); setSeconds(0); resolve(null); }
    });
  }

  function cancel() {
    try { rec.current?.stop(); } catch { /* noop */ }
    teardown();
    setSeconds(0);
  }

  return { recording, seconds, error, start, stop, cancel };
}
