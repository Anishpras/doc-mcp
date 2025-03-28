// Example client for the Documentation MCP
// This is a simple Node.js script to demonstrate how to connect to the MCP

// Import WebSocket module
import WebSocket from 'ws';

// URL to the Documentation MCP WebSocket server
const WS_URL = 'ws://localhost:3000';

// Connect to the MCP server
const connectToMCP = () => {
  console.log(`Connecting to ${WS_URL}...`);
  const socket = new WebSocket(WS_URL);

  // Handle connection open
  socket.on('open', () => {
    console.log('Connected to Documentation MCP server');
    
    // Send a message to fetch documentation
    fetchDocumentation(socket, 'https://docs.anthropic.com/claude/docs');
  });

  // Handle incoming messages
  socket.on('message', (data) => {
    const response = JSON.parse(data);
    console.log(`Received message of type: ${response.type}`);
    
    // Handle different response types
    switch (response.type) {
      case 'info':
        console.log(`Server info: ${response.message}`);
        console.log(`Server version: ${response.serverInfo?.version}`);
        break;
        
      case 'documentation_fetched':
        console.log(`Documentation fetched: ${response.title}`);
        console.log(`Document ID: ${response.documentId}`);
        
        // Now get the document content
        getDocumentation(socket, response.documentId);
        break;
        
      case 'documentation':
        console.log(`Retrieved document: ${response.title}`);
        console.log(`${response.chunks.length} chunks available`);
        
        // Display the first chunk
        if (response.chunks.length > 0) {
          console.log('\nFirst chunk content:');
          console.log('-'.repeat(40));
          console.log(response.chunks[0].content.substring(0, 200) + '...');
          console.log('-'.repeat(40));
        }
        
        // Now try a search
        searchDocumentation(socket, 'api');
        break;
        
      case 'search_results':
        console.log(`Search results for "${response.query}":`);
        response.results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
          if (result.snippet) {
            console.log(`   ${result.snippet.substring(0, 100)}...`);
          }
        });
        
        // Finally, list all documentation
        listDocumentation(socket);
        break;
        
      case 'documentation_list':
        console.log(`Available documentation (${response.total} total):`);
        response.documents.forEach((doc, index) => {
          console.log(`${index + 1}. ${doc.title} (${doc.chunk_count} chunks)`);
          console.log(`   URL: ${doc.url}`);
        });
        break;
        
      case 'error':
        console.error(`Error: ${response.error}`);
        if (response.details) {
          console.error(`Details: ${response.details}`);
        }
        break;
        
      default:
        console.log('Full response:', response);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Handle disconnection
  socket.on('close', () => {
    console.log('Disconnected from server');
    // Reconnect after a delay
    setTimeout(() => connectToMCP(), 5000);
  });

  return socket;
};

// Function to fetch documentation
const fetchDocumentation = (socket, url) => {
  console.log(`Fetching documentation from ${url}...`);
  socket.send(JSON.stringify({
    type: 'fetch_documentation',
    url,
    forceRefresh: false
  }));
};

// Function to get documentation
const getDocumentation = (socket, documentId) => {
  console.log(`Getting documentation with ID ${documentId}...`);
  socket.send(JSON.stringify({
    type: 'get_documentation',
    documentId
  }));
};

// Function to search documentation
const searchDocumentation = (socket, query) => {
  console.log(`Searching for "${query}"...`);
  socket.send(JSON.stringify({
    type: 'search_documentation',
    query,
    limit: 5
  }));
};

// Function to list all documentation
const listDocumentation = (socket) => {
  console.log('Listing all documentation...');
  socket.send(JSON.stringify({
    type: 'list_documentation',
    limit: 10,
    offset: 0
  }));
};

// Start the client
connectToMCP();
