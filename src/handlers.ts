import { fetchDocumentation } from './fetcher.js';
import { parseDocumentation } from './parser.js';
import { 
  addOrUpdateSource, 
  addOrUpdateDocument,
  addChunk,
  getDocumentByUrl,
  getDocumentById,
  searchDocuments,
  getChunks,
  listDocuments
} from './database.js';
import crypto from 'crypto';
import { 
  MCPMessage, 
  MCPResponse, 
  ServerConfig,
  FetchDocumentationMessage,
  GetDocumentationMessage,
  SearchDocumentationMessage,
  ListDocumentationMessage,
  ErrorResponse
} from './types.js';

// Main message handler for the MCP
export async function handleMessage(message: MCPMessage, config: ServerConfig): Promise<MCPResponse> {
  const { type } = message;

  switch (type) {
    case 'fetch_documentation':
      return handleFetchDocumentation(message as FetchDocumentationMessage, config);
    
    case 'get_documentation':
      return handleGetDocumentation(message as GetDocumentationMessage, config);
    
    case 'search_documentation':
      return handleSearchDocumentation(message as SearchDocumentationMessage, config);
      
    case 'list_documentation':
      return handleListDocumentation(message as ListDocumentationMessage, config);
    
    default:
      return {
        type: 'error',
        error: 'Unknown message type',
        details: `Message type '${type}' is not supported`
      };
  }
}

// Handler for fetching new documentation
async function handleFetchDocumentation(
  message: FetchDocumentationMessage, 
  config: ServerConfig
): Promise<MCPResponse> {
  const { url, selector, forceRefresh = false } = message;
  const { verbose } = config;
  
  try {
    // Check if we already have this document and it's not a forced refresh
    if (!forceRefresh) {
      const existingDoc = await getDocumentByUrl(url);
      if (existingDoc) {
        return {
          type: 'documentation_fetched',
          status: 'success',
          message: 'Documentation already exists',
          url,
          documentId: existingDoc.id,
          cached: true
        };
      }
    }

    if (verbose) console.log(`Fetching documentation from ${url}`);
    
    // Fetch the documentation with content cleaning
    const htmlContent = await fetchDocumentation(url, config);
    
    // Parse the content with content cleaning
    const { title, content, sections } = await parseDocumentation(htmlContent, selector, config);
    
    // Create a hash of the content to detect changes
    const contentHash = crypto
      .createHash('md5')
      .update(content)
      .digest('hex');
    
    // Store the source
    const sourceId = await addOrUpdateSource(url, title);
    
    // Store the document
    const documentId = await addOrUpdateDocument(
      sourceId,
      '', // Main path is empty
      title,
      content,
      contentHash
    );
    
    // Store each section as a chunk
    for (let i = 0; i < sections.length; i++) {
      const { heading, content: sectionContent } = sections[i];
      await addChunk(documentId, i, sectionContent);
    }
    
    if (verbose) {
      console.log(`Stored documentation: ${title} with ${sections.length} sections`);
    }
    
    return {
      type: 'documentation_fetched',
      status: 'success',
      message: 'Documentation fetched and stored successfully',
      url,
      documentId,
      title,
      sectionCount: sections.length
    };
  } catch (error) {
    console.error('Error fetching documentation:', error);
    const errorResponse: ErrorResponse & { url?: string } = {
      type: 'error',
      error: 'Failed to fetch documentation',
      details: error instanceof Error ? error.message : String(error)
    };
    
    // Add url as an extra property for debugging
    errorResponse.url = url;
    
    return errorResponse;
  }
}

// Handler for retrieving existing documentation
async function handleGetDocumentation(
  message: GetDocumentationMessage,
  config: ServerConfig
): Promise<MCPResponse> {
  const { url, documentId } = message;
  const { verbose } = config;
  
  try {
    let doc;
    if (documentId) {
      doc = await getDocumentById(documentId);
    } else if (url) {
      doc = await getDocumentByUrl(url);
    } else {
      return {
        type: 'error',
        error: 'Missing parameters',
        details: 'Either url or documentId must be provided'
      };
    }
    
    if (!doc) {
      return {
        type: 'error',
        error: 'Not found',
        details: 'Documentation not found'
      };
    }
    
    // Get the chunks
    const chunks = await getChunks(doc.id);
    
    if (verbose) {
      console.log(`Retrieved document: ${doc.title} with ${chunks.length} chunks`);
    }
    
    return {
      type: 'documentation',
      documentId: doc.id,
      title: doc.title || 'Untitled',
      content: doc.content,
      chunks,
      url: doc.path ? `${url}/${doc.path}` : url
    };
  } catch (error) {
    console.error('Error getting documentation:', error);
    return {
      type: 'error',
      error: 'Failed to get documentation',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Handler for searching documentation
async function handleSearchDocumentation(
  message: SearchDocumentationMessage,
  config: ServerConfig
): Promise<MCPResponse> {
  const { query, limit = 10, semantic = false } = message;
  const { verbose, useVectors } = config;
  
  if (!query) {
    return {
      type: 'error',
      error: 'Missing query',
      details: 'A search query must be provided'
    };
  }
  
  try {
    // If semantic search is requested but vectors are disabled, inform the user
    const useSemantic = semantic && useVectors;
    if (semantic && !useVectors) {
      console.warn('Semantic search requested but vector storage is disabled. Falling back to text search.');
    }
    
    // For semantic search, we would need to generate an embedding for the query
    // This is placeholder - in a real implementation, you would use an embedding model
    let embedding: number[] | undefined;
    if (useSemantic) {
      // This is just a placeholder - you'd need to implement embedding generation
      // embedding = await generateEmbedding(query);
    }
    
    const results = await searchDocuments(query, limit, useSemantic, embedding);
    
    if (verbose) {
      console.log(`Search for "${query}" returned ${results.length} results${useSemantic ? ' using semantic search' : ''}`);
    }
    
    return {
      type: 'search_results',
      query,
      results,
      semantic: useSemantic
    };
  } catch (error) {
    console.error('Error searching documentation:', error);
    return {
      type: 'error',
      error: 'Failed to search documentation',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Handler for listing available documentation
async function handleListDocumentation(
  message: ListDocumentationMessage,
  config: ServerConfig
): Promise<MCPResponse> {
  const { limit = 20, offset = 0 } = message;
  const { verbose } = config;
  
  try {
    const { documents, total } = await listDocuments(limit, offset);
    
    if (verbose) {
      console.log(`Listed ${documents.length} documents (total: ${total})`);
    }
    
    return {
      type: 'documentation_list',
      documents,
      total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error listing documentation:', error);
    return {
      type: 'error',
      error: 'Failed to list documentation',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
