import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firebase.js';
import { classifyContact, updateProfile } from './ai.js';

const queue = new Map<string, NodeJS.Timeout>();

// Debounce: wait 60s after the last message of a chat so bursts become one LLM call.
export function queueSummary(uid: string, jid: string) {
  const k = `${uid}/${jid}`;
  clearTimeout(queue.get(k));
  queue.set(k, setTimeout(() => { queue.delete(k); summarize(uid, jid).catch(console.error); }, 60_000));
}

export async function summarize(uid: string, jid: string) {
  const ref = db.doc(`users/${uid}/contacts/${jid}`);
  const c = (await ref.get()).data();
  if (!c || c.ignored) return;

  const since = c.summaryUpdatedAt ?? Timestamp.fromMillis(0);
  const msgs = (await ref.collection('messages').where('ts', '>', since).orderBy('ts').limit(80).get()).docs.map((d) => d.data());
  if (!msgs.length) return;
  const transcript = msgs.map((m) => `${m.fromMe ? 'AGENT' : 'CLIENT'}: ${m.text}`).join('\n');

  if (c.isLead === undefined || c.isLead === 'auto') {
    const { isLead } = await classifyContact(transcript);
    await ref.set({ isLead }, { merge: true });
    if (!isLead) { await ref.set({ summaryUpdatedAt: Timestamp.now(), pendingSummary: false }, { merge: true }); return; }
  } else if (c.isLead === false) return;

  const cats = (await db.collection(`users/${uid}/categories`).get()).docs.map((d) => ({ id: d.id, name: d.data().name as string }));
  const p = await updateProfile(
    { summary: c.summary, requirements: c.requirements, nextAction: c.nextAction },
    transcript, cats.map((x) => x.name), new Date().toISOString(),
  );
  const update: Record<string, unknown> = {
    summary: p.summary, nextAction: p.nextAction, summaryUpdatedAt: Timestamp.now(), pendingSummary: false,
    // user edits win: only fill requirement fields the user hasn't locked
    requirements: { ...(p.requirements ?? {}), ...(c.requirementsLocked ?? {}) },
  };
  if (!c.categoryId) {
    const hit = cats.find((x) => x.name === p.suggestedCategory);
    if (hit) update.categoryId = hit.id;
  }
  await ref.set(update, { merge: true });

  if (p.followUpAt && !isNaN(Date.parse(p.followUpAt))) {
    await db.collection(`users/${uid}/reminders`).add({
      contactJid: jid, dueAt: Timestamp.fromDate(new Date(p.followUpAt)), kind: 'notify',
      message: p.nextAction, status: 'pending', source: 'ai', createdAt: Timestamp.now(),
    });
  }
}
