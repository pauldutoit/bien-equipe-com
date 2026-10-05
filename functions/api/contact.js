/**
 * Cloudflare Pages Function: POST /api/contact
 *
 * Receives a contact-form submission, validates it, emails it via Resend.
 * All external steps are opt-in through env vars, so the endpoint works
 * without email set up (it logs the payload instead of failing).
 *
 * Env vars (Cloudflare Pages project settings > Environment variables):
 *   RESEND_API_KEY    Resend API key            (no key    -> logged, not emailed)
 *   CONTACT_TO        inbox for messages        (required for email)
 *   CONTACT_FROM      verified From address     (default onboarding@resend.dev)
 *   TURNSTILE_SECRET  Turnstile secret          (no secret -> captcha check skipped)
 *
 * The client contact form must include a Turnstile widget rendering
 * data-sitekey with the matching site key (see site.config.json).
 */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function onRequestPost({ request, env: rawEnv }) {
  // Accept both the names used here and those set by leadgen-launcher.
  const env = {
    ...rawEnv,
    TURNSTILE_SECRET: rawEnv.TURNSTILE_SECRET || rawEnv.TURNSTILE_SECRET_KEY,
    CONTACT_TO: rawEnv.CONTACT_TO || rawEnv.CONTACT_TO_EMAIL || rawEnv.LEAD_TO_EMAIL,
    CONTACT_FROM: rawEnv.CONTACT_FROM || rawEnv.CONTACT_FROM_EMAIL || rawEnv.LEAD_FROM_EMAIL,
  };
  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    data = ct.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  if (data.company_hp) return json({ ok: true });

  const name = String(data.name || '').trim().slice(0, 120);
  const email = String(data.email || '').trim().slice(0, 200);
  const subject = String(data.subject || '').trim().slice(0, 200);
  const message = String(data.message || '').trim().slice(0, 4000);

  const fields = [];
  if (!name) fields.push('name');
  if (!EMAIL.test(email)) fields.push('email');
  if (!message || message.length < 10) fields.push('message');
  if (fields.length) return json({ ok: false, error: 'validation', fields }, 400);

  if (env.TURNSTILE_SECRET) {
    const token = data['cf-turnstile-response'];
    const check = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
      }
    )
      .then((r) => r.json())
      .catch(() => ({ success: false }));
    if (!check.success) return json({ ok: false, error: 'captcha' }, 400);
  }

  const submittedAt = new Date().toISOString();
  const cfCountry = request.headers.get('cf-ipcountry') || '';
  const userAgent = request.headers.get('user-agent') || '';

  const payload = { name, email, subject, message, submittedAt, cfCountry, userAgent };

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    console.log('[contact] no RESEND_API_KEY or CONTACT_TO - logging payload only');
    console.log(JSON.stringify(payload));
    return json({ ok: true });
  }

  const fromAddr = env.CONTACT_FROM || 'Bien Équipé <onboarding@resend.dev>';
  const subjectLine = subject
    ? `[Bien Équipé contact] ${subject}`
    : `[Bien Équipé contact] Message from ${name}`;

  const html = `
    <h2>New contact form message</h2>
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ''}
    <p><strong>Message:</strong></p>
    <blockquote style="border-left:3px solid #ccc;padding-left:1em;margin:1em 0;">
      ${escapeHtml(message).replace(/\n/g, '<br>')}
    </blockquote>
    <hr>
    <p style="color:#888;font-size:12px;">
      Submitted ${submittedAt} · Country ${cfCountry || 'unknown'}<br>
      UA: ${escapeHtml(userAgent).slice(0, 200)}
    </p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to: env.CONTACT_TO,
      reply_to: email,
      subject: subjectLine,
      html,
      text: `From: ${name} <${email}>\n${subject ? `Subject: ${subject}\n` : ''}\n${message}\n\n---\nSubmitted ${submittedAt}\nCountry ${cfCountry}\nUA: ${userAgent}`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[contact] Resend failed:', res.status, errText);
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  return json({ ok: true });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
