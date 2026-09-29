// Work through the backlog of reference pictures that are not in our own
// storage yet. It calls the dashboard's own copy job again and again until
// nothing is left, so there is one implementation, the one the daily
// schedule runs.
//
//   node --env-file=.env.local scripts/copy-reference-slides.mjs
//   node --env-file=.env.local scripts/copy-reference-slides.mjs https://pm-dashboard-ashen.vercel.app
//
// It needs CRON_SECRET, the same value the dashboard it calls was given.
const base = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
const token = process.env.CRON_SECRET;
if (!token) throw new Error("CRON_SECRET is not set");
let total = 0;
for (let round = 1; round <= 400; round++) {
  const res = await fetch(`${base}/api/carousel-generator/maintenance/copy-slides?seconds=50`, { headers: { Authorization: `Bearer ${token}` } });
  const report = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`The copy job refused (HTTP ${res.status}): ${report.error ?? ""}`);
  total += report.copied;
  console.log(`round ${round}: copied ${report.copied}, failed ${report.failed}, left ${report.remaining}, gone for good ${report.gone}`);
  if (report.remaining === 0 || (report.copied === 0 && report.stoppedFor === "done")) break;
}
console.log(`copied ${total} pictures in all`);
