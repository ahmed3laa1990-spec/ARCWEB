// Emails the team the moment a lead lands in public.leads.
//
// Called by the leads_notify trigger (migration 0003) through pg_net, not by
// browsers, so JWT verification is off and a shared secret guards it instead.
//
// Secrets (Edge Functions → Secrets):
//   RESEND_API_KEY   Resend API key (the only one that must be set by hand)
//   WEBHOOK_SECRET   optional; by default the function reads
//                    app_secrets.lead_notify_secret with its service role,
//                    the same row the trigger sends
//   NOTIFY_TO        optional, comma-separated; default info@byarcsa.com
//   NOTIFY_FROM      optional; default "ARC Website <leads@byarcsa.com>"

type Lead = {
  id?: string;
  created_at?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  scope?: string | null;
  city?: string | null;
  area?: number | null;
  details?: string | null;
  lang?: string | null;
  source?: string | null;
  attachments?: string[] | null;
  attachment_names?: string[] | null;
};

const SCOPES: Record<string, string> = {
  structural: "إنشائي",
  architectural: "معماري",
  mechanical: "ميكانيكا",
  electrical: "كهرباء",
  electromechanical: "إلكتروميكانيك",
  finishing: "تشطيبات",
  other: "أخرى",
};

// Everything in a lead was typed by a stranger; never let it become markup.
const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function isCallback(l: Lead) {
  return !l.scope && (l.details || "").startsWith("Call-back request");
}

type Attachment = { name: string; url: string };

// Email clients (Outlook, Apple Mail, Gmail) strip <html>/<body> attributes
// and many drop table direction, so every block carries its own dir/align,
// labels sit above values instead of in a second column, and long unbroken
// text wraps instead of widening the card.
function render(l: Lead, files: Attachment[] = []) {
  const digits = (l.phone || "").replace(/[^\d]/g, "");
  const when = new Date(l.created_at || Date.now()).toLocaleString("ar-SA-u-ca-gregory-nu-latn", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const kind = isCallback(l) ? "طلب اتصال" : "طلب عرض سعر";
  const rows: [string, string][] = [
    ["الاسم", esc(l.name)],
    ["الجوال", `<a href="tel:${esc(l.phone)}" style="color:#033856;text-decoration:none"><span dir="ltr">${esc(l.phone)}</span></a>`],
  ];
  if (l.email) rows.push(["البريد", `<a href="mailto:${esc(l.email)}" style="color:#033856"><span dir="ltr">${esc(l.email)}</span></a>`]);
  if (l.scope) rows.push(["نطاق العمل", esc(SCOPES[l.scope] || l.scope)]);
  if (l.city) rows.push(["المدينة", esc(l.city)]);
  if (l.area) rows.push(["المساحة", `${esc(l.area)} م²`]);
  if (l.details && !isCallback(l)) rows.push(["التفاصيل", esc(l.details).replace(/\n/g, "<br>")]);
  if (files.length) {
    rows.push(["المرفقات", files.map((f) =>
      `<a href="${esc(f.url)}" style="color:#0B4A70;font-weight:700">${esc(f.name)}</a>`).join("<br>")]);
  }
  rows.push(["الوقت", esc(when)]);

  const wrap = "word-wrap:break-word;overflow-wrap:anywhere;word-break:break-word";
  const blocks = rows.map(([k, v], i) =>
    `<tr><td dir="rtl" align="right" style="padding:14px 24px;${i ? "border-top:1px solid #EEF1F5;" : ""}text-align:right;${wrap}">` +
    `<div style="font-size:12px;color:#5B7186;margin-bottom:4px">${k}</div>` +
    `<div style="font-size:16px;color:#033856;font-weight:700;line-height:1.6;${wrap}">${v}</div>` +
    `</td></tr>`).join("");

  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" style="display:inline-block;margin:4px;padding:12px 18px;border-radius:10px;` +
    `background:${bg};color:${fg};font-weight:700;font-size:14px;text-decoration:none">${label}</a>`;

  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F3F5F7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5F7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;table-layout:fixed;background:#ffffff;border:1px solid #E5E9F0;border-radius:16px;font-family:Tahoma,Arial,sans-serif">
  <tr><td dir="rtl" align="right" style="background:#033856;padding:20px 24px;border-bottom:4px solid #F6B80F;border-radius:16px 16px 0 0;text-align:right">
    <div style="font-size:13px;color:#F6B80F;font-weight:700">byarcsa.com</div>
    <div style="font-size:20px;color:#ffffff;font-weight:800;margin-top:4px">${kind} جديد</div>
  </td></tr>
  ${blocks}
  <tr><td align="center" style="padding:18px 16px 24px;border-top:1px solid #EEF1F5;text-align:center">
    ${digits ? btn(`https://wa.me/${digits}`, "واتساب العميل", "#1FA855", "#ffffff") : ""}
    ${btn(`tel:${esc(l.phone)}`, "اتصال", "#033856", "#ffffff")}
    ${btn("https://byarcsa.com/admin/", "لوحة التحكم", "#F6B80F", "#033856")}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const subject = `${kind} جديد — ${String(l.name || "").slice(0, 60)}`;
  const text = rows.map(([k, v]) => `${k}: ${v.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "")}`).join("\n");
  return { subject, html, text };
}

// Private bucket: the email gets 30-day signed links, the panel signs its own.
async function signFiles(paths: string[] | null | undefined, names?: string[] | null): Promise<Attachment[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!paths?.length || !url || !key) return [];
  const out: Attachment[] = [];
  for (const [i, p] of paths.slice(0, 5).entries()) {
    try {
      const r = await fetch(`${url}/storage/v1/object/sign/lead-files/${p.split("/").map(encodeURIComponent).join("/")}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 30 }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const signed = j.signedURL || j.signedUrl;
      if (signed) out.push({ name: names?.[i] || p.split("/").pop()!.replace(/^\d+-/, ""), url: `${url}/storage/v1${signed}` });
    } catch (_) { /* a missing file must not block the email */ }
  }
  return out;
}

// A secret name typed on an Arabic keyboard can carry an invisible
// right-to-left mark (U+200F), so "RESEND_API_KEY" arrives with a hidden mark in front.
// Match names with direction marks and stray whitespace ignored.
const INVISIBLE = /[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const MARKS = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
// Values lose the marks too (a pasted key can carry one) but keep inner
// spaces, which "ARC Website <leads@...>" needs.
function env(name: string): string | undefined {
  const all = Deno.env.toObject();
  const hit = name in all ? name : Object.keys(all).find((k) => k.replace(INVISIBLE, "") === name);
  const v = hit ? all[hit].replace(MARKS, "").trim() : "";
  return v || undefined;
}

let cachedSecret: string | null = null;

async function webhookSecret(): Promise<string | null> {
  const fromEnv = env("WEBHOOK_SECRET");
  if (fromEnv) return fromEnv;
  if (cachedSecret) return cachedSecret;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/app_secrets?key=eq.lead_notify_secret&select=value`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  cachedSecret = rows?.[0]?.value ?? null;
  return cachedSecret;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const secret = await webhookSecret();
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  let lead: Lead;
  try {
    const body = await req.json();
    lead = body.record ?? body;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (!lead?.name || !lead?.phone) return new Response("missing fields", { status: 400 });

  const key = env("RESEND_API_KEY");
  if (!key) {
    // names only, never values: enough to spot a mistyped secret name
    const seen = Object.keys(Deno.env.toObject()).filter((n) => !n.startsWith("SUPABASE_")).sort();
    return new Response(`RESEND_API_KEY not set; custom secrets seen: ${seen.join(", ") || "none"}`, { status: 500 });
  }

  const to = (env("NOTIFY_TO") || "info@byarcsa.com").split(",").map((s) => s.trim()).filter(Boolean);
  const from = env("NOTIFY_FROM") || "ARC Website <leads@byarcsa.com>";
  const { subject, html, text } = render(lead, await signFiles(lead.attachments, lead.attachment_names));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      ...(lead.email ? { reply_to: lead.email } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("resend failed", res.status, detail);
    // Resend's error text (e.g. unverified domain) lands in net._http_response
    return new Response(`send failed: ${res.status} ${detail.slice(0, 200)}`, { status: 502 });
  }
  return new Response("sent", { status: 200 });
});
