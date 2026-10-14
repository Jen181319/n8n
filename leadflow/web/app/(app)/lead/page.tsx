'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { addDoc, collection, deleteDoc, doc, limitToLast, orderBy, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { callWorker, useAuth } from '@/lib/auth';
import { useCollection, useDocument } from '@/lib/hooks';
import { displayName, fmt, type Category, type Contact, type Message, type Reminder, type Requirements, type Template } from '@/lib/types';

const FIELDS: [keyof Requirements, string][] = [['intent', 'Buy / rent'], ['budget', 'Budget'], ['area', 'Area'], ['type', 'Property type'], ['beds', 'Bedrooms'], ['timeline', 'Timeline'], ['objections', 'Concerns']];

function LeadInner() {
  const { user } = useAuth();
  const jid = useSearchParams().get('id') ?? '';
  const base = `contacts/${jid}`;
  const { data: c, loading } = useDocument<Contact>(base);
  const { data: msgs } = useCollection<Message>(`${base}/messages`, orderBy('ts'), limitToLast(200));
  const { data: cats } = useCollection<Category>('categories', orderBy('order'));
  const { data: templates } = useCollection<Template>('templates');
  const { data: reminders } = useCollection<Reminder>('reminders');
  const [due, setDue] = useState('');
  const [kind, setKind] = useState<'notify' | 'autosend'>('notify');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!user || !jid) return <p className="muted">No lead selected.</p>;
  if (loading) return <p className="muted">Loading…</p>;
  if (!c) return <p className="muted">Lead not found.</p>;
  const ref = doc(db, `users/${user.uid}/${base}`);
  const mine = reminders.filter((r) => r.contactJid === jid).sort((a, b) => a.dueAt.toMillis() - b.dueAt.toMillis());
  const save = (patch: Record<string, unknown>) => updateDoc(ref, patch).catch((e) => setErr(e.message));
  // Editing a field also "locks" it so the AI doesn't overwrite the agent's correction
  const setReq = (k: keyof Requirements, v: string) => save({ [`requirements.${k}`]: v, [`requirementsLocked.${k}`]: v });

  async function addReminder() {
    if (!due) return setErr('Pick a date and time');
    if (kind === 'autosend' && !text.trim()) return setErr('Write the message to send');
    setErr('');
    await addDoc(collection(db, `users/${user!.uid}/reminders`), {
      contactJid: jid, dueAt: Timestamp.fromDate(new Date(due)), kind, message: text.trim(), status: 'pending', source: 'user', createdAt: Timestamp.now(),
    });
    setDue(''); setText('');
  }

  return (
    <>
      <div className="row spread"><h1>{displayName(c)}</h1><span className="muted">{c.phone && `+${c.phone}`}</span></div>
      {err && <p className="err">{err}</p>}
      <div className="cols">
        <div>
          <div className="card">
            <div className="row spread"><h2>AI summary</h2>
              <button disabled={busy} onClick={async () => { setBusy(true); setErr(''); try { await callWorker('/contacts/summarize', { jid }); } catch (e) { setErr(String(e)); } setBusy(false); }}>{busy ? 'Working…' : 'Regenerate'}</button></div>
            <p>{c.summary ?? <span className="muted">No summary yet.</span>}</p>
            {c.nextAction && <p><b>Next:</b> {c.nextAction}</p>}
          </div>
          <div className="card">
            <h2>Profile</h2>
            <div className="row" style={{ marginBottom: 8 }}>
              <select value={c.categoryId ?? ''} onChange={(e) => save({ categoryId: e.target.value })}>
                <option value="">No category</option>{cats.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <select value={String(c.isLead)} onChange={(e) => save({ isLead: e.target.value === 'true' })}>
                <option value="true">Lead</option><option value="false">Not a lead</option>
              </select>
              <input placeholder="Property / listing" defaultValue={c.property ?? ''} onBlur={(e) => save({ property: e.target.value })} />
            </div>
            <table><tbody>{FIELDS.map(([k, label]) => (
              <tr key={k}><th>{label}</th><td><input key={`${k}-${c.requirements?.[k] ?? ''}`} style={{ width: '100%' }} defaultValue={c.requirements?.[k] ?? ''} onBlur={(e) => e.target.value !== (c.requirements?.[k] ?? '') && setReq(k, e.target.value)} /></td></tr>))}</tbody></table>
            <h2 style={{ marginTop: 12 }}>Notes</h2>
            <textarea defaultValue={c.notes ?? ''} onBlur={(e) => save({ notes: e.target.value })} />
            <div className="row" style={{ marginTop: 8 }}>
              <label><input type="checkbox" checked={!!c.optOut} onChange={(e) => save({ optOut: e.target.checked })} /> Don&apos;t auto-message</label>
              <button className="danger" onClick={() => save({ ignored: true })}>Ignore this contact</button>
            </div>
          </div>
          <div className="card">
            <h2>Reminders</h2>
            {mine.map((r) => (
              <div key={r.id} className="row spread" style={{ borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
                <span>{fmt(r.dueAt)} · {r.kind === 'autosend' ? 'auto-send' : 'remind me'} · <i>{r.status}</i>{r.error && <span className="err"> {r.error}</span>}<div className="muted">{r.message}</div></span>
                <span className="row">
                  {r.status === 'pending' && <button onClick={() => setDoc(doc(db, `users/${user.uid}/reminders/${r.id}`), { status: 'done' }, { merge: true })}>Done</button>}
                  <button className="danger" onClick={() => deleteDoc(doc(db, `users/${user.uid}/reminders/${r.id}`))}>Delete</button>
                </span>
              </div>))}
            <div className="row" style={{ marginTop: 10 }}>
              <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
              <select value={kind} onChange={(e) => setKind(e.target.value as 'notify' | 'autosend')}><option value="notify">Remind me</option><option value="autosend">Auto-send message</option></select>
              {templates.length > 0 && <select value="" onChange={(e) => setText(e.target.value)}><option value="">Use template…</option>{templates.map((t) => <option key={t.id} value={t.body}>{t.name}</option>)}</select>}
            </div>
            <textarea placeholder={kind === 'autosend' ? 'Message to send ({name} is replaced)' : 'Note for yourself (optional)'} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="primary" onClick={addReminder}>Add reminder</button>
          </div>
        </div>
        <div className="card">
          <h2>Conversation</h2>
          <div className="chat">{msgs.length === 0 ? <span className="muted">No messages.</span> : msgs.map((m) => (
            <div key={m.id} className={`bub ${m.fromMe ? 'me' : ''}`}>{m.text}<small>{fmt(m.ts)}</small></div>))}</div>
        </div>
      </div>
    </>
  );
}

export default function LeadPage() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><LeadInner /></Suspense>;
}
