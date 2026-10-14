import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = { title: 'LeadFlow', description: 'Never miss a property lead on WhatsApp', manifest: '/manifest.json' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
