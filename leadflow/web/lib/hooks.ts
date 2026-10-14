'use client';
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, type QueryConstraint } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';

export function useCollection<T>(path: string, ...constraints: QueryConstraint[]) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const key = constraints.map((c) => JSON.stringify(c)).join('|');
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, `users/${user.uid}/${path}`), ...constraints),
      (s) => { setData(s.docs.map((d) => ({ id: d.id, ...d.data() }) as T)); setLoading(false); },
      (e) => { setError(e.message); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, path, key]);
  return { data, loading, error };
}

export function useDocument<T>(path: string) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, path ? `users/${user.uid}/${path}` : `users/${user.uid}`), (s) => { setData(s.exists() ? ({ id: s.id, ...s.data() } as T) : null); setLoading(false); }, () => setLoading(false));
  }, [user, path]);
  return { data, loading };
}
