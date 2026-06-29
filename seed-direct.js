const { MongoClient } = require('mongodb');
const MONGODB_URI = "mongodb+srv://mummydaddy12:mummydaddy12@cluster0.fcneotn.mongodb.net/?appName=Cluster0";

const mockData = [
  { title: "Solo Leveling", source: "FlameComics", slug: "solo-leveling-fc", url: "https://flamecomics.xyz/series/solo-leveling", titleKey: "solo-leveling-fc" },
  { title: "Omniscient Reader", source: "FlameComics", slug: "orv-fc", url: "https://flamecomics.xyz/series/omniscient-reader", titleKey: "orv-fc" },
  { title: "Reaper of the Drifting Moon", source: "VortexScans", slug: "reaper-vs", url: "https://vortexscans.org/series/reaper-moon", titleKey: "reaper-vs" },
  { title: "Return of the Mount Hua Sect", source: "ToonGod", slug: "mount-hua-tg", url: "https://toongod.org/webtoons/mount-hua", titleKey: "mount-hua-tg" },
  { title: "The Beginning After the End", source: "WebtoonScan", slug: "tbate-ws", url: "https://webtoonscan.com/manga/tbate", titleKey: "tbate-ws" },
  { title: "Tower of God", source: "MangaGo", slug: "tog-mg", url: "https://mangago.me/read-manga/tower-of-god", titleKey: "tog-mg" },
  { title: "One Piece", source: "MangaVault", slug: "op-mv", url: "https://mangavault.xyz/manga/one-piece", titleKey: "op-mv" },
  { title: "Jujutsu Kaisen", source: "MangaFire", slug: "jjk-mf", url: "https://mangafire.to/manga/jujutsu-kaisen", titleKey: "jjk-mf" },
];

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("mangavault");
    const collection = db.collection("titles");

    console.log("Connected to MongoDB");

    for(const doc of mockData) {
      const dbDoc = {
        title: doc.title,
        titleKey: doc.titleKey,
        slug: doc.slug,
        url: doc.url,
        source: doc.source,
        description: "",
        rating: "N/A",
        status: "Ongoing",
        type: "Manga",
        genres: ["Action", "Fantasy"],
        chapters: [],
        chapterCount: "0",
        coverUrl: "",
        author: "Unknown",
        artist: "Unknown",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await collection.updateOne(
        { url: doc.url },
        { $set: dbDoc },
        { upsert: true }
      );
    }
    
    const count = await collection.countDocuments();
    console.log(`Successfully seeded database. Total documents: ${count}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
