'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalEvent { id: number; title: string; description: string; start_at: string; end_at: string; all_day: boolean; }
interface CalTask { id: number; title: string; status: string; due_date: string | null; }
interface GoogleStatus { configured: boolean; connected: boolean; }
interface SyncResult { pulled: number; pushed: number; }

function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function hm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function gridDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function EventModal({ event, defaultDate, onSaved, onDeleted, onClose }: {
  event: CalEvent | null; defaultDate: string;
  onSaved: (saved: CalEvent) => void; onDeleted: (id: number) => void; onClose: () => void;
}) {
  const s = event ? new Date(event.start_at) : null;
  const e = event ? new Date(event.end_at) : null;
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [startDate, setStartDate] = useState(s ? ymd(s) : defaultDate);
  const [startTime, setStartTime] = useState(s && !event?.all_day ? hm(s) : '09:00');
  const [endDate, setEndDate] = useState(
    event?.all_day && e ? ymd(new Date(e.getTime() - 86400000)) : e ? ymd(e) : defaultDate
  );
  const [endTime, setEndTime] = useState(e && !event?.all_day ? hm(e) : '10:00');
  const [saving, setSaving] = useState(false);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!title.trim()) return;
    const body: Record<string, unknown> = { title: title.trim(), description, all_day: allDay };
    if (allDay) {
      body.start_at = `${startDate}T00:00:00`;
      const endExcl = new Date(endDate + 'T00:00:00');
      endExcl.setDate(endExcl.getDate() + 1);
      body.end_at = `${ymd(endExcl)}T00:00:00`;
    } else {
      body.start_at = `${startDate}T${startTime}:00`;
      body.end_at = `${endDate}T${endTime}:00`;
    }
    if ((body.end_at as string) < (body.start_at as string)) { alert('End must be after start.'); return; }
    setSaving(true);
    try {
      const saved = event
        ? await api.put<CalEvent>(`/events/${event.id}`, body)
        : await api.post<CalEvent>('/events', body);
      if (saved) onSaved(saved);
      onClose();
    } catch (err) {
      alert(`Save failed — ${(err as Error).message}`);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    try { await api.delete(`/events/${event.id}`); onDeleted(event.id); onClose(); }
    catch (err) { alert(`Delete failed — ${(err as Error).message}`); }
  };

  return (
    <div className="modal-overlay" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{event ? 'Edit Event' : 'New Event'}</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Title</label>
            <input className="input" value={title} onChange={(e2) => setTitle(e2.target.value)} autoFocus required />
          </div>
          <div className="form-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={allDay} onChange={(e2) => setAllDay(e2.target.checked)} /> All day
            </label>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Start date</label>
              <input className="input" type="date" value={startDate} required
                onChange={(e2) => { setStartDate(e2.target.value); if (endDate < e2.target.value) setEndDate(e2.target.value); }} />
            </div>
            {!allDay && <div className="form-row"><label>Start time</label>
              <input className="input" type="time" value={startTime} onChange={(e2) => setStartTime(e2.target.value)} required /></div>}
            <div className="form-row">
              <label>End date</label>
              <input className="input" type="date" value={endDate} min={startDate} onChange={(e2) => setEndDate(e2.target.value)} required />
            </div>
            {!allDay && <div className="form-row"><label>End time</label>
              <input className="input" type="time" value={endTime} onChange={(e2) => setEndTime(e2.target.value)} required /></div>}
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea className="input" rows={2} value={description} onChange={(e2) => setDescription(e2.target.value)} />
          </div>
          <div className="form-actions">
            {event && <button type="button" className="btn danger" style={{ marginRight: 'auto' }} onClick={remove}>Delete</button>}
            <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [modal, setModal] = useState<{ date: string } | { event: CalEvent } | null>(null);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const days = gridDays(year, month);
  const rangeStart = ymd(days[0]) + 'T00:00:00';
  const rangeEndDate = new Date(days[41]);
  rangeEndDate.setDate(rangeEndDate.getDate() + 1);
  const rangeEnd = ymd(rangeEndDate) + 'T00:00:00';

  const reload = useCallback(async () => {
    try {
      const [evs, ts] = await Promise.all([
        api.get<CalEvent[]>(`/events?start=${rangeStart}&end=${rangeEnd}`),
        api.get<CalTask[]>('/tasks'),
      ]);
      setEvents(evs ?? []);
      setTasks(ts ?? []);
    } catch (err) { console.error(err); }
  }, [rangeStart, rangeEnd]);

  useEffect(() => { reload(); }, [reload]);

  const runSync = useCallback(async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const r = await api.post<SyncResult>('/google/sync', {});
      setSyncMsg(r ? `Synced: ${r.pulled} pulled, ${r.pushed} pushed` : 'Synced');
      await reload();
    } catch { setSyncMsg('Sync failed — see backend logs'); }
    finally { setSyncing(false); }
  }, [reload]);

  useEffect(() => {
    api.get<GoogleStatus>('/google/status').then((st) => {
      if (st) { setGoogle(st); if (st.connected) runSync(); }
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectGoogle = async () => {
    try { const r = await api.get<{ url: string }>('/google/auth-url'); if (r) window.location.href = r.url; }
    catch (err) { alert(`Cannot start Google login — ${(err as Error).message}`); }
  };

  const disconnectGoogle = async () => {
    if (!confirm('Disconnect Google Calendar? Local copies of events are kept.')) return;
    await api.post('/google/disconnect', {});
    setGoogle((g) => g ? { ...g, connected: false } : g);
    setSyncMsg('');
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  const todayStr = ymd(today);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const eventsOn = (dayStr: string) => events.filter((ev) => {
    const start = ev.start_at.slice(0, 10);
    const end = ev.all_day ? ev.end_at.slice(0, 10) : ev.end_at.slice(0, 10) + '~';
    return start <= dayStr && dayStr < end;
  });
  const tasksDue = (dayStr: string) => tasks.filter((t) => t.due_date === dayStr);

  const modalEvent = modal && 'event' in modal ? modal.event : null;
  const modalDate = modal && 'date' in modal ? modal.date : todayStr;

  return (
    <div className="page calendar-page">
      <div className="calendar-header">
        <h1>{monthLabel}</h1>
        <div className="calendar-controls">
          {google?.configured && !google.connected && (
            <button className="btn secondary small" onClick={connectGoogle}>Connect Google</button>
          )}
          {google?.connected && (
            <>
              <span className="sync-msg muted">{syncing ? 'Syncing…' : syncMsg}</span>
              <button className="btn secondary small" onClick={runSync} disabled={syncing}>⟳ Sync</button>
              <button className="btn secondary small" title="Disconnect Google" onClick={disconnectGoogle}>✕</button>
            </>
          )}
          <button className="btn secondary small" onClick={() => shiftMonth(-1)}>‹</button>
          <button className="btn secondary small" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</button>
          <button className="btn secondary small" onClick={() => shiftMonth(1)}>›</button>
          <button className="btn" onClick={() => setModal({ date: todayStr })}>+ Event</button>
        </div>
      </div>
      <div className="calendar-legend" aria-label="事件顏色說明">
        <span className="calendar-legend-label">圖例</span>
        <span className="calendar-legend-item">
          <span className="chip event-chip all-day">全天</span>
          全天事件
        </span>
        <span className="calendar-legend-item">
          <span className="chip event-chip"><span className="chip-time">09:00</span>定時</span>
          有時間的事件
        </span>
        <span className="calendar-legend-item">
          <span className="chip task-chip">✓ 待辦</span>
          到期任務
        </span>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w) => <div key={w} className="calendar-weekday">{w}</div>)}
        {days.map((d) => {
          const dayStr = ymd(d);
          const inMonth = d.getMonth() === month;
          return (
            <div key={dayStr}
              className={`calendar-day ${inMonth ? '' : 'outside'} ${dayStr === todayStr ? 'today' : ''}`}
              onClick={() => setModal({ date: dayStr })}>
              <div className="day-num">{d.getDate()}</div>
              {eventsOn(dayStr).map((ev) => (
                <div key={ev.id} className={`chip event-chip ${ev.all_day ? 'all-day' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setModal({ event: ev }); }} title={ev.title}>
                  {!ev.all_day && <span className="chip-time">{hm(new Date(ev.start_at))}</span>}
                  {ev.title}
                </div>
              ))}
              {tasksDue(dayStr).map((t) => (
                <div key={`t${t.id}`} className={`chip task-chip ${t.status === 'done' ? 'done' : ''}`} title={`Task: ${t.title}`}>
                  ✓ {t.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {modal && (
        <EventModal
          event={modalEvent}
          defaultDate={modalDate}
          onSaved={(saved) => setEvents((prev) => [...prev.filter((ev) => ev.id !== saved.id), saved])}
          onDeleted={(id) => setEvents((prev) => prev.filter((ev) => ev.id !== id))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
