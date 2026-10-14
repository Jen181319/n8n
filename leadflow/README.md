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
