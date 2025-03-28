/**
 * This module provides mock embedding functionality.
 * In a production environment, you would replace this with a real embedding model
 * like OpenAI's text-embedding-ada-002 or a local model.
 */

/**
 * Generate a mock embedding vector for text
 * @param text The text to embed
 * @param dimension The dimension of the embedding vector
 * @returns A vector of the specified dimension
 */
export async function generateEmbedding(text: string, dimension: number = 1536): Promise<number[]> {
  // This is a mock function that generates random vectors
  // In a real implementation, you would call an embedding model API
  
  // For deterministic results based on the text content,
  // we'll use a simple hash function to seed the values
  const hash = simpleHash(text);
  
  // Generate a vector with values between -1 and 1
  const vector: number[] = [];
  for (let i = 0; i < dimension; i++) {
    // Use hash and position to generate a pseudo-random but deterministic value
    const value = Math.sin(hash * (i + 1)) / 2 + 0.5; // Map to [0, 1]
    vector.push(value);
  }
  
  // Normalize the vector (very important for cosine similarity)
  return normalizeVector(vector);
}

/**
 * Simple hash function to create a numeric hash from text
 */
function simpleHash(text: string): number {
  let hash = 0;
  if (text.length === 0) return hash;
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash;
}

/**
 * Normalize a vector to unit length (for cosine similarity)
 */
function normalizeVector(vector: number[]): number[] {
  // Calculate the magnitude (length) of the vector
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );
  
  // Avoid division by zero
  if (magnitude === 0) return vector.map(() => 0);
  
  // Normalize each component
  return vector.map(val => val / magnitude);
}

/**
 * Calculate the cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }
  
  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  
  // Cosine similarity is the dot product of unit vectors
  // Since we're already normalizing the vectors, we can just return the dot product
  return dotProduct;
}
