#!/usr/bin/env node

import { spawn } from 'child_process';

// Run TypeScript compiler with skipLibCheck to bypass library type issues
console.log("Running TypeScript compiler...");
const tsc = spawn('tsc', ['--skipLibCheck'], { shell: true, stdio: 'inherit' });

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error(`TypeScript compilation failed with code ${code}`);
    process.exit(code);
  }
  
  console.log("TypeScript compilation completed successfully.");
});
