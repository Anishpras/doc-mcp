import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { setupDatabase } from './database.js';
import { handleMessage } from './handlers.js';
import { ServerConfig } from './types.js';

// Default configuration
const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  dataDir: path.join(process.cwd(), 'doc-mcp-data'),
  useVectors: false,
  vectorDimension: 1536,
  verbose: false,
  
  // Content filtering options
  removeImages: true,
  removeStyles: true,
  removeScripts: true,
  maxContentSize: 10 * 1024 * 1024 // 10MB
};

// Export the server start function
export async function startServer(config: Partial<ServerConfig> = {}): Promise<void> {
  // Merge provided config with defaults
  const serverConfig: ServerConfig = { ...DEFAULT_CONFIG, ...config };
  const { port, dataDir, useVectors, verbose } = serverConfig;
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Initialize Express app
  const app = express();
  const server = createServer(app);
  
  // Set up the database
  await setupDatabase(serverConfig);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server });
  
  // Store active connections
  const clients = new Set<WebSocket>();
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    if (verbose) console.log('Client connected');
    clients.add(ws);
    
    ws.on('message', async (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        
        if (verbose) {
          console.log('Received message:', JSON.stringify(parsedMessage, null, 2));
        }
        
        const response = await handleMessage(parsedMessage, serverConfig);
        
        if (verbose) {
          console.log('Sending response:', JSON.stringify(response, null, 2));
        }
        
        ws.send(JSON.stringify(response));
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message',
          details: error instanceof Error ? error.message : String(error)
        }));
      }
    });
    
    ws.on('close', () => {
      if (verbose) console.log('Client disconnected');
      clients.delete(ws);
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'info',
      message: 'Connected to Documentation MCP Server',
      serverInfo: {
        version: process.env.npm_package_version || '1.0.0',
        useVectors,
        dataDir
      }
    }));
  });
  
  // Set up basic Express routes
  app.use(express.json());
  
  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'Documentation MCP server is running',
      version: process.env.npm_package_version || '1.0.0'
    });
  });
  
  // API endpoint for documentation fetching
  app.post('/api/fetch', async (req, res) => {
    try {
      const { url, selector, forceRefresh } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      const response = await handleMessage({
        type: 'fetch_documentation',
        url,
        selector,
        forceRefresh
      }, serverConfig);
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch documentation', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // API endpoint for documentation retrieval
  app.get('/api/docs', async (req, res) => {
    try {
      const { url, id } = req.query;
      
      if (!url && !id) {
        return res.status(400).json({ error: 'Either URL or ID is required' });
      }
      
      const response = await handleMessage({
        type: 'get_documentation',
        url: url as string,
        documentId: id ? parseInt(id as string) : undefined
      }, serverConfig);
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to retrieve documentation', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // API endpoint for documentation search
  app.get('/api/search', async (req, res) => {
    try {
      const { query, limit } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const response = await handleMessage({
        type: 'search_documentation',
        query: query as string,
        limit: limit ? parseInt(limit as string) : undefined
      }, serverConfig);
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to search documentation', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Start the server
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`Doc MCP server listening on port ${port}`);
      resolve();
    });
    
    server.on('error', (error) => {
      reject(error);
    });
  });
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}
