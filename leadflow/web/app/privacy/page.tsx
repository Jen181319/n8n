export default function Privacy() {
  return (
    <div className="hero" style={{ textAlign: 'left' }}>
      <h1>Privacy &amp; terms</h1>
      <p>LeadFlow stores your WhatsApp messages and contact names so it can summarise them. Message text is sent to an AI provider (via OpenRouter) to produce summaries.</p>
      <p><b>WhatsApp connection risk.</b> LeadFlow links to WhatsApp as a linked device using an unofficial method. This is not endorsed by WhatsApp and the number can be restricted or banned. Use at your own risk.</p>
      <p>You can disconnect WhatsApp and delete your data at any time from Settings. Your clients&apos; messages are personal data: make sure you have the right to process them under your local law (e.g. PDPA/GDPR).</p>
      <p className="muted">Draft text: have it reviewed before launch.</p>
    </div>
  );
}
