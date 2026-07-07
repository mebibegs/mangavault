import { config } from "dotenv";
config();
process.env.MONGODB_URI = "mongodb+srv://mummydaddy12:mummydaddy12@cluster0.fcneotn.mongodb.net/?appName=Cluster0";
process.env.MONGODB_DB = "mangavault";

async function main() {
  const { getMongoDb, ensureTextIndex } = await import("./src/lib/mongodb");
  console.log("=== BEFORE: list indexes ===");
  let db = await getMongoDb();
  if (!db) { console.log("no db"); return; }
  let idxs = await db.collection("titles").indexes();
  idxs.forEach(i => console.log(" -", i.name, JSON.stringify(i.key)));

  console.log("\n=== Calling ensureTextIndex() ===");
  const ok = await ensureTextIndex();
  console.log("result:", ok);

  console.log("\n=== AFTER: list indexes ===");
  idxs = await db.collection("titles").indexes();
  idxs.forEach(i => console.log(" -", i.name, JSON.stringify(i.key), i.weights ? "weights:"+JSON.stringify(i.weights):""));

  console.log("\n=== Test $text query now works ===");
  const res = await db.collection("titles").find({ $text: { $search: "solo" } }).limit(3).toArray();
  console.log("$text results:", res.length, "|", res.map(r=>r.title).slice(0,3).join(", "));
}
main().catch(e=>{console.error("ERR",e);process.exit(1);});
