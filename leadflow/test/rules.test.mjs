import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-rules', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('/home/user/n8n/leadflow/firebase/firestore.rules', 'utf8') } });
const a = env.authenticatedContext('alice').firestore(), anon = env.unauthenticatedContext().firestore();
await assertSucceeds(setDoc(doc(a, 'users/alice'), { x: 1 }));
await assertSucceeds(setDoc(doc(a, 'users/alice/contacts/1@s.whatsapp.net'), { x: 1 }));
await assertFails(getDoc(doc(a, 'users/bob/contacts/1')));            // other user's data
await assertFails(setDoc(doc(a, 'users/bob'), { x: 1 }));
await assertFails(getDoc(doc(anon, 'users/alice')));                    // logged out
await assertFails(setDoc(doc(a, 'users/alice/wa/session'), { status: 'connected' })); // client cannot fake WA status
await assertSucceeds(getDoc(doc(a, 'users/alice/wa/session')));
await assertFails(getDoc(doc(a, 'waAuth/alice/keys/creds')));          // WhatsApp credentials unreadable
console.log('rules ok'); await env.cleanup();
