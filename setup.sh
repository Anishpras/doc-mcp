#!/bin/bash

# Create data directory if it doesn't exist
mkdir -p data

# Install dependencies
npm install

# Create a .env file for configuration
cat > .env << EOL
PORT=3000
ANTHROPIC_API_KEY=your_api_key_here
EOL

echo "Setup complete! Edit .env to add your API keys."
echo "Run 'npm start' to start the server."
