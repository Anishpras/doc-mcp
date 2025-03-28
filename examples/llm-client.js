import WebSocket from 'ws';
import { Anthropic } from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // Make sure to set this in your environment
});

// Connect to the Doc MCP server
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to Doc MCP server');
  
  // Example: Fetch documentation for a URL
  fetchDocumentation('https://docs.anthropic.com/en/docs/');
});

ws.on('message', async (data) => {
  const response = JSON.parse(data.toString());
  console.log('Received response:', response.type);
  
  if (response.type === 'documentation_fetched') {
    // Documentation has been fetched, now get the content
    ws.send(JSON.stringify({
      type: 'get_documentation',
      url: response.url
    }));
  } else if (response.type === 'documentation') {
    // We have the documentation, now generate a response with Claude
    await generateResponse(response);
  } else if (response.type === 'error') {
    console.error('Error from server:', response.error, response.details);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from Doc MCP server');
});

// Function to fetch documentation for a URL
function fetchDocumentation(url) {
  console.log(`Fetching documentation for ${url}`);
  
  ws.send(JSON.stringify({
    type: 'fetch_documentation',
    url,
    selector: 'main', // Customize selector based on the site structure
    forceRefresh: false
  }));
}

// Function to search documentation
function searchDocumentation(query) {
  console.log(`Searching documentation for "${query}"`);
  
  ws.send(JSON.stringify({
    type: 'search_documentation',
    query,
    limit: 5
  }));
}

// Function to generate a response using Claude
async function generateResponse(documentation) {
  console.log('Generating response with Claude...');
  
  try {
    // Prepare a system prompt with the documentation context
    const systemPrompt = `You are an assistant that has access to the following documentation:
Title: ${documentation.title}

Here are some relevant sections from the documentation:
${documentation.chunks.slice(0, 5).map(chunk => chunk.content).join('\n\n')}

Please provide concise and accurate answers based on this documentation.`;
    
    // Example user query
    const userQuery = "How do I authenticate with the API?";
    
    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      system: systemPrompt,
      messages: [
        { role: "user", content: userQuery }
      ],
      max_tokens: 1000
    });
    
    console.log('Claude response:');
    console.log(response.content[0].text);
  } catch (error) {
    console.error('Error generating response with Claude:', error);
  }
}

// Example usage
// fetchDocumentation('https://docs.anthropic.com/en/docs/');
// searchDocumentation('rate limits');

// Start the example flow when running this script directly
if (require.main === module) {
  console.log('Starting example client...');
  // Connection to the server is handled by the 'open' event
}
