// usage: tsx test/seed.ts <uid>   (against the Firestore emulator) — fixture for manual / browser tests
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../src/firebase.js';
const uid = process.argv[2];
const u = db.doc(`users/${uid}`);
const cats = await u.collection('categories').get();
const hot = cats.docs.find((d) => d.data().name === 'Hot')!;
const mk = async (jid: string, name: string, extra: object, msgs: [boolean, string][]) => {
  const c = u.collection('contacts').doc(jid);
  await c.set({ jid, phone: jid.split('@')[0], name, ...extra });
  let t = Date.now() - 60000;
  for (const [i, [fromMe, text]] of msgs.entries()) await c.collection('messages').doc('m' + i).set({ fromMe, text, type: 'text', ts: Timestamp.fromMillis((t += 1000)) });
};
const now = Timestamp.now();
await mk('60111@s.whatsapp.net', 'Alice Tan', { isLead: true, categoryId: hot.id, summary: 'Wants a 3BR condo in Mont Kiara, budget RM900k.', requirements: { budget: 'RM900k' }, nextAction: 'Send listings', needsReply: true, lastMessageAt: now, lastInboundAt: now }, [[false, 'Hi looking for 3BR'], [true, 'Budget?'], [false, '900k']]);
await mk('60122@s.whatsapp.net', 'Mum', { isLead: false, lastMessageAt: now }, [[false, 'Dinner?']]);
await u.collection('reminders').add({ contactJid: '60111@s.whatsapp.net', dueAt: Timestamp.fromMillis(Date.now() - 3600000), kind: 'notify', message: 'Call Alice', status: 'pending' });
await u.collection('wa').doc('session').set({ status: 'qr', qr: '2@fakeqrpayload' });
console.log('seeded');
process.exit(0);
