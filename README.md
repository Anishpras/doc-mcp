# Documentation MCP

An MCP (Multi-modal Communication Protocol) server for Claude and other LLMs that fetches, parses, stores, and serves documentation. This server allows LLMs to access documentation in a structured format, similar to how Cursor Editor provides context to code assistants.

## Features

- **Fetch Documentation**: Retrieve HTML content from documentation websites
- **Parse Content**: Convert HTML to Markdown for better LLM processing
- **Local Storage**: Store all documentation locally in SQLite
- **Vector Search**: Optional vector storage for semantic search
- **WebSocket API**: Real-time communication with LLMs
- **REST API**: HTTP endpoints for integration with applications
- **CLI Interface**: Easy to use command-line interface

## Installation

You can use this MCP server directly with npx:

```bash
npx @anishpras/doc-mcp
```

Or install it globally:

```bash
npm install -g @anishpras/doc-mcp
doc-mcp
```

## Usage

### Command Line Options

```
Usage: doc-mcp [options]

Documentation MCP server for fetching and storing documentation for LLMs

Options:
  -V, --version           output the version number
  -p, --port <number>     Port to run the server on (default: auto-detect free port)
  -d, --data <path>       Path to store data (default: ./doc-mcp-data)
  -v, --vectors           Enable vector storage for semantic search (default: false)
  --dimension <number>    Vector dimension for embeddings (default: 1536)
  --verbose               Enable verbose logging (default: false)
  -h, --help              display help for command
```

### Integrating with Claude Desktop

To use this MCP with Claude Desktop or other LLM applications, add the following configuration to your MCP settings:

```json
{
  "documentation-mcp": {
    "command": "npx",
    "args": ["@anishpras/doc-mcp"]
  }
}
```

## MCP Protocol

The Documentation MCP supports the following message types:

### Fetching Documentation

Fetch and store documentation from a URL:

```json
{
  "type": "fetch_documentation",
  "url": "https://example.com/docs",
  "selector": "main", // Optional CSS selector
  "forceRefresh": false // Optional, set to true to re-fetch
}
```

Response:

```json
{
  "type": "documentation_fetched",
  "status": "success",
  "message": "Documentation fetched and stored successfully",
  "url": "https://example.com/docs",
  "documentId": 1,
  "title": "Example Documentation",
  "sectionCount": 10
}
```

### Getting Documentation

Retrieve stored documentation:

```json
{
  "type": "get_documentation",
  "url": "https://example.com/docs"
  // alternatively, you can use documentId
  // "documentId": 1
}
```

Response:

```json
{
  "type": "documentation",
  "documentId": 1,
  "title": "Example Documentation",
  "content": "Full markdown content...",
  "chunks": [
    {
      "index": 0,
      "content": "Section content..."
    },
    // More chunks...
  ]
}
```

### Searching Documentation

Search for documentation by keyword:

```json
{
  "type": "search_documentation",
  "query": "api authentication",
  "limit": 10, // Optional
  "semantic": false // Optional, set to true for vector search
}
```

Response:

```json
{
  "type": "search_results",
  "query": "api authentication",
  "results": [
    {
      "id": 1,
      "title": "Authentication Guide",
      "path": "",
      "url": "https://example.com/docs/auth",
      "snippet": "API authentication requires..."
    },
    // More results...
  ]
}
```

### Listing Documentation

List all available documentation:

```json
{
  "type": "list_documentation",
  "limit": 20, // Optional
  "offset": 0 // Optional
}
```

Response:

```json
{
  "type": "documentation_list",
  "documents": [
    {
      "id": 1,
      "title": "Example Documentation",
      "url": "https://example.com/docs",
      "path": "",
      "updated_at": "2023-01-01T00:00:00.000Z",
      "chunk_count": 10
    },
    // More documents...
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

## REST API

The server also provides a REST API for HTTP-based integrations:

- `GET /health` - Check if the server is running
- `POST /api/fetch` - Fetch documentation from a URL
- `GET /api/docs` - Retrieve stored documentation
- `GET /api/search` - Search for documentation

## Example Client Usage

Here's how to connect to the MCP from a client application:

```javascript
const socket = new WebSocket('ws://localhost:3000');

// Listen for messages
socket.addEventListener('message', (event) => {
  const response = JSON.parse(event.data);
  console.log('Received response:', response);
});

// Connect and send a message
socket.addEventListener('open', () => {
  // Fetch documentation
  socket.send(JSON.stringify({
    type: 'fetch_documentation',
    url: 'https://docs.example.com/api'
  }));
});
```

## Development

If you want to modify or contribute to this project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the TypeScript code: `npm run build`
4. Run the development server: `npm run dev`

## License

MIT
# doc-mcp
