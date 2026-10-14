'use client';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useDocument } from '@/lib/hooks';
import type { UserDoc } from '@/lib/types';

export default function Settings() {
  const { user } = useAuth();
  const { data: u } = useDocument<UserDoc>('');
  const ref = doc(db, `users/${user!.uid}`);
  const save = (p: Partial<UserDoc>) => updateDoc(ref, p);
  return (
    <>
      <h1>Settings</h1>
      <div className="card">
        <h2>Daily WhatsApp digest</h2>
        {!u ? <p className="muted">Loading…</p> : (
          <div className="row">
            <label><input type="checkbox" checked={u.digestEnabled} onChange={(e) => save({ digestEnabled: e.target.checked })} /> Send me a daily summary of who to follow up</label>
            <input type="time" value={u.digestTime} onChange={(e) => e.target.value && save({ digestTime: e.target.value })} />
            <input value={u.timezone} onChange={(e) => save({ timezone: e.target.value })} placeholder="Timezone e.g. Asia/Kuala_Lumpur" />
          </div>)}
        <p className="muted">The digest is sent to your own WhatsApp chat (&quot;Message yourself&quot;).</p>
      </div>
      <div className="card"><h2>Account</h2><p>{user!.email}</p></div>
    </>
  );
}
