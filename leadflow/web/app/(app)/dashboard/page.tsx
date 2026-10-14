'use client';
import Link from 'next/link';
import { limit, orderBy, where } from 'firebase/firestore';
import { useCollection } from '@/lib/hooks';
import { displayName, fmt, type Category, type Contact, type Reminder, type WaSession } from '@/lib/types';
import { useDocument } from '@/lib/hooks';
import CategoryPill from '@/components/CategoryPill';

export default function Dashboard() {
  const { data: contacts, loading, error } = useCollection<Contact>('contacts', orderBy('lastMessageAt', 'desc'), limit(1000));
  const { data: cats } = useCollection<Category>('categories', orderBy('order'));
  const { data: reminders } = useCollection<Reminder>('reminders', where('status', '==', 'pending'), orderBy('dueAt'));
  const { data: wa } = useDocument<WaSession>('wa/session');

  const leads = contacts.filter((c) => c.isLead === true && !c.ignored);
  const byJid = new Map(contacts.map((c) => [c.jid, c]));
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const due = reminders.filter((r) => r.dueAt.toDate() <= endOfToday);
  const waiting = leads.filter((c) => c.needsReply).sort((a, b) => (a.lastInboundAt?.toMillis() ?? 0) - (b.lastInboundAt?.toMillis() ?? 0));
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const newToday = leads.filter((c) => (c.lastInboundAt?.toDate() ?? 0) >= startToday && !c.summary).length;

  return (
    <>
      <h1>Dashboard</h1>
      {error && <p className="err">{error}</p>}
      {wa?.status !== 'connected' && <div className="card">WhatsApp is not connected. <Link href="/connect/">Connect now</Link></div>}
      {wa?.status === 'connected' && wa.importProgress != null && wa.importProgress < 100 && <div className="card muted">Importing history… {wa.importProgress}%</div>}
      <div className="grid">
        <div className="card stat"><b>{due.length}</b>follow-ups due today</div>
        <div className="card stat"><b>{waiting.length}</b>waiting for your reply</div>
        <div className="card stat"><b>{leads.length}</b>total leads</div>
        <div className="card stat"><b>{newToday}</b>new today</div>
      </div>
      <div className="cols">
        <div className="card">
          <h2>Follow-ups due</h2>
          {loading ? <p className="muted">Loading…</p> : due.length === 0 ? <p className="muted">Nothing due. 🎉</p> : (
            <table><tbody>{due.map((r) => { const c = byJid.get(r.contactJid); return (
              <tr key={r.id}><td>{c ? <Link href={`/lead/?id=${encodeURIComponent(c.jid)}`}>{displayName(c)}</Link> : r.contactJid}<div className="muted">{r.message}</div></td><td>{fmt(r.dueAt)}</td></tr>); })}</tbody></table>
          )}
        </div>
        <div className="card">
          <h2>Waiting for your reply</h2>
          {waiting.length === 0 ? <p className="muted">You&apos;re all caught up.</p> : (
            <table><tbody>{waiting.slice(0, 15).map((c) => (
              <tr key={c.id}><td><Link href={`/lead/?id=${encodeURIComponent(c.jid)}`}>{displayName(c)}</Link><div className="muted">{c.summary?.slice(0, 90)}</div></td><td>{fmt(c.lastInboundAt)}</td></tr>))}</tbody></table>
          )}
        </div>
      </div>
      <div className="card">
        <h2>Leads by category</h2>
        <div className="row">{cats.map((cat) => <span key={cat.id}><CategoryPill cat={cat} /> {leads.filter((c) => c.categoryId === cat.id).length}</span>)}
          <span className="muted">Uncategorised {leads.filter((c) => !c.categoryId).length}</span></div>
      </div>
    </>
  );
}
