'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState('');
  useEffect(() => { if (ready && user) router.replace('/dashboard/'); }, [ready, user, router]);
  return (
    <div className="hero">
      <h1>Sign in</h1>
      <button className="primary" onClick={() => login().catch((e) => setErr(e.message))}>Continue with Google</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
