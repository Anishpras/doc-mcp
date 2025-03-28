import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { HierarchicalNSW } from 'hnswlib-node';
import { 
  ServerConfig, 
  Document, 
  DocumentChunk, 
  SearchResult, 
  DocumentListItem 
} from './types.js';

let db: any;
let vectorIndex: HierarchicalNSW | null = null;
let serverConfig: ServerConfig;

export async function setupDatabase(config: ServerConfig): Promise<void> {
  serverConfig = config;
  const { dataDir, useVectors, vectorDimension, verbose } = config;
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Create vector index directory if needed
  const vectorDir = path.join(dataDir, 'vectors');
  if (useVectors && !fs.existsSync(vectorDir)) {
    fs.mkdirSync(vectorDir, { recursive: true });
  }
  
  // Initialize SQLite database
  db = await open({
    filename: path.join(dataDir, 'documentation.db'),
    driver: sqlite3.Database
  });
  
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      title TEXT,
      last_fetched TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER,
      path TEXT,
      title TEXT,
      content TEXT,
      content_hash TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES sources(id),
      UNIQUE(source_id, path)
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      chunk_index INTEGER,
      content TEXT,
      has_embedding BOOLEAN DEFAULT 0,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      UNIQUE(document_id, chunk_index)
    );

    CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
    CREATE INDEX IF NOT EXISTS idx_documents_source_id ON documents(source_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
  `);
  
  // Initialize vector search if enabled
  if (useVectors) {
    const indexPath = path.join(vectorDir, 'hnsw.index');
    
    try {
      if (fs.existsSync(indexPath)) {
        if (verbose) console.log('Loading existing vector index');
        vectorIndex = new HierarchicalNSW('cosine', vectorDimension);
        vectorIndex.readIndexSync(indexPath);
        if (verbose) console.log(`Loaded vector index with ${vectorIndex.getCurrentCount()} vectors`);
      } else {
        if (verbose) console.log('Creating new vector index');
        vectorIndex = new HierarchicalNSW('cosine', vectorDimension);
        // We'll save the index when we add vectors to it
      }
    } catch (error) {
      console.error('Error initializing vector index:', error);
      console.log('Creating new vector index due to error with existing one');
      vectorIndex = new HierarchicalNSW('cosine', vectorDimension);
    }
  }
  
  if (verbose) console.log('Database setup complete');
}

export async function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase first.');
  }
  return db;
}

// Source management
export async function addOrUpdateSource(url: string, title: string | null): Promise<number> {
  const db = await getDatabase();
  const result = await db.run(
    `INSERT INTO sources (url, title, last_fetched) 
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(url) DO UPDATE SET
     title = COALESCE(?, title),
     last_fetched = CURRENT_TIMESTAMP`,
    [url, title, title]
  );
  return result.lastID || await getSourceIdByUrl(url);
}

export async function getSourceIdByUrl(url: string): Promise<number | null> {
  const db = await getDatabase();
  const source = await db.get('SELECT id FROM sources WHERE url = ?', [url]);
  return source ? source.id : null;
}

// Document management
export async function addOrUpdateDocument(
  sourceId: number, 
  path: string, 
  title: string | null, 
  content: string, 
  contentHash: string
): Promise<number> {
  const db = await getDatabase();
  const result = await db.run(
    `INSERT INTO documents (source_id, path, title, content, content_hash, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(source_id, path) DO UPDATE SET
     title = COALESCE(?, title),
     content = ?,
     content_hash = ?,
     updated_at = CURRENT_TIMESTAMP`,
    [sourceId, path, title, content, contentHash, title, content, contentHash]
  );
  return result.lastID || await getDocumentId(sourceId, path);
}

export async function getDocumentId(sourceId: number, path: string): Promise<number | null> {
  const db = await getDatabase();
  const doc = await db.get(
    'SELECT id FROM documents WHERE source_id = ? AND path = ?',
    [sourceId, path]
  );
  return doc ? doc.id : null;
}

export async function getDocumentByUrl(url: string, path: string = ''): Promise<Document | null> {
  const db = await getDatabase();
  return db.get(
    `SELECT d.* FROM documents d
     JOIN sources s ON d.source_id = s.id
     WHERE s.url = ? AND d.path = ?`,
    [url, path]
  );
}

export async function getDocumentById(id: number): Promise<Document | null> {
  const db = await getDatabase();
  return db.get('SELECT * FROM documents WHERE id = ?', [id]);
}

export async function listDocuments(limit: number = 20, offset: number = 0): Promise<{ documents: DocumentListItem[], total: number }> {
  const db = await getDatabase();
  
  const total = await db.get('SELECT COUNT(*) as count FROM documents');
  
  const documents = await db.all(
    `SELECT d.id, d.title, d.path, d.updated_at, s.url,
     (SELECT COUNT(*) FROM chunks WHERE document_id = d.id) as chunk_count
     FROM documents d
     JOIN sources s ON d.source_id = s.id
     ORDER BY d.updated_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  return {
    documents,
    total: total.count
  };
}

// Chunk management
export async function addChunk(
  documentId: number, 
  chunkIndex: number, 
  content: string, 
  embedding?: number[]
): Promise<number> {
  const db = await getDatabase();
  const result = await db.run(
    `INSERT INTO chunks (document_id, chunk_index, content, has_embedding)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(document_id, chunk_index) DO UPDATE SET
     content = ?,
     has_embedding = ?`,
    [
      documentId, 
      chunkIndex, 
      content, 
      embedding ? 1 : 0,
      content,
      embedding ? 1 : 0
    ]
  );
  
  const chunkId = result.lastID || await getChunkId(documentId, chunkIndex);
  
  // If we have a vector index and embedding, add it to the index
  if (vectorIndex && embedding && chunkId) {
    try {
      // The vector index uses sequential IDs, but we want to use the actual chunkId
      // Create a mapping from chunkId to vector index
      const label = chunkId;
      
      // Add or update the vector
      try {
        // Use any to work around missing TypeScript definition
        (vectorIndex as any).removePoint(label);
      } catch (e) {
        // Point doesn't exist yet, that's fine
      }
      
      // Add the new vector
      vectorIndex.addPoint(embedding, label);
      
      // Save the index
      const indexPath = path.join(serverConfig.dataDir, 'vectors', 'hnsw.index');
      vectorIndex.writeIndexSync(indexPath);
      
      if (serverConfig.verbose) {
        console.log(`Added vector for chunk ${chunkId} to index, total vectors: ${vectorIndex.getCurrentCount()}`);
      }
    } catch (error) {
      console.error(`Error adding vector for chunk ${chunkId}:`, error);
    }
  }
  
  return chunkId;
}

async function getChunkId(documentId: number, chunkIndex: number): Promise<number | null> {
  const db = await getDatabase();
  const chunk = await db.get(
    'SELECT id FROM chunks WHERE document_id = ? AND chunk_index = ?',
    [documentId, chunkIndex]
  );
  return chunk ? chunk.id : null;
}

export async function getChunks(documentId: number): Promise<DocumentChunk[]> {
  const db = await getDatabase();
  const chunks = await db.all(
    'SELECT id, chunk_index, content, has_embedding FROM chunks WHERE document_id = ? ORDER BY chunk_index',
    [documentId]
  );
  
  return chunks.map((c: any) => ({
    index: c.chunk_index,
    content: c.content
  }));
}

// Search functionality
export async function searchDocuments(
  query: string, 
  limit: number = 10, 
  semantic: boolean = false,
  embedding?: number[]
): Promise<SearchResult[]> {
  const db = await getDatabase();
  
  // If semantic search is requested, vector index is enabled, and we have an embedding
  if (semantic && vectorIndex && embedding) {
    try {
      // Perform vector search
      const results = vectorIndex.searchKnn(embedding, limit);
      const { distances, neighbors } = results;
      
      // Get the chunks by IDs
      const chunkResults = await Promise.all(
        neighbors.map(async (chunkId: number, i: number) => {
          const chunk = await db.get(
            `SELECT c.id, c.content, c.document_id, d.title, d.path, s.url 
             FROM chunks c
             JOIN documents d ON c.document_id = d.id
             JOIN sources s ON d.source_id = s.id
             WHERE c.id = ?`,
            [chunkId]
          );
          
          if (!chunk) return null;
          
          // Convert cosine distance to similarity score (0-100)
          const score = Math.round((1 - distances[i]) * 100);
          
          // Extract a snippet
          const snippet = chunk.content.length > 200 
            ? chunk.content.substring(0, 200) + '...' 
            : chunk.content;
          
          return {
            id: chunk.document_id,
            title: chunk.title,
            path: chunk.path,
            url: chunk.url,
            snippet,
            score
          };
        })
      );
      
      // Filter out null results and return
      return chunkResults.filter(r => r !== null) as SearchResult[];
    } catch (error) {
      console.error('Error performing vector search:', error);
      // Fall back to text search if vector search fails
    }
  }
  
  // Perform text-based search
  return db.all(
    `SELECT d.id, d.title, d.path, s.url,
     (SELECT c.content FROM chunks c WHERE c.document_id = d.id ORDER BY c.chunk_index LIMIT 1) as snippet
     FROM documents d
     JOIN sources s ON d.source_id = s.id
     WHERE d.title LIKE ? OR d.content LIKE ?
     ORDER BY 
       CASE 
         WHEN d.title LIKE ? THEN 1 
         ELSE 2 
       END
     LIMIT ?`,
    [`%${query}%`, `%${query}%`, `%${query}%`, limit]
  );
}
