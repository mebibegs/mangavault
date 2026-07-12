import "dotenv/config";
import { ensureIndexes } from "../src/lib/mongodb";

async function main() {
  await ensureIndexes();
  console.log("MongoDB indexes and one-time dedupe migration completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
