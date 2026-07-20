'use client';

import { useState } from 'react';
import {
  PERSONAL_STATUSES,
  STATUS_LABELS,
  type Task,
  type TaskInput,
  type TaskStatus,
} from './useTasks';

interface Props {
  task: Task | null;
  defaultStatus?: Task['status'];
  /** Status choices shown in the select. Defaults to personal (no 未來規劃). */
  statusOptions?: readonly TaskStatus[];
  onSave: (data: TaskInput) => Promise<unknown>;
  onDelete?: (() => Promise<void>) | null;
  onClose: () => void;
}

export default function TaskModal({
  task,
  defaultStatus,
  statusOptions = PERSONAL_STATUSES,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const initialStatus = task?.status ?? defaultStatus ?? 'todo';
  const safeInitialStatus = statusOptions.includes(initialStatus)
    ? initialStatus
    : (statusOptions[0] ?? 'todo');
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<Task['status']>(safeInitialStatus);
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.due_date ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: TaskInput = { title: title.trim(), description, status, priority };
      if (dueDate) data.due_date = dueDate;
      else if (task?.due_date) data.clear_due_date = true;
      await onSave(data);
      onClose();
    } catch (err) {
      alert(`Save failed — ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{task ? 'Edit Task' : 'New Task'}</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Due date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="form-actions">
            {task && onDelete && (
              <button type="button" className="btn danger" style={{ marginRight: 'auto' }}
                onClick={async () => { await onDelete!(); onClose(); }}>
                Delete
              </button>
            )}
            <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
