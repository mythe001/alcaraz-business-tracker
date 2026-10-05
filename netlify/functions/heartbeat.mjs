// Anonymous usage stats for Alcaraz Business Tracker.
// The app (index.html, "USAGE STATS") posts a small weekly summary here, only if the user agreed.
// This function checks it and stores one row in Supabase (table public.abt_heartbeats).
// It keeps nothing else: no IP address, no user agent, no cookies.
//
// Needs two environment variables on the Netlify site:
//   SUPABASE_URL              e.g. https://xxxx.supabase.co
//   SUPABASE_PUBLISHABLE_KEY  the project's publishable (anon) key; the table only allows inserts

const BANDS = ["none", "under_50k", "50k_200k", "200k_500k", "500k_plus"];
const PLATFORMS = ["android", "ios", "desktop"];
const DISPLAYS = ["installed", "in_app_browser", "browser"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const int = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
const reply = (status, text) => new Response(text, { status, headers: { "Cache-Control": "no-store" } });

// Returns a clean row with only the known fields, or null if anything looks wrong
function clean(b){
  if(!b || typeof b !== "object") return null;
  const ok = UUID.test(b.install_id)
    && typeof b.app_version === "string" && /^[0-9a-z.\-]{1,20}$/i.test(b.app_version)
    && int(b.weeks_since_install, 2000)
    && int(b.days_active_7d, 7)
    && int(b.sales_entries_7d, 100000) && int(b.expense_entries_7d, 100000) && int(b.transfer_entries_7d, 100000)
    && int(b.total_entries, 10000000)
    && BANDS.includes(b.sales_band_30d) && BANDS.includes(b.expense_band_30d)
    && typeof b.uses_receivables === "boolean" && typeof b.has_backup === "boolean"
    && PLATFORMS.includes(b.platform) && DISPLAYS.includes(b.display);
  if(!ok) return null;
  return {
    install_id: b.install_id.toLowerCase(),
    app_version: b.app_version,
    weeks_since_install: b.weeks_since_install,
    days_active_7d: b.days_active_7d,
    sales_entries_7d: b.sales_entries_7d,
    expense_entries_7d: b.expense_entries_7d,
    transfer_entries_7d: b.transfer_entries_7d,
    total_entries: b.total_entries,
    sales_band_30d: b.sales_band_30d,
    expense_band_30d: b.expense_band_30d,
    uses_receivables: b.uses_receivables,
    has_backup: b.has_backup,
    platform: b.platform,
    display: b.display
  };
}

export default async (req) => {
  if(req.method !== "POST") return reply(405, "Method not allowed");

  let row = null;
  try{
    const text = await req.text();
    if(text.length <= 2000) row = clean(JSON.parse(text));
  }catch(e){}
  if(!row) return reply(400, "Bad request");

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!url || !key) return reply(500, "Not configured");

  const res = await fetch(`${url}/rest/v1/abt_heartbeats`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row)
  });
  // 409 = this install already reported this week; that is fine
  if(res.ok || res.status === 409) return reply(204, null);
  return reply(502, "Could not save");
};

export const config = { path: "/api/heartbeat" };
