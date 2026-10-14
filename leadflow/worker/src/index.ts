import express from 'express';
import { auth } from './firebase.js';
import { resumeAll, startSession, stopSession } from './session.js';
import { summarize } from './summarize.js';
import { startScheduler } from './scheduler.js';

const app = express();
app.use(express.json());
const origin = process.env.ALLOWED_ORIGIN ?? '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return void res.sendStatus(204);
  next();
});
app.get('/healthz', (_req, res) => void res.json({ ok: true }));

// The website calls these with the user's Firebase ID token. QR/status is delivered via Firestore (users/{uid}/wa/session).
app.use(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    (req as any).uid = (await auth.verifyIdToken(token)).uid;
    next();
  } catch { res.status(401).json({ error: 'unauthorized' }); }
});

// Express 4 does not catch rejected promises; wrap so errors become 500s instead of hanging requests.
const h = (fn: (req: express.Request) => Promise<unknown>): express.RequestHandler => (req, res) =>
  void fn(req).then(() => res.json({ ok: true })).catch((e) => { console.error(e); res.status(500).json({ error: 'failed' }); });
app.post('/wa/connect', h((req) => startSession((req as any).uid)));
app.post('/wa/disconnect', h((req) => stopSession((req as any).uid)));

app.post('/contacts/summarize', (req, res, next) => (req.body?.jid ? next() : void res.status(400).json({ error: 'jid required' })),
  h((req) => summarize((req as any).uid, String(req.body.jid), true)));

const port = Number(process.env.PORT ?? 8080);
app.listen(port, async () => {
  console.log(`worker listening on ${port}`);
  await resumeAll();
  startScheduler();
});
