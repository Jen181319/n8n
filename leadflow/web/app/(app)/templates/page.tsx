'use client';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCollection } from '@/lib/hooks';
import type { Template } from '@/lib/types';

export default function Templates() {
  const { user } = useAuth();
  const { data } = useCollection<Template>('templates');
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const path = `users/${user!.uid}/templates`;
  return (
    <>
      <h1>Message templates</h1>
      <p className="muted">Use <code>{'{name}'}</code> for the client&apos;s name. Automated messages are only sent to people who messaged you first, with delays between sends.</p>
      <div className="card">
        {data.map((t) => <div key={t.id} className="row spread" style={{ marginBottom: 8 }}><span><b>{t.name}</b><div className="muted">{t.body}</div></span><button className="danger" onClick={() => deleteDoc(doc(db, path, t.id))}>Delete</button></div>)}
        <input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea placeholder="Hi {name}, just checking in on the property you viewed…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="primary" disabled={!name.trim() || !body.trim()} onClick={async () => { await addDoc(collection(db, path), { name: name.trim(), body: body.trim() }); setName(''); setBody(''); }}>Save template</button>
      </div>
    </>
  );
}
