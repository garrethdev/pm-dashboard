// Work through the backlog of library and Trends pictures that have no small
// copy on Cloudflare yet. It calls the dashboard's own copy job again and
// again until nothing is left, so there is one implementation, the one the
// daily schedule runs. Safe to stop and start again.
//
//   node --env-file=.env.local scripts/make-picture-copies.mjs                 (a local dashboard)
//   node --env-file=.env.local scripts/make-picture-copies.mjs https://pm-dashboard-ashen.vercel.app
//   node --env-file=.env.local scripts/make-picture-copies.mjs http://localhost:3000 10   (make ten, list them, stop)
//
// It needs CRON_SECRET, the same value the dashboard it calls was given.
const base = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
const limit = Number(process.argv[3]) || 0;
const token = process.env.CRON_SECRET;
if (!token) throw new Error("CRON_SECRET is not set");
let made = 0;
let failed = 0;
for (let round = 1; round <= 1000; round++) {
  const res = await fetch(`${base}/api/carousel-generator/maintenance/picture-copies?seconds=55${limit ? `&limit=${limit}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
  const report = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`The copy job refused (HTTP ${res.status}): ${report.error ?? ""}`);
  made += report.made;
  failed += report.failed;
  console.log(`round ${round}: made ${report.made}, failed ${report.failed}, left ${report.remaining}`);
  if (limit) {
    console.log(JSON.stringify(report.samples, null, 2));
    break;
  }
  if (report.remaining === 0 || (report.made === 0 && report.stoppedFor === "done")) break;
}
console.log(`made copies of ${made} pictures, ${failed} failed`);
