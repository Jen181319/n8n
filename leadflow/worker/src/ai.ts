// OpenRouter calls. Incremental: existing summary + new messages -> updated profile.
const URL = 'https://openrouter.ai/api/v1/chat/completions';

async function chat(model: string, system: string, user: string): Promise<any> {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, response_format: { type: 'json_object' }, temperature: 0.2,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

export async function classifyContact(recent: string): Promise<{ isLead: boolean; reason: string }> {
  return chat(
    process.env.OPENROUTER_CHEAP_MODEL!,
    'You triage WhatsApp chats of a property agent. Return JSON {"isLead":boolean,"reason":string}. ' +
      'isLead=true only if the person is a prospective buyer/tenant/seller/landlord. Family, friends, vendors, spam => false.',
    recent,
  );
}

export interface Profile {
  summary: string;
  requirements: { budget?: string; area?: string; type?: string; beds?: string; intent?: 'buy' | 'rent' | 'sell' | 'let'; timeline?: string; objections?: string };
  nextAction: string;
  suggestedCategory?: string;
  followUpAt?: string; // ISO date if the chat mentions one
}

export async function updateProfile(prev: Partial<Profile>, newMessages: string, categories: string[], nowIso: string): Promise<Profile> {
  return chat(
    process.env.OPENROUTER_SUMMARY_MODEL!,
    `You maintain a CRM profile for a property agent's lead. Merge the previous profile with the new messages. ` +
      `Keep it short and factual; chats may mix English, Malay and Chinese; write in English. Never invent facts. ` +
      `Return JSON {"summary","requirements":{"budget","area","type","beds","intent","timeline","objections"},"nextAction","suggestedCategory","followUpAt"}. ` +
      `suggestedCategory must be one of: ${categories.join(', ')} (or omit). followUpAt: ISO datetime only if a date/time was agreed, relative to now=${nowIso}.`,
    JSON.stringify({ previous: prev, newMessages }),
  );
}
