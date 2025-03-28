#!/usr/bin/env node

import fs from 'fs';

console.log("Post-processing files for ESM compatibility...");

// Fix problematic imports in parser.js
const parserPath = './dist/parser.js';
if (fs.existsSync(parserPath)) {
  let parserContent = fs.readFileSync(parserPath, 'utf8');
  
  // Replace problematic imports with dynamic imports
  parserContent = parserContent.replace(
    /import\s+cheerio\s+from\s+['"]cheerio['"];/,
    `import * as cheerioModule from 'cheerio';
const cheerio = cheerioModule.default || cheerioModule;`
  );
  
  parserContent = parserContent.replace(
    /import\s+TurndownService\s+from\s+['"]turndown['"];/,
    `import * as turndownModule from 'turndown';
const TurndownService = turndownModule.default || turndownModule;`
  );
  
  fs.writeFileSync(parserPath, parserContent, 'utf8');
  console.log("Fixed ESM imports in parser.js");
}

console.log("Post-processing completed successfully.");
