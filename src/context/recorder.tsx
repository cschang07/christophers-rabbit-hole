'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

type RecorderStatus = 'idle' | 'recording' | 'uploading';

interface RecorderContextValue {
  status: RecorderStatus;
  elapsed: number;
  error: string | null;
  uploadedAt: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  setError: (err: string | null) => void;
}

const Ctx = createContext<RecorderContextValue | null>(null);
export const useRecorder = () => useContext(Ctx)!;

export function RecorderProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState(0);
  const media = useRef<{ recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; mime: string } | null>(null);
  const startTs = useRef(0);

  useEffect(() => {
    if (status !== 'recording') return;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startTs.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== 'recording') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(1000);
      media.current = { recorder, stream, chunks, mime: recorder.mimeType };
      startTs.current = Date.now();
      setElapsed(0);
      setStatus('recording');
    } catch (err) {
      setError(`Microphone unavailable — ${(err as Error).message}`);
    }
  };

  const stop = async () => {
    const m = media.current;
    if (!m) return;
    setStatus('uploading');
    await new Promise<void>((resolve) => { m.recorder.onstop = () => resolve(); m.recorder.stop(); });
    m.stream.getTracks().forEach((t) => t.stop());
    media.current = null;
    const type = m.mime || 'audio/webm';
    const blob = new Blob(m.chunks, { type });
    const ext = type.includes('mp4') ? 'm4a' : 'webm';
    const form = new FormData();
    form.append('file', blob, `recording.${ext}`);
    try {
      const res = await fetch('/api/recordings', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      setUploadedAt(Date.now());
    } catch (err) {
      setError(`Upload failed — ${(err as Error).message}. Audio downloaded to your computer.`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
      a.click();
    }
    setStatus('idle');
  };

  return (
    <Ctx.Provider value={{ status, elapsed, error, uploadedAt, start, stop, setError }}>
      {children}
    </Ctx.Provider>
  );
}

export function fmtElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
