// Run with the Firestore emulator:  firebase emulators:exec --only firestore "npm test"
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';

process.env.OPENROUTER_API_KEY = 'test';
process.env.OPENROUTER_CHEAP_MODEL = 'cheap';
process.env.OPENROUTER_SUMMARY_MODEL = 'smart';

const calls: any[] = [];
// Mock OpenRouter
globalThis.fetch = (async (_url: any, init: any) => {
  const body = JSON.parse(init.body);
  calls.push(body);
  const payload = body.model === 'cheap'
    ? { isLead: !/mum|dinner/i.test(body.messages[1].content), reason: 'x' }
    : { summary: 'Wants 3BR condo in Mont Kiara, budget RM900k', requirements: { budget: 'RM900k', area: 'Mont Kiara', beds: '3', intent: 'buy' },
        nextAction: 'Send listings', suggestedCategory: 'Hot', followUpAt: new Date(Date.now() + 86400000).toISOString() };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }), { status: 200 });
}) as any;

const { db } = await import('../src/firebase.js');
const { summarize } = await import('../src/summarize.js');
const { runDueReminders } = await import('../src/scheduler.js');

const uid = 'u1';
const user = db.doc(`users/${uid}`);
await user.set({ timezone: 'Asia/Kuala_Lumpur' });
const hot = await user.collection('categories').add({ name: 'Hot', color: '#f00', order: 0 });

async function seed(jid: string, texts: [boolean, string][]) {
  const c = user.collection('contacts').doc(jid);
  await c.set({ jid, phone: jid.split('@')[0], lastInboundAt: Timestamp.now(), needsReply: true });
  let t = Date.now() - 100000;
  for (const [i, [fromMe, text]] of texts.entries()) await c.collection('messages').doc(`m${i}`).set({ fromMe, text, type: 'text', ts: Timestamp.fromMillis((t += 1000)) });
  return c;
}

// 1. lead gets classified + summarised + categorised + AI reminder created
const lead = await seed('601@s.whatsapp.net', [[false, 'Hi looking for 3 bedroom in Mont Kiara'], [true, 'Sure what budget?'], [false, '900k']]);
await summarize(uid, '601@s.whatsapp.net');
let d = (await lead.get()).data()!;
assert.equal(d.isLead, true);
assert.match(d.summary, /Mont Kiara/);
assert.equal(d.categoryId, hot.id);
assert.equal(d.requirements.budget, 'RM900k');
const rems = await user.collection('reminders').get();
assert.equal(rems.size, 1);
assert.equal(rems.docs[0].data().status, 'pending');
console.log('ok 1 lead summarised');

// 2. non-lead is classified and NOT summarised
const mum = await seed('602@s.whatsapp.net', [[false, 'Mum: dinner at 7?']]);
await summarize(uid, '602@s.whatsapp.net');
d = (await mum.get()).data()!;
assert.equal(d.isLead, false);
assert.equal(d.summary, undefined);
assert.equal(calls.filter((c) => c.model === 'smart').length, 1);
console.log('ok 2 personal chat skipped');

// 3. user-edited requirement wins over the AI
await lead.update({ 'requirementsLocked.budget': 'RM1.2m' });
await summarize(uid, '601@s.whatsapp.net', true);
d = (await lead.get()).data()!;
assert.equal(d.requirements.budget, 'RM1.2m');
assert.equal(d.requirements.area, 'Mont Kiara');
console.log('ok 3 manual edits preserved');

// 4. auto-send is refused for a contact who never messaged / opted out
const quiet = user.collection('contacts').doc('603@s.whatsapp.net');
await quiet.set({ jid: '603@s.whatsapp.net' });
const r = await user.collection('reminders').add({ contactJid: '603@s.whatsapp.net', dueAt: Timestamp.fromMillis(Date.now() - 1000), kind: 'autosend', message: 'hi {name}', status: 'pending' });
await runDueReminders();
assert.equal((await r.get()).data()!.status, 'failed');
console.log('ok 4 autosend guard');
process.exit(0);
