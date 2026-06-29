const fs = require('fs');

let ns = fs.readFileSync('src/lib/scrapers/new-sources.ts', 'utf8');
ns = ns.replace(/import \{ registerScraper \} from "\.\/registry";/g, '');
fs.writeFileSync('src/lib/scrapers/new-sources.ts', ns);

let reg = fs.readFileSync('src/lib/scrapers/registry.ts', 'utf8');
reg = reg.replace(/import "\.\/new-sources";/g, '');
reg += '\n\n' + ns;
fs.writeFileSync('src/lib/scrapers/registry.ts', reg);

fs.unlinkSync('src/lib/scrapers/new-sources.ts');
