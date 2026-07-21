import { config } from "dotenv";
config({ path: ".env.local" });

import { Client } from "@upstash/qstash";

/**
 * One-time setup: register the QStash schedule that fires the master sync
 * trigger every 4 hours. Safe to re-run — it upserts by scheduleId.
 *
 * Requires QSTASH_TOKEN in the environment (pass it inline if .env.local
 * doesn't have it locally):
 *   QSTASH_TOKEN=... npx tsx scripts/setup-qstash-schedule.ts
 */
async function run() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    console.error("QSTASH_TOKEN is not set. Run: QSTASH_TOKEN=... npx tsx scripts/setup-qstash-schedule.ts");
    process.exit(1);
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.mangavault.in").replace(/\/$/, "");
  const destination = `${baseUrl}/api/cron/trigger`;

  const client = new Client({ token });

  const scheduleId = await client.schedules.create({
    destination,
    cron: "0 */4 * * *",
    scheduleId: "mangavault-full-sync",
    retries: 3,
  });

  console.log("Schedule created/updated:", scheduleId);
  console.log("Destination:", destination);
  console.log("Cron: 0 */4 * * * (every 4 hours, UTC)");

  const schedules = await client.schedules.list();
  console.log("\nAll schedules:");
  for (const s of schedules) {
    console.log(`  ${s.scheduleId} -> ${s.destination} [${s.cron}] ${s.isPaused ? "(paused)" : ""}`);
  }
}

run().catch((e) => { console.error("Fatal:", e?.message || e); process.exit(1); });
