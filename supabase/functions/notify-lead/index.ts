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

function render(l: Lead) {
  const digits = (l.phone || "").replace(/[^\d]/g, "");
  const when = new Date(l.created_at || Date.now()).toLocaleString("ar-SA-u-ca-gregory-nu-latn", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const kind = isCallback(l) ? "طلب اتصال" : "طلب عرض سعر";
  const rows: [string, string][] = [
    ["الاسم", esc(l.name)],
    ["الجوال", `<a href="tel:${esc(l.phone)}" dir="ltr">${esc(l.phone)}</a>`],
  ];
  if (l.email) rows.push(["البريد", `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>`]);
  if (l.scope) rows.push(["نطاق العمل", esc(SCOPES[l.scope] || l.scope)]);
  if (l.city) rows.push(["المدينة", esc(l.city)]);
  if (l.area) rows.push(["المساحة", `${esc(l.area)} م²`]);
  if (l.details && !isCallback(l)) rows.push(["التفاصيل", esc(l.details).replace(/\n/g, "<br>")]);
  rows.push(["الوقت", esc(when)]);

  const table = rows
    .map(([k, v]) =>
      `<tr><td style="padding:10px 14px;color:#5B7186;white-space:nowrap;vertical-align:top">${k}</td>` +
      `<td dir="auto" style="padding:10px 14px;color:#033856;font-weight:600;text-align:right">${v}</td></tr>`)
    .join("");

  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" style="display:inline-block;margin:4px;padding:12px 20px;border-radius:10px;` +
    `background:${bg};color:${fg};font-weight:700;text-decoration:none">${label}</a>`;

  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#F3F5F7;font-family:Tahoma,Arial,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E9F0">
  <div style="background:#033856;color:#fff;padding:20px 24px;border-bottom:4px solid #F6B80F">
    <div style="font-size:13px;color:#F6B80F;font-weight:700">byarcsa.com</div>
    <div style="font-size:20px;font-weight:800;margin-top:4px">${kind} جديد</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:15px">${table}</table>
  <div style="padding:18px 20px 24px;text-align:center">
    ${digits ? btn(`https://wa.me/${digits}`, "واتساب العميل", "#25D366", "#fff") : ""}
    ${btn(`tel:${esc(l.phone)}`, "اتصال", "#033856", "#fff")}
    ${btn("https://byarcsa.com/admin/", "لوحة التحكم", "#F6B80F", "#033856")}
  </div>
</div></body></html>`;

  const subject = `${kind} جديد — ${String(l.name || "").slice(0, 60)}`;
  const text = rows.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, "")}`).join("\n");
  return { subject, html, text };
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
  const { subject, html, text } = render(lead);

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
