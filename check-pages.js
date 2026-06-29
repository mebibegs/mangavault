const cheerio = require('cheerio');

async function checkAsura() {
  try {
    const res = await fetch("https://asurascans.com/browse");
    const html = await res.text();
    const $ = cheerio.load(html);
    const lastPage = $("a.page-numbers, button.page-number").not(".next").last().text() || html.match(/"pageCount":\[0,(\d+)\]/)?.[1];
    console.log("Asura Max Page:", lastPage || "Could not determine");
  } catch(e) { console.log("Asura failed", e.message); }
}

async function checkScythe() {
  try {
    const res = await fetch("https://scythescans.com/manga/");
    const html = await res.text();
    const $ = cheerio.load(html);
    const lastPage = $("a.page-numbers").not(".next").last().text();
    console.log("Scythe Max Page:", lastPage || "Could not determine");
  } catch(e) { console.log("Scythe failed", e.message); }
}

async function checkDemonic() {
  try {
    const res = await fetch("https://demonicscans.org/manga-list.php");
    const html = await res.text();
    const $ = cheerio.load(html);
    const lastPage = $("a.page-link").not(".next").last().text();
    console.log("Demonic Max Page:", lastPage || "Could not determine");
  } catch(e) { console.log("Demonic failed", e.message); }
}

async function checkManganato() {
  try {
    const res = await fetch("https://manganato.com/genre-all");
    const html = await res.text();
    const $ = cheerio.load(html);
    const lastPage = $(".page-last").text().replace(/\D/g, "");
    console.log("Manganato Max Page:", lastPage || "Could not determine");
  } catch(e) { console.log("Manganato failed", e.message); }
}

async function run() {
  await checkAsura();
  await checkScythe();
  await checkDemonic();
  await checkManganato();
}
run();
