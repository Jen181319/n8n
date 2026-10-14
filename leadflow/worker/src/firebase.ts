import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Against the Firestore emulator no credentials are needed (used by the tests)
initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: process.env.GCLOUD_PROJECT ?? 'demo-leadflow' } : { credential: applicationDefault() });
export const db = getFirestore();
export const auth = getAuth();
