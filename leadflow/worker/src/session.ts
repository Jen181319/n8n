import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser } from '@whiskeysockets/baileys';
import type { WASocket, proto } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase.js';
import { useFirestoreAuthState } from './authState.js';
import { queueSummary } from './summarize.js';

const log = pino({ level: 'info' });
const sockets = new Map<string, WASocket>();

const sessionDoc = (uid: string) => db.doc(`users/${uid}/wa/session`);

function textOf(m: proto.IWebMessageInfo): { text: string; type: string } | null {
  const c = m.message;
  if (!c) return null;
  const text = c.conversation ?? c.extendedTextMessage?.text ?? c.imageMessage?.caption ?? c.videoMessage?.caption ?? '';
  const type = c.audioMessage ? 'audio' : c.imageMessage ? 'image' : c.documentMessage ? 'document' : 'text';
  if (!text && type === 'text') return null;
  return { text: text || `[${type}]`, type };
}

async function storeMessage(uid: string, m: proto.IWebMessageInfo, historical: boolean) {
  const jid = m.key.remoteJid;
  if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@broadcast')) return; // skip groups for MVP
  const t = textOf(m);
  if (!t) return;
  const fromMe = !!m.key.fromMe;
  const ts = Timestamp.fromMillis(Number(m.messageTimestamp ?? 0) * 1000 || Date.now());
  const cRef = db.doc(`users/${uid}/contacts/${jid}`);
  await cRef.collection('messages').doc(m.key.id!).set({ fromMe, text: t.text, type: t.type, ts }, { merge: true });
  await cRef.set({
    jid, phone: jid.split('@')[0], ...(!fromMe && m.pushName ? { name: m.pushName } : {}),
    lastMessageAt: ts, [fromMe ? 'lastOutboundAt' : 'lastInboundAt']: ts,
    needsReply: !fromMe, pendingSummary: true,
  }, { merge: true });
  if (!historical) queueSummary(uid, jid);
}

export async function startSession(uid: string) {
  if (sockets.has(uid)) return;
  const { state, saveCreds, clear } = await useFirestoreAuthState(uid);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'warn' }), syncFullHistory: true, markOnlineOnConnect: false });
  sockets.set(uid, sock);

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) await sessionDoc(uid).set({ status: 'qr', qr, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (connection === 'open') {
      await sessionDoc(uid).set({ status: 'connected', qr: FieldValue.delete(), phone: jidNormalizedUser(sock.user!.id), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    if (connection === 'close') {
      sockets.delete(uid);
      const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        await clear();
        await sessionDoc(uid).set({ status: 'disconnected', qr: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        // TODO: email/push "WhatsApp disconnected, please re-scan"
      } else {
        await sessionDoc(uid).set({ status: 'connecting' }, { merge: true });
        setTimeout(() => startSession(uid).catch((e) => log.error(e)), 3000);
      }
    }
  });

  // History import (only what WhatsApp sends on first link)
  sock.ev.on('messaging-history.set', async ({ messages, progress }) => {
    for (const m of messages) await storeMessage(uid, m, true).catch((e) => log.error(e));
    await sessionDoc(uid).set({ importProgress: progress ?? null, lastSyncAt: FieldValue.serverTimestamp() }, { merge: true });
    if (progress === undefined || progress === null || progress >= 100) {
      // first-time import finished: classify + summarise the most recent chats (bounded to control LLM cost)
      const recent = await db.collection(`users/${uid}/contacts`).orderBy('lastMessageAt', 'desc').limit(150).get();
      for (const d of recent.docs) if (d.data().lastInboundAt && !d.data().summaryUpdatedAt) queueSummary(uid, d.id, 1000);
    }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) await storeMessage(uid, m, false).catch((e) => log.error(e));
  });
}

export async function stopSession(uid: string) {
  const s = sockets.get(uid);
  if (s) { await s.logout().catch(() => {}); sockets.delete(uid); }
  await sessionDoc(uid).set({ status: 'disconnected', qr: FieldValue.delete() }, { merge: true });
}

const lastSent = new Map<string, number>();
// Safe-ish sending: per-user spacing + jitter. Only to contacts who messaged first.
export async function sendText(uid: string, jid: string, text: string) {
  const s = sockets.get(uid);
  if (!s) throw new Error('not connected');
  const wait = Math.max(0, (lastSent.get(uid) ?? 0) + 8000 + Math.random() * 7000 - Date.now());
  await new Promise((r) => setTimeout(r, wait));
  await s.sendMessage(jid, { text });
  lastSent.set(uid, Date.now());
}

export const isConnected = (uid: string) => sockets.has(uid);

export async function resumeAll() {
  const snap = await db.collectionGroup('wa').where('status', 'in', ['connected', 'connecting']).get();
  for (const d of snap.docs) startSession(d.ref.parent.parent!.id).catch((e) => log.error(e));
}
