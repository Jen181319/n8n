import Link from 'next/link';

export default function Landing() {
  return (
    <div className="hero">
      <h1>Never miss a property lead on WhatsApp</h1>
      <p className="muted">LeadFlow reads your WhatsApp chats, sorts the real leads from everyone else, summarises what each client wants,
        and reminds you every morning who to follow up.</p>
      <p className="row" style={{ justifyContent: 'center' }}>
        <Link href="/login/"><button className="primary">Sign in with Google</button></Link>
        <Link href="/pricing/">Pricing</Link>
      </p>
      <div className="grid" style={{ textAlign: 'left', marginTop: 40 }}>
        {['Auto lead detection', 'AI summary of needs & budget', 'Custom categories', 'Follow-up reminders & auto-messages', 'Daily WhatsApp digest'].map((f) => <div className="card" key={f}>{f}</div>)}
      </div>
      <p className="muted"><Link href="/privacy/">Privacy &amp; terms</Link></p>
    </div>
  );
}
