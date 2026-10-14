'use client';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useCollection } from '@/lib/hooks';
import type { Category } from '@/lib/types';

export default function Categories() {
  const { user } = useAuth();
  const { data: cats } = useCollection<Category>('categories', orderBy('order'));
  const [name, setName] = useState('');
  const [color, setColor] = useState('#128c7e');
  const path = `users/${user!.uid}/categories`;
  return (
    <>
      <h1>Categories</h1>
      <p className="muted">The AI suggests one of these names for new leads; you can always change it on the lead.</p>
      <div className="card">
        {cats.map((c, i) => (
          <div className="row" key={c.id} style={{ marginBottom: 8 }}>
            <input type="color" value={c.color} onChange={(e) => updateDoc(doc(db, path, c.id), { color: e.target.value })} />
            <input defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && updateDoc(doc(db, path, c.id), { name: e.target.value.trim() })} />
            <button disabled={i === 0} onClick={() => { updateDoc(doc(db, path, c.id), { order: cats[i - 1].order }); updateDoc(doc(db, path, cats[i - 1].id), { order: c.order }); }}>↑</button>
            <button className="danger" onClick={() => confirm(`Delete "${c.name}"? Leads keep working but lose this label.`) && deleteDoc(doc(db, path, c.id))}>Delete</button>
          </div>))}
        <div className="row">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="primary" disabled={!name.trim()} onClick={async () => { await addDoc(collection(db, path), { name: name.trim(), color, order: (cats.at(-1)?.order ?? -1) + 1 }); setName(''); }}>Add</button>
        </div>
      </div>
    </>
  );
}
