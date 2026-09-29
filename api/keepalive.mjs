// Called by Vercel Cron (vercel.json). Supabase pauses free projects after
// about a week without activity, which took the leads inbox offline in
// September 2026. The site's public key may only insert, so this sends an
// insert that the table's own check constraint rejects: it reaches Postgres,
// counts as activity, and never writes a row.
const SB_URL = 'https://cavojuqysdabhnidhhqa.supabase.co';
const SB_KEY = 'sb_publishable_ktAw1dC0J7udqhUR1R7eug_I1GArH91';

export default async function handler(req, res) {
  try {
    const r = await fetch(SB_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      // a one-letter name fails leads_name_check by design
      body: JSON.stringify({ name: 'x', phone: '+966500000000', source: 'website', status: 'new' })
    });
    const body = await r.text();
    const alive = r.status === 400 && body.includes('23514');
    res.status(alive ? 200 : 502).json({ alive, status: r.status });
  } catch (e) {
    res.status(502).json({ alive: false, error: String(e) });
  }
}
