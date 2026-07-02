'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

type RecorderStatus = 'idle' | 'recording' | 'uploading';

interface RecoveredRecording { sizeBytes: number; startedAt: number; }

interface RecorderContextValue {
  status: RecorderStatus;
  elapsed: number;
  error: string | null;
  uploadedAt: number;
  uploadProgress: number | null;
  recovered: RecoveredRecording | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  recoverUpload: () => Promise<void>;
  recoverDiscard: () => Promise<void>;
  setError: (err: string | null) => void;
}

const Ctx = createContext<RecorderContextValue | null>(null);
export const useRecorder = () => useContext(Ctx)!;

// --- IndexedDB backup ---------------------------------------------------
// Every audio chunk is mirrored to IndexedDB while recording, so a crashed
// tab, dead battery, or accidental refresh mid-meeting loses nothing: the
// backup is offered for upload on the next visit.

const DB_NAME = 'recorder-backup';
const CHUNKS = 'chunks';
const META = 'meta';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CHUNKS)) db.createObjectStore(CHUNKS, { autoIncrement: true });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbRun(mode: IDBTransactionMode, fn: (chunks: IDBObjectStore, meta: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHUNKS, META], mode);
    fn(tx.objectStore(CHUNKS), tx.objectStore(META));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

const idbAppendChunk = (chunk: Blob) => idbRun('readwrite', (chunks) => { chunks.add(chunk); });
const idbClear = () => idbRun('readwrite', (chunks, meta) => { chunks.clear(); meta.clear(); });
const idbSetMeta = (value: { mime: string; startedAt: number }) =>
  idbRun('readwrite', (_, meta) => { meta.put(value, 'session'); });

async function idbLoad(): Promise<{ chunks: Blob[]; meta: { mime: string; startedAt: number } | null }> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHUNKS, META], 'readonly');
    const chunksReq = tx.objectStore(CHUNKS).getAll();
    const metaReq = tx.objectStore(META).get('session');
    tx.oncomplete = () => {
      db.close();
      resolve({ chunks: (chunksReq.result as Blob[]) ?? [], meta: metaReq.result ?? null });
    };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// -------------------------------------------------------------------------

function extFor(mime: string): string {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

function downloadBlob(blob: Blob, ext: string) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function RecorderProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [recovered, setRecovered] = useState<RecoveredRecording | null>(null);
  const media = useRef<{ recorder: MediaRecorder; stream: MediaStream; chunks: Blob[]; mime: string } | null>(null);
  const startTs = useRef(0);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const pendingWrites = useRef<Set<Promise<void>>>(new Set());

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

  // Keep the screen awake during long recordings — a sleeping phone suspends
  // the tab and silently kills the MediaRecorder. Re-acquire on tab return.
  useEffect(() => {
    if (status !== 'recording') return;
    const acquire = async () => {
      try { wakeLock.current = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* unsupported */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [status]);

  // Detect an interrupted recording from a previous visit.
  useEffect(() => {
    idbLoad().then(({ chunks, meta }) => {
      if (chunks.length && meta) {
        setRecovered({ sizeBytes: chunks.reduce((s, c) => s + c.size, 0), startedAt: meta.startedAt });
      }
    }).catch(() => {});
  }, []);

  const uploadBlob = (blob: Blob, filename: string) =>
    new Promise<void>((resolve, reject) => {
      const form = new FormData();
      form.append('file', blob, filename);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/recordings');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`${xhr.status}: ${xhr.responseText.slice(0, 300)}`)));
      xhr.onerror = () => reject(new Error('network error'));
      xhr.send(form);
    });

  const start = async () => {
    setError(null);
    // Never clobber an unresolved crash backup — check IndexedDB directly
    // (not just state) so a click racing the initial load can't slip through.
    const backup = await idbLoad().catch(() => null);
    if (backup?.chunks.length && backup.meta) {
      setRecovered({ sizeBytes: backup.chunks.reduce((s, c) => s + c.size, 0), startedAt: backup.meta.startedAt });
      setError('An unsaved recording backup exists — Transcribe or Discard it before recording again.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      // 64 kbps mono opus is plenty for speech transcription and bounds a
      // 3-hour meeting to well under 100 MB in memory.
      const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 64_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          const write = idbAppendChunk(e.data).catch(() => {});
          pendingWrites.current.add(write);
          void write.finally(() => pendingWrites.current.delete(write));
        }
      };
      await idbClear().catch(() => {});
      setRecovered(null);
      await idbSetMeta({ mime: recorder.mimeType || mime || 'audio/webm', startedAt: Date.now() }).catch(() => {});
      recorder.start(5000);
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
    setUploadProgress(0);
    await new Promise<void>((resolve) => { m.recorder.onstop = () => resolve(); m.recorder.stop(); });
    m.stream.getTracks().forEach((t) => t.stop());
    media.current = null;
    const type = m.mime || 'audio/webm';
    const blob = new Blob(m.chunks, { type });
    const ext = extFor(type);
    // let in-flight chunk writes land first: a straggler after idbClear would
    // re-add stale data, and a recovery upload could read a truncated backup
    await Promise.allSettled([...pendingWrites.current]);
    try {
      await uploadBlob(blob, `recording.${ext}`);
      setUploadedAt(Date.now());
      await idbClear().catch(() => {});
    } catch (err) {
      setError(`Upload failed — ${(err as Error).message}. Audio downloaded to your computer — you can re-upload it with "Upload audio".`);
      downloadBlob(blob, ext);
      // Keep the IndexedDB backup too, so the recovery banner offers a retry.
      setRecovered({ sizeBytes: blob.size, startedAt: startTs.current });
    }
    setStatus('idle');
    setUploadProgress(null);
  };

  const uploadFile = async (file: File) => {
    if (status !== 'idle') return;
    setError(null);
    setStatus('uploading');
    setUploadProgress(0);
    try {
      await uploadBlob(file, file.name || 'upload.webm');
      setUploadedAt(Date.now());
    } catch (err) {
      setError(`Upload failed — ${(err as Error).message}`);
    }
    setStatus('idle');
    setUploadProgress(null);
  };

  const recoverUpload = async () => {
    if (status !== 'idle') return;
    setError(null);
    setStatus('uploading');
    setUploadProgress(0);
    try {
      const { chunks, meta } = await idbLoad();
      if (!chunks.length) throw new Error('backup is empty');
      const type = meta?.mime || 'audio/webm';
      const blob = new Blob(chunks, { type });
      await uploadBlob(blob, `recovered.${extFor(type)}`);
      setUploadedAt(Date.now());
      await idbClear().catch(() => {});
      setRecovered(null);
    } catch (err) {
      setError(`Recovery upload failed — ${(err as Error).message}`);
    }
    setStatus('idle');
    setUploadProgress(null);
  };

  const recoverDiscard = async () => {
    await idbClear().catch(() => {});
    setRecovered(null);
  };

  return (
    <Ctx.Provider value={{
      status, elapsed, error, uploadedAt, uploadProgress, recovered,
      start, stop, uploadFile, recoverUpload, recoverDiscard, setError,
    }}>
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

export function fmtBytes(bytes: number): string {
  if (bytes >= 1 << 30) return `${(bytes / (1 << 30)).toFixed(1)} GB`;
  if (bytes >= 1 << 20) return `${(bytes / (1 << 20)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
