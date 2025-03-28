#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import portfinder from 'portfinder';
import dotenv from 'dotenv';
import { startServer } from './index.js';
import fs from 'fs';

// Load environment variables from .env file if present
dotenv.config();

// Get the package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version info
let packageVersion = '1.0.0';
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
  packageVersion = packageJson.version || '1.0.0';
} catch (err) {
  console.warn('Could not read package.json. Using default version.');
}

const program = new Command();

program
  .name('doc-mcp')
  .description('Documentation MCP server for fetching and storing documentation for LLMs')
  .version(packageVersion)
  .option('-p, --port <number>', 'Port to run the server on (default: auto-detect free port)')
  .option('-d, --data <path>', 'Path to store data', path.join(process.cwd(), 'doc-mcp-data'))
  .option('-v, --vectors', 'Enable vector storage for semantic search', false)
  .option('--dimension <number>', 'Vector dimension for embeddings', '1536')
  .option('--verbose', 'Enable verbose logging', false)
  .action(async (options) => {
    const port = options.port ? parseInt(options.port) : await portfinder.getPortPromise({ port: 3000 });
    
    console.log(chalk.cyan.bold('\n📚 Documentation MCP Server'));
    console.log(chalk.cyan(`Version: ${packageVersion}`));
    
    // Log configuration
    console.log(chalk.yellow('\nConfiguration:'));
    console.log(`- Port: ${port}`);
    console.log(`- Data directory: ${options.data}`);
    console.log(`- Vector storage: ${options.vectors ? 'Enabled' : 'Disabled'}`);
    if (options.vectors) {
      console.log(`- Vector dimension: ${options.dimension}`);
    }
    console.log(`- Verbose logging: ${options.verbose ? 'Enabled' : 'Disabled'}\n`);
    
    // Start the server
    try {
      await startServer({
        port,
        dataDir: options.data,
        useVectors: options.vectors,
        vectorDimension: parseInt(options.dimension),
        verbose: options.verbose
      });
      
      console.log(chalk.green(`\n✅ Server started successfully!`));
      console.log(chalk.cyan(`\nWebSocket endpoint: ws://localhost:${port}`));
      console.log(chalk.cyan(`HTTP endpoint: http://localhost:${port}`));
      console.log(chalk.cyan(`\nUse Ctrl+C to stop the server`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to start server: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);
