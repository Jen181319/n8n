import type { Timestamp } from 'firebase/firestore';

export interface Requirements { budget?: string; area?: string; type?: string; beds?: string; intent?: string; timeline?: string; objections?: string }
export interface Contact {
  id: string; jid: string; phone?: string; name?: string; isLead?: boolean | 'auto'; ignored?: boolean; optOut?: boolean;
  categoryId?: string; status?: string; summary?: string; requirements?: Requirements; requirementsLocked?: Requirements;
  nextAction?: string; notes?: string; property?: string; lastMessageAt?: Timestamp; lastInboundAt?: Timestamp; needsReply?: boolean;
}
export interface Category { id: string; name: string; color: string; order: number }
export interface Reminder { id: string; contactJid: string; dueAt: Timestamp; kind: 'notify' | 'autosend'; message?: string; status: 'pending' | 'done' | 'sent' | 'failed'; error?: string }
export interface Template { id: string; name: string; body: string }
export interface Message { id: string; fromMe: boolean; text: string; type: string; ts: Timestamp }
export interface WaSession { status?: 'disconnected' | 'qr' | 'connecting' | 'connected'; qr?: string; phone?: string; importProgress?: number | null; lastSyncAt?: Timestamp }
export interface UserDoc { timezone: string; digestTime: string; digestEnabled: boolean }

export const DEFAULT_CATEGORIES = [
  { name: 'Hot', color: '#e11d48' }, { name: 'Warm', color: '#f59e0b' }, { name: 'Cold', color: '#3b82f6' },
  { name: 'Viewing booked', color: '#8b5cf6' }, { name: 'Closed', color: '#16a34a' },
];

export const displayName = (c: Pick<Contact, 'name' | 'phone' | 'jid'>) => c.name || (c.phone ? `+${c.phone}` : c.jid);
export const fmt = (t?: Timestamp) => (t ? t.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
