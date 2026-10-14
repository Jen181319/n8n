'use client';
import { useState } from 'react';
import Link from 'next/link';
import { limit, orderBy } from 'firebase/firestore';
import { useCollection } from '@/lib/hooks';
import { displayName, fmt, type Category, type Contact } from '@/lib/types';
import CategoryPill from '@/components/CategoryPill';

export default function Leads() {
  const { data: contacts, loading, error } = useCollection<Contact>('contacts', orderBy('lastMessageAt', 'desc'), limit(1000));
  const { data: cats } = useCollection<Category>('categories', orderBy('order'));
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [onlyLeads, setOnlyLeads] = useState(true);
  const [needsReply, setNeedsReply] = useState(false);
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const rows = contacts.filter((c) =>
    !c.ignored && (!onlyLeads || c.isLead === true) && (!needsReply || c.needsReply) &&
    (!cat || (cat === 'none' ? !c.categoryId : c.categoryId === cat)) &&
    (!q || `${c.name ?? ''} ${c.phone ?? ''} ${c.summary ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <h1>Leads</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <input placeholder="Search name, phone, summary" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option><option value="none">Uncategorised</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label><input type="checkbox" checked={onlyLeads} onChange={(e) => setOnlyLeads(e.target.checked)} /> Leads only</label>
        <label><input type="checkbox" checked={needsReply} onChange={(e) => setNeedsReply(e.target.checked)} /> Needs reply</label>
      </div>
      {error && <p className="err">{error}</p>}
      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No contacts match. New chats appear here after WhatsApp is connected.</p> : (
          <table>
            <thead><tr><th>Client</th><th>Category</th><th>Summary</th><th>Last message</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/lead/?id=${encodeURIComponent(c.jid)}`}>{displayName(c)}</Link>{c.needsReply && <span className="pill" style={{ background: '#e11d48', marginLeft: 6 }}>reply</span>}</td>
                <td><CategoryPill cat={c.categoryId ? catMap.get(c.categoryId) : undefined} /></td>
                <td className="muted">{c.summary?.slice(0, 110) ?? (c.isLead === true ? 'Summarising…' : '')}</td>
                <td>{fmt(c.lastMessageAt)}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
