'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_CATEGORIES } from './types';

interface Ctx { user: User | null; ready: boolean; login: () => Promise<void>; logout: () => Promise<void> }
const AuthCtx = createContext<Ctx>({ user: null, ready: false, login: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthCtx);

// First login: create the profile with sensible defaults and the starter categories.
async function ensureProfile(user: User) {
  const ref = doc(db, `users/${user.uid}`);
  if ((await getDoc(ref)).exists()) return;
  const batch = writeBatch(db);
  batch.set(ref, {
    email: user.email, name: user.displayName,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, digestTime: '08:00', digestEnabled: true, plan: 'trial',
  });
  DEFAULT_CATEGORIES.forEach((c, i) => batch.set(doc(collection(db, `users/${user.uid}/categories`)), { ...c, order: i }));
  await batch.commit();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (u) await ensureProfile(u).catch(console.error);
    setUser(u); setReady(true);
  }), []);
  return (
    <AuthCtx.Provider value={{
      user, ready,
      login: async () => { await signInWithPopup(auth, new GoogleAuthProvider()); },
      logout: () => signOut(auth),
    }}>{children}</AuthCtx.Provider>
  );
}

export async function callWorker(path: string, body?: unknown) {
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(`Worker error ${r.status}`);
  return r.json();
}
