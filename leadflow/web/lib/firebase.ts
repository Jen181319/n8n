import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const app = getApps().length ? getApp() : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
export const auth = getAuth(app);
export const db = getFirestore(app);

// Local testing against the Firebase emulators (NEXT_PUBLIC_USE_EMULATORS=1). Never set in production.
if (process.env.NEXT_PUBLIC_USE_EMULATORS === '1' && typeof window !== 'undefined' && !(window as any).__lf) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  (window as any).__lf = { signIn: (e: string, p: string) => signInWithEmailAndPassword(auth, e, p) };
}
