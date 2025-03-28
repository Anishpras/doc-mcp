// Server configuration
export interface ServerConfig {
  port: number;
  dataDir: string;
  useVectors: boolean;
  vectorDimension: number;
  verbose: boolean;
  
  // Content filtering options
  removeImages: boolean; // Remove img, svg, canvas, etc.
  removeStyles: boolean; // Remove style tags and attributes
  removeScripts: boolean; // Remove script tags
  maxContentSize: number; // Maximum content size in bytes
}

// MCP Message interfaces
export interface BaseMCPMessage {
  type: string;
}

export interface FetchDocumentationMessage extends BaseMCPMessage {
  type: 'fetch_documentation';
  url: string;
  selector?: string;
  forceRefresh?: boolean;
}

export interface GetDocumentationMessage extends BaseMCPMessage {
  type: 'get_documentation';
  url?: string;
  documentId?: number;
}

export interface SearchDocumentationMessage extends BaseMCPMessage {
  type: 'search_documentation';
  query: string;
  limit?: number;
  semantic?: boolean;
}

export interface ListDocumentationMessage extends BaseMCPMessage {
  type: 'list_documentation';
  limit?: number;
  offset?: number;
}

export type MCPMessage = 
  | FetchDocumentationMessage
  | GetDocumentationMessage
  | SearchDocumentationMessage
  | ListDocumentationMessage;

// MCP Response interfaces
export interface BaseMCPResponse {
  type: string;
}

export interface ErrorResponse extends BaseMCPResponse {
  type: 'error';
  error: string;
  details?: string;
}

export interface InfoResponse extends BaseMCPResponse {
  type: 'info';
  message: string;
  serverInfo?: {
    version: string;
    useVectors: boolean;
    dataDir: string;
  };
}

export interface DocumentationFetchedResponse extends BaseMCPResponse {
  type: 'documentation_fetched';
  status: 'success' | 'failure';
  message: string;
  url: string;
  documentId?: number;
  title?: string;
  sectionCount?: number;
  cached?: boolean;
}

export interface DocumentationResponse extends BaseMCPResponse {
  type: 'documentation';
  documentId: number;
  title: string;
  content: string;
  chunks: DocumentChunk[];
  url?: string;
}

export interface SearchResultsResponse extends BaseMCPResponse {
  type: 'search_results';
  query: string;
  results: SearchResult[];
  semantic?: boolean;
}

export interface ListDocumentationResponse extends BaseMCPResponse {
  type: 'documentation_list';
  documents: DocumentListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type MCPResponse = 
  | ErrorResponse
  | InfoResponse
  | DocumentationFetchedResponse
  | DocumentationResponse
  | SearchResultsResponse
  | ListDocumentationResponse;

// Database models
export interface Source {
  id: number;
  url: string;
  title: string | null;
  last_fetched: string;
}

export interface Document {
  id: number;
  source_id: number;
  path: string;
  title: string | null;
  content: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  index: number;
  content: string;
  embedding?: number[];
}

export interface SearchResult {
  id: number;
  title: string;
  path: string;
  url: string;
  snippet?: string;
  score?: number;
}

export interface DocumentListItem {
  id: number;
  title: string;
  url: string;
  path: string;
  updated_at: string;
  chunk_count: number;
}

// Documentation parsing related types
export interface ParsedDocumentation {
  title: string;
  content: string;
  sections: Section[];
}

export interface Section {
  heading: string;
  content: string;
}
