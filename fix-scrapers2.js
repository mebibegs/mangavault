const fs = require('fs');
let code = fs.readFileSync('src/lib/scrapers/registry.ts', 'utf8');

// Vortex is a Next.js or generic site, let's fix its parser
code = code.replace(/function parseMangaStream[\s\S]*?\}\n\}/m, `function parseMangaStream(html: string, sourceName: string, baseUrl: string): MangaResult[] {
  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  
  // Try manga stream standard
  $(".bsx").each((_, el) => {
    const linkEl = $(el).find("a");
    const title = linkEl.attr("title") || $(el).find(".tt").text().trim();
    const url = linkEl.attr("href") || "";
    const imgEl = $(el).find("img");
    const coverUrl = imgEl.attr("src") || "";
    
    if (title && url) {
      results.push({
        title, description: "", rating: "N/A", status: "Unknown", type: "Manga",
        genres: [], chapters: [], chapterCount: "0", coverUrl, url: url.startsWith("http") ? url : \`\${baseUrl}\${url}\`,
        source: sourceName, author: "Unknown", artist: "Unknown"
      });
    }
  });

  // Try Vortex Scans / NextJS custom structures
  if(results.length === 0) {
     $("a[href*='/series/']").each((_, el) => {
       const title = $(el).find("h3, h4, .text-xl, .font-bold").text().trim() || $(el).text().trim();
       const url = $(el).attr("href") || "";
       const coverUrl = $(el).find("img").attr("src") || "";
       if(title && title.length > 3 && !title.includes("Chapter") && url && !results.find(r=>r.url.includes(url))) {
         results.push({
          title, description: "", rating: "N/A", status: "Unknown", type: "Manga",
          genres: [], chapters: [], chapterCount: "0", coverUrl, url: url.startsWith("http") ? url : \`\${baseUrl}\${url}\`,
          source: sourceName, author: "Unknown", artist: "Unknown"
        });
       }
     });
  }
  return results;
}`);

// Fix ToonGod & WebtoonScan (Madara)
code = code.replace(/function parseMadara[\s\S]*?\}\n\}/m, `function parseMadara(html: string, sourceName: string, baseUrl: string): MangaResult[] {
  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  
  $(".page-item-detail, .manga-item, .post-title").each((_, el) => {
    const titleEl = $(el).find("h3 a, h4 a") || $(el).find("a");
    const title = titleEl.text().trim();
    const url = titleEl.attr("href") || $(el).closest("a").attr("href") || "";
    const imgEl = $(el).find("img");
    const coverUrl = imgEl.attr("data-src") || imgEl.attr("src") || "";
    
    if (title && url) {
      results.push({
        title, description: "", rating: "N/A", status: "Unknown", type: "Manga",
        genres: [], chapters: [], chapterCount: "0", coverUrl, url: url.startsWith("http") ? url : \`\${baseUrl}\${url}\`,
        source: sourceName, author: "Unknown", artist: "Unknown"
      });
    }
  });

  // Fallback for madara if above failed
  if (results.length === 0) {
    $("a[href*='/manga/'], a[href*='/webtoons/']").each((_, el) => {
      const title = $(el).attr("title") || $(el).text().trim();
      const url = $(el).attr("href") || "";
      if(title && title.length > 3 && !title.includes("Chapter") && !results.find(r=>r.url.includes(url))) {
         results.push({
          title, description: "", rating: "N/A", status: "Unknown", type: "Manga",
          genres: [], chapters: [], chapterCount: "0", coverUrl: "", url: url.startsWith("http") ? url : \`\${baseUrl}\${url}\`,
          source: sourceName, author: "Unknown", artist: "Unknown"
        });
      }
    });
  }
  return results;
}`);

// FlameComics URL is /manga/ not /series/ now
code = code.replace(/"https:\/\/flamecomics.xyz\/series\/\?page=\${page}"/, '"https://flamecomics.xyz/manga/?page=${page}"');

// MangaFire
code = code.replace(/const titleEl = \$\(el\)\.find\("\.info a"\);/g, 'const titleEl = $(el).find("a");');

fs.writeFileSync('src/lib/scrapers/registry.ts', code);
