# LeadFlow

WhatsApp lead manager for property agents.

- `firebase/` Firestore rules and indexes, Firebase config (Auth, Hosting, Firestore, Storage)
- `worker/` always-on Node service: Baileys sessions, message ingest, OpenRouter AI, reminders, daily digest
- `web/` (next) website and PWA dashboard

## Why a separate worker
Baileys keeps a WebSocket open 24/7. Cloud Functions cannot do that, so the worker runs on a small
Compute Engine VM (or Cloud Run with min-instances=1) while everything else stays on Firebase.

## Firestore data model
```
users/{uid}                          profile, timezone, digestTime, defaultLang, plan
users/{uid}/wa/session               status (disconnected|qr|connecting|connected), qr, lastSyncAt, importProgress
users/{uid}/categories/{id}          name, color, order, aiHint
users/{uid}/contacts/{jid}           name, phone, isLead (auto|true|false), ignored, categoryId, status,
                                     summary, requirements{budget,area,type,beds,intent,timeline,objections},
                                     nextAction, lastMessageAt, lastInboundAt, lastOutboundAt, needsReply, summaryUpdatedAt
users/{uid}/contacts/{jid}/messages/{id}   fromMe, text, type, ts
users/{uid}/reminders/{id}           contactJid, dueAt, kind (notify|autosend), message, status (pending|done|sent|failed)
users/{uid}/templates/{id}           name, body ({name}, {property})
waAuth/{uid}/keys/{id}               Baileys auth state (server-only, no client access)
```

## Run the worker
```
cd worker && cp .env.example .env   # fill values
npm install && npm run dev
```

## Local setup
1. Create a Firebase project (Auth with Google, Firestore, Hosting). Copy `web/.env.example` -> `web/.env.local`, `worker/.env.example` -> `worker/.env`.
2. `cd firebase && firebase deploy --only firestore:rules,firestore:indexes`
3. Worker: `cd worker && npm i && npm run dev` (needs a service account JSON). Web: `cd web && npm i && npm run dev`.
4. Deploy web: `cd web && npm run build && cd ../firebase && firebase deploy --only hosting`. Run the worker on a VM/Cloud Run (min instances 1).

## Tests (use the Firebase emulators: `firebase emulators:start --only auth,firestore --project demo-leadflow`)
- `worker`: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test` (classification, summaries, edit-locking, auto-send guard; OpenRouter is mocked)
- `test/rules.test.mjs`: Firestore security rules (needs `@firebase/rules-unit-testing`)
- `test/browser.mjs`: Playwright run through the logged-in website (build web with `NEXT_PUBLIC_USE_EMULATORS=1`, serve `web/out` on :3111)

Known gaps: no Stripe billing / plan enforcement (users can edit their own `plan` field), no disconnect alerts, group chats ignored, voice notes not transcribed.
