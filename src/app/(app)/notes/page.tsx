'use client';

import { marked } from 'marked';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { fmtElapsed, useRecorder } from '@/context/recorder';

marked.setOptions({ breaks: true, gfm: true });

interface Folder { id: number; name: string; parent_id: number | null; }
interface Note { id: number; title: string; content: string; folder_id: number | null; tags: string[]; _tagsRaw?: string; }
interface RecordingJob { id: number; status: 'processing' | 'done' | 'failed'; error?: string; }

// Turn a raw transcription error (e.g. a verbatim "429 RESOURCE_EXHAUSTED {…}"
// API blob) into something a human can read. The raw text stays in the tooltip.
function friendlyTranscriptionError(err?: string): string {
  const e = (err ?? '').toLowerCase();
  if (/429|resource_exhausted|quota|rate.?limit/.test(e)) return 'Transcription quota reached — please try again later.';
  if (/timeout|timed out|deadline/.test(e)) return 'Transcription timed out — please retry.';
  if (/413|too large|payload/.test(e)) return 'Recording is too large to transcribe.';
  if (/401|403|api.?key|unauthor/.test(e)) return 'Transcription service rejected the request (auth/key issue).';
  return 'Transcription failed — please retry.';
}

function FolderTree({ folders, selected, onSelect, onCreate, onRename, onDelete }: {
  folders: Folder[]; selected: number | null;
  onSelect: (id: number | null) => void;
  onCreate: () => void;
  onRename: (f: Folder) => void;
  onDelete: (f: Folder) => void;
}) {
  const children = (pid: number | null) => folders.filter((f) => f.parent_id === pid);
  const renderNode = (folder: Folder, depth: number): React.ReactNode => (
    <div key={folder.id}>
      <div className={`tree-item ${selected === folder.id ? 'active' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => onSelect(folder.id)} onDoubleClick={() => onRename(folder)}>
        <span>▸ {folder.name}</span>
        <button className="tree-x" title="Delete folder (notes move to All Notes)"
          onClick={(e) => { e.stopPropagation(); onDelete(folder); }}>×</button>
      </div>
      {children(folder.id).map((c) => renderNode(c, depth + 1))}
    </div>
  );
  return (
    <div>
      <div className={`tree-item ${selected === null ? 'active' : ''}`} style={{ paddingLeft: 12 }} onClick={() => onSelect(null)}>All Notes</div>
      {children(null).map((f) => renderNode(f, 0))}
      <button className="tree-add" onClick={onCreate}>+ New folder</button>
    </div>
  );
}

export default function NotesPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<Note | null>(null);
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [jobs, setJobs] = useState<RecordingJob[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRef = useRef<Note | null>(null);
  currentRef.current = current;
  const recorder = useRecorder();

  const loadMeta = useCallback(async () => {
    const [fs, ts] = await Promise.all([api.get<Folder[]>('/folders'), api.get<string[]>('/notes/tags')]);
    setFolders(fs ?? []);
    setTags(ts ?? []);
  }, []);

  const loadNotes = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    else {
      if (folderId !== null) params.set('folder_id', String(folderId));
      if (activeTag) params.set('tag', activeTag);
    }
    setNotes((await api.get<Note[]>(`/notes?${params}`)) ?? []);
  }, [folderId, activeTag, query]);

  useEffect(() => { loadMeta().catch(console.error); }, [loadMeta]);
  useEffect(() => {
    const t = setTimeout(() => loadNotes().catch(console.error), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [loadNotes, query]);

  const flushSave = async () => {
    const note = currentRef.current;
    if (!note) return;
    setSaveState('saving');
    try {
      await api.put(`/notes/${note.id}`, { title: note.title, content: note.content, tags: note.tags });
      setSaveState('saved');
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, ...note } : n)));
      loadMeta().catch(() => {});
    } catch (err) { setSaveState('error'); console.error(err); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (saveTimer.current) { clearTimeout(saveTimer.current); void flushSave(); } }, []);

  useEffect(() => {
    api.get<RecordingJob[]>('/recordings').then((r) => setJobs(r ?? [])).catch(console.error);
  }, [recorder.uploadedAt]);

  useEffect(() => {
    if (!jobs.some((j) => j.status === 'processing')) return;
    const id = setInterval(async () => {
      try {
        const next = await api.get<RecordingJob[]>('/recordings') ?? [];
        const finished = next.some((j) => j.status === 'done' && jobs.find((o) => o.id === j.id)?.status === 'processing');
        setJobs(next);
        if (finished) loadNotes().catch(console.error);
      } catch (err) { console.error(err); }
    }, 5000);
    return () => clearInterval(id);
  }, [jobs, loadNotes]);

  const retryJob = async (job: RecordingJob) => {
    try { const updated = await api.post<RecordingJob>(`/recordings/${job.id}/retry`, {}); if (updated) setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j))); }
    catch (err) { alert(`Retry failed — ${(err as Error).message}`); }
  };
  const dismissJob = async (job: RecordingJob) => {
    await api.delete(`/recordings/${job.id}`).catch(console.error);
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
  };

  const edit = (patch: Partial<Note>) => {
    setCurrent((prev) => prev ? { ...prev, ...patch } : prev);
    setSaveState('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 800);
  };

  const openNote = async (note: Note) => {
    if (saveState === 'dirty') { if (saveTimer.current) clearTimeout(saveTimer.current); await flushSave(); }
    setCurrent(note); setPreview(false);
  };

  const newNote = async () => {
    const note = await api.post<Note>('/notes', { folder_id: folderId });
    if (!note) return;
    setNotes((prev) => [note, ...prev]); setCurrent(note); setPreview(false);
  };

  const deleteNote = async () => {
    if (!current) return;
    if (!confirm(`Delete note "${current.title}"?`)) return;
    await api.delete(`/notes/${current.id}`);
    setNotes((prev) => prev.filter((n) => n.id !== current.id)); setCurrent(null); loadMeta().catch(() => {});
  };

  const createFolder = async () => {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    const folder = await api.post<Folder>('/folders', { name: name.trim(), parent_id: folderId });
    if (folder) setFolders((prev) => [...prev, folder]);
  };

  const renameFolder = async (folder: Folder) => {
    const name = prompt('Rename folder:', folder.name);
    if (!name?.trim() || name === folder.name) return;
    const updated = await api.put<Folder>(`/folders/${folder.id}`, { name: name.trim() });
    if (updated) setFolders((prev) => prev.map((f) => (f.id === folder.id ? updated : f)));
  };

  const deleteFolder = async (folder: Folder) => {
    if (!confirm(`Delete folder "${folder.name}"? Its notes move to All Notes.`)) return;
    await api.delete(`/folders/${folder.id}`);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    if (folderId === folder.id) setFolderId(null);
    loadNotes().catch(console.error);
  };

  const setNoteTags = (raw: string) => {
    const parsed = raw.split(',').map((t) => t.trim()).filter(Boolean);
    edit({ tags: parsed, _tagsRaw: raw });
  };

  return (
    <div className="notes-layout">
      <aside className="notes-sidebar">
        <button className="btn" style={{ width: '100%' }} onClick={newNote}>+ New Note</button>
        {recorder.status === 'idle' && (
          <button className="btn record-btn" onClick={recorder.start}><span className="rec-dot static" /> Record Meeting</button>
        )}
        {recorder.status === 'recording' && (
          <button className="btn record-btn recording" onClick={recorder.stop}>■ Stop · {fmtElapsed(recorder.elapsed)}</button>
        )}
        {recorder.status === 'uploading' && <button className="btn record-btn" disabled>Uploading…</button>}
        {recorder.error && (
          <div className="rec-error" onClick={() => recorder.setError(null)} title="Click to dismiss">{recorder.error}</div>
        )}
        <div className="notes-section">Folders</div>
        <FolderTree folders={folders} selected={folderId}
          onSelect={(id) => { setFolderId(id); setActiveTag(null); setQuery(''); }}
          onCreate={createFolder} onRename={renameFolder} onDelete={deleteFolder} />
        {tags.length > 0 && (
          <>
            <div className="notes-section">Tags</div>
            <div className="tag-cloud">
              {tags.map((t) => (
                <button key={t} className={`tag ${activeTag === t ? 'active' : ''}`}
                  onClick={() => { setActiveTag(activeTag === t ? null : t); setQuery(''); }}>#{t}</button>
              ))}
            </div>
          </>
        )}
      </aside>
      <div className="notes-list">
        <input className="input" placeholder="Search all notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="notes-items">
          {jobs.filter((j) => j.status !== 'done').map((j) => (
            <div key={`job${j.id}`} className={`job-item ${j.status}`}>
              {j.status === 'processing' ? (
                <><span className="spinner" /> Transcribing… this can take a few minutes.</>
              ) : (
                <>
                  <div className="job-error" title={j.error}>{friendlyTranscriptionError(j.error)}</div>
                  <div className="job-actions">
                    <button className="btn secondary small" onClick={() => retryJob(j)}>Retry</button>
                    <button className="btn danger small" onClick={() => dismissJob(j)}>Discard</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {notes.length === 0 && <p className="muted" style={{ padding: '0 4px' }}>No notes.</p>}
          {notes.map((n) => (
            <div key={n.id} className={`note-item ${current?.id === n.id ? 'active' : ''}`} onClick={() => openNote(n)}>
              <div className="note-item-title">{n.title || 'Untitled'}</div>
              <div className="note-item-preview">{n.content.slice(0, 80) || 'Empty note'}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="notes-editor">
        {!current ? (
          <div className="notes-empty muted">Select a note or create one.</div>
        ) : (
          <>
            <div className="editor-toolbar">
              <input className="editor-title" value={current.title} onChange={(e) => edit({ title: e.target.value })} placeholder="Untitled" />
              <span className={`save-state ${saveState}`}>{{ saved: 'Saved', dirty: '…', saving: 'Saving…', error: 'Save failed!' }[saveState]}</span>
              <button className="btn secondary small" onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
              <button className="btn danger small" onClick={deleteNote}>Delete</button>
            </div>
            <input className="input editor-tags" placeholder="tags, comma, separated"
              value={current._tagsRaw ?? current.tags.join(', ')} onChange={(e) => setNoteTags(e.target.value)} />
            {preview ? (
              <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: String(marked.parse(current.content || '*Empty note*')) }} />
            ) : (
              <textarea className="editor-body" value={current.content} onChange={(e) => edit({ content: e.target.value })} placeholder="Write in Markdown…" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
