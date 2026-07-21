import { config } from "dotenv";
config({ path: ".env.local" });

import { MongoClient } from "mongodb";

async function run() {
  const c = new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 30000, tls: true });
  await c.connect();
  const db = c.db(process.env.MONGODB_DB || "mangavault");
  
  const total = await db.collection("titles").countDocuments();
  console.log("Total titles:", total);

  const bySource = await db.collection("titles").aggregate([
    { $unwind: "$sources" },
    { $group: { _id: "$sources.name", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  
  console.log("\nBy source:");
  for (const s of bySource) {
    console.log(`  ${s._id}: ${s.count}`);
  }
  
  await c.close();
}

run().catch((e) => { console.error(e.message); process.exit(1); });
