import express from 'express';
import { auth } from './firebase.js';
import { resumeAll, startSession, stopSession } from './session.js';
import { startScheduler } from './scheduler.js';

const app = express();
app.use(express.json());

// The website calls these with the user's Firebase ID token. QR/status is delivered via Firestore (users/{uid}/wa/session).
app.use(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    (req as any).uid = (await auth.verifyIdToken(token)).uid;
    next();
  } catch { res.status(401).json({ error: 'unauthorized' }); }
});

app.post('/wa/connect', async (req, res) => { await startSession((req as any).uid); res.json({ ok: true }); });
app.post('/wa/disconnect', async (req, res) => { await stopSession((req as any).uid); res.json({ ok: true }); });

const port = Number(process.env.PORT ?? 8080);
app.listen(port, async () => {
  console.log(`worker listening on ${port}`);
  await resumeAll();
  startScheduler();
});
