'use client';
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const LINKS = [
  ['/dashboard/', 'Dashboard'], ['/leads/', 'Leads'], ['/followups/', 'Follow-ups'], ['/categories/', 'Categories'],
  ['/templates/', 'Templates'], ['/connect/', 'WhatsApp'], ['/settings/', 'Settings'],
];

export default function Shell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => { if (ready && !user) router.replace('/login/'); }, [ready, user, router]);
  if (!ready || !user) return <div className="main muted">Loading…</div>;
  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">LeadFlow</div>
        {LINKS.map(([href, label]) => <Link key={href} href={href} className={path.startsWith(href.slice(0, -1)) ? 'on' : ''}>{label}</Link>)}
        <button onClick={() => logout()} style={{ marginTop: 'auto' }}>Sign out</button>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
