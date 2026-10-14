'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { callWorker } from '@/lib/auth';
import { useDocument } from '@/lib/hooks';
import { fmt, type WaSession } from '@/lib/types';

export default function Connect() {
  const { data: wa } = useDocument<WaSession>('wa/session');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const status = wa?.status ?? 'disconnected';
  const run = async (path: string) => { setBusy(true); setErr(''); try { await callWorker(path); } catch (e) { setErr(`${e}. Is the worker running?`); } setBusy(false); };

  return (
    <>
      <h1>WhatsApp connection</h1>
      <div className="card">
        <p>Status: <b>{status}</b>{wa?.phone && <> · +{wa.phone.split('@')[0]}</>}</p>
        {status === 'qr' && wa?.qr && (
          <>
            <QRCodeSVG value={wa.qr} size={240} />
            <p className="muted">On your phone: WhatsApp → Settings → Linked devices → Link a device, then scan this code.</p>
          </>
        )}
        {status === 'connecting' && <p className="muted">Connecting…</p>}
        {status === 'connected' && <p className="muted">{wa?.importProgress != null && wa.importProgress < 100 ? `Importing history… ${wa.importProgress}%` : 'Synced'} · last sync {fmt(wa?.lastSyncAt)}. WhatsApp only shares the recent history it chooses when linking.</p>}
        <div className="row">
          {(status === 'disconnected') && <button className="primary" disabled={busy} onClick={() => run('/wa/connect')}>Connect WhatsApp</button>}
          {status === 'qr' && <button disabled={busy} onClick={() => run('/wa/connect')}>Refresh QR</button>}
          {status !== 'disconnected' && <button className="danger" disabled={busy} onClick={() => confirm('Disconnect WhatsApp?') && run('/wa/disconnect')}>Disconnect</button>}
        </div>
        {err && <p className="err">{err}</p>}
      </div>
      <div className="card muted">This uses an unofficial WhatsApp connection. WhatsApp may restrict numbers that use it; see the <a href="/privacy/">privacy &amp; risk notice</a>.</div>
    </>
  );
}
