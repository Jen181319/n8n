import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';
import type { AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { db } from './firebase.js';

// Stores Baileys credentials/keys in Firestore (waAuth/{uid}/keys/{id}) so sessions survive restarts.
export async function useFirestoreAuthState(uid: string) {
  const col = db.collection('waAuth').doc(uid).collection('keys');
  const enc = (v: unknown) => JSON.stringify(v, BufferJSON.replacer);
  const dec = (s: string) => JSON.parse(s, BufferJSON.reviver);
  const id = (s: string) => s.replace(/\//g, '__').replace(/:/g, '-');

  const credsSnap = await col.doc('creds').get();
  const creds = credsSnap.exists ? dec(credsSnap.data()!.v) : initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const out: { [k: string]: SignalDataTypeMap[typeof type] } = {};
        await Promise.all(ids.map(async (i) => {
          const s = await col.doc(id(`${type}-${i}`)).get();
          if (!s.exists) return;
          let v = dec(s.data()!.v);
          if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v);
          out[i] = v;
        }));
        return out;
      },
      set: async (data) => {
        const batch = db.batch();
        for (const [type, entries] of Object.entries(data)) {
          for (const [i, v] of Object.entries(entries ?? {})) {
            const ref = col.doc(id(`${type}-${i}`));
            v ? batch.set(ref, { v: enc(v) }) : batch.delete(ref);
          }
        }
        await batch.commit();
      },
    },
  };
  return {
    state,
    saveCreds: () => col.doc('creds').set({ v: enc(state.creds) }),
    clear: async () => { const s = await col.get(); const b = db.batch(); s.docs.forEach((d) => b.delete(d.ref)); await b.commit(); },
  };
}
