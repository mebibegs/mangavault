const cheerio = require("cheerio");

async function checkVortex() {
  const html = await fetch("https://vortexscans.org/series?page=1", { headers: { "User-Agent": "Mozilla/5.0" } }).then(r=>r.text());
  const $ = cheerio.load(html);
  const titles = [];
  $("a").each((i, el) => {
     if($(el).attr("href")?.includes("/series/") && $(el).text().trim().length > 3) {
        titles.push($(el).text().trim());
     }
  });
  console.log("Vortex Links found:", titles.slice(0,5));
}
checkVortex();
