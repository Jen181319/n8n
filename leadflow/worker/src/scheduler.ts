import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase.js';
import { isConnected, sendText } from './session.js';

const ONE_MIN = 60_000;

// Due reminders: 'autosend' sends the template; 'notify' is collected into the daily digest + shown in the app.
async function runDueReminders() {
  const snap = await db.collectionGroup('reminders').where('status', '==', 'pending').where('dueAt', '<=', Timestamp.now()).limit(50).get();
  for (const d of snap.docs) {
    const r = d.data();
    const uid = d.ref.parent.parent!.id;
    if (r.kind !== 'autosend') continue;
    try {
      const contact = (await db.doc(`users/${uid}/contacts/${r.contactJid}`).get()).data();
      // safeguard: only to people who have messaged the agent first, never to ignored/opted-out contacts
      if (!contact?.lastInboundAt || contact.ignored || contact.optOut) { await d.ref.update({ status: 'failed', error: 'not allowed' }); continue; }
      if (!isConnected(uid)) continue; // retry next tick
      const text = String(r.message).replaceAll('{name}', contact.name ?? '');
      await sendText(uid, r.contactJid, text);
      await d.ref.update({ status: 'sent', sentAt: Timestamp.now() });
    } catch (e) { await d.ref.update({ status: 'failed', error: String(e) }); }
  }
}

// Daily digest: sent to the agent's own WhatsApp ("message yourself") at users/{uid}.digestTime in their timezone.
async function runDigests() {
  const users = await db.collection('users').get();
  for (const u of users.docs) {
    const { timezone = 'Asia/Kuala_Lumpur', digestTime = '08:00', digestEnabled = true, lastDigestDate } = u.data();
    if (!digestEnabled) continue;
    const now = new Date();
    const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(now);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
    if (hhmm < digestTime || lastDigestDate === today || !isConnected(u.id)) continue;

    const end = Timestamp.fromMillis(now.getTime());
    const due = await u.ref.collection('reminders').where('status', '==', 'pending').where('dueAt', '<=', end).get();
    const stale = await u.ref.collection('contacts').where('needsReply', '==', true).orderBy('lastInboundAt').limit(10).get();
    if (due.empty && stale.empty) continue;

    const lines = ['*Today\'s follow-ups*'];
    for (const r of due.docs) {
      const c = (await u.ref.collection('contacts').doc(r.data().contactJid).get()).data();
      lines.push(`• ${c?.name ?? c?.phone} — ${r.data().message ?? c?.nextAction ?? 'follow up'}`);
    }
    if (!stale.empty) lines.push('', '*Waiting for your reply*');
    for (const s of stale.docs) lines.push(`• ${s.data().name ?? s.data().phone}${s.data().summary ? ' — ' + String(s.data().summary).slice(0, 80) : ''}`);
    const me = (await u.ref.collection('wa').doc('session').get()).data()?.phone;
    if (me) { await sendText(u.id, me, lines.join('\n')); await u.ref.update({ lastDigestDate: today }); }
  }
}

export function startScheduler() {
  setInterval(() => runDueReminders().catch(console.error), ONE_MIN);
  setInterval(() => runDigests().catch(console.error), 5 * ONE_MIN);
}
