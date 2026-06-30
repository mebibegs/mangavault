const fs = require('fs');
let code = fs.readFileSync('src/lib/scrapers/registry.ts', 'utf8');

// FlameComics root browse page is actually /series according to standard, 
// let's try the generic homepage if the directory doesn't work, 
// or /browse as we saw in the links list.
code = code.replace(/https:\/\/flamecomics\.xyz\/manga\/\?page=\${page}/g, 'https://flamecomics.xyz/browse');

fs.writeFileSync('src/lib/scrapers/registry.ts', code);
