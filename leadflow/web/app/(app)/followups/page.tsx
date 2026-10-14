'use client';
import Link from 'next/link';
import { doc, orderBy, setDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCollection } from '@/lib/hooks';
import { displayName, fmt, type Contact, type Reminder } from '@/lib/types';

export default function Followups() {
  const { user } = useAuth();
  const { data: reminders, loading } = useCollection<Reminder>('reminders', orderBy('dueAt', 'desc'), limit(300));
  const { data: contacts } = useCollection<Contact>('contacts', limit(1000));
  const byJid = new Map(contacts.map((c) => [c.jid, c]));
  const pending = reminders.filter((r) => r.status === 'pending').reverse();
  const past = reminders.filter((r) => r.status !== 'pending');
  const now = Date.now();

  const Row = ({ r }: { r: Reminder }) => {
    const c = byJid.get(r.contactJid);
    return (
      <tr>
        <td style={{ color: r.status === 'pending' && r.dueAt.toMillis() < now ? 'var(--danger)' : undefined }}>{fmt(r.dueAt)}</td>
        <td>{c ? <Link href={`/lead/?id=${encodeURIComponent(c.jid)}`}>{displayName(c)}</Link> : r.contactJid}<div className="muted">{r.message}</div></td>
        <td>{r.kind === 'autosend' ? 'auto-send' : 'remind'} · {r.status}</td>
        <td>{r.status === 'pending' && <button onClick={() => setDoc(doc(db, `users/${user!.uid}/reminders/${r.id}`), { status: 'done' }, { merge: true })}>Done</button>}</td>
      </tr>
    );
  };
  return (
    <>
      <h1>Follow-ups</h1>
      <div className="card"><h2>Upcoming &amp; overdue</h2>{loading ? <p className="muted">Loading…</p> : pending.length === 0 ? <p className="muted">No pending reminders. Add them from a lead&apos;s page.</p> : <table><tbody>{pending.map((r) => <Row key={r.id} r={r} />)}</tbody></table>}</div>
      <div className="card"><h2>History</h2><table><tbody>{past.map((r) => <Row key={r.id} r={r} />)}</tbody></table></div>
    </>
  );
}
