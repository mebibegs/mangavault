async function run() {
  const asura = await fetch("https://asurascans.com/browse").then(r=>r.text());
  console.log("Asura:", (asura.match(/"pageCount":\[0,(\d+)\]/) || [])[1] || "Unknown");

  const manganato = await fetch("https://manganato.com/genre-all").then(r=>r.text());
  const mMatch = manganato.match(/page-last[^>]+>\s*LAST\((\d+)\)/i) || manganato.match(/page=(\d+)/g);
  console.log("Manganato:", mMatch ? mMatch[1] || mMatch.pop() : "Unknown");

  const demonic = await fetch("https://demonicscans.org/manga-list.php").then(r=>r.text());
  const dMatch = demonic.match(/page=(\d+)/g);
  console.log("Demonic:", dMatch ? Math.max(...dMatch.map(s => parseInt(s.replace('page=', '')))) : "Unknown");

  const scythe = await fetch("https://scythescans.com/manga/").then(r=>r.text());
  const sMatch = scythe.match(/\/page\/(\d+)\//g);
  console.log("Scythe:", sMatch ? Math.max(...sMatch.map(s => parseInt(s.replace(/\D/g, '')))) : "Unknown");
}
run();
