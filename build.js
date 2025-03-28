#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';

// Run TypeScript compiler
console.log("Running TypeScript compiler...");
const tsc = spawn('tsc', [], { shell: true, stdio: 'inherit' });

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error(`TypeScript compilation failed with code ${code}`);
    process.exit(code);
  }
  
  console.log("TypeScript compilation completed successfully.");
  console.log("Post-processing files for ESM compatibility...");
  
  // Post-process generated files for ESM compatibility
  fixESMImports();
});

function fixESMImports() {
  try {
    // Fix cheerio and turndown imports in parser.js
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
  } catch (error) {
    console.error("Error during post-processing:", error);
    process.exit(1);
  }
}
