import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Amazon Titan Embeddings model
const EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0';
const EMBEDDING_DIMENSION = 1024; // Titan v2 produces 1024-dimensional vectors

/**
 * Generate embedding for a single text using Amazon Titan
 */
export async function generateEmbedding(text) {
  // Truncate text to stay within token limits (Titan supports ~8k tokens)
  const truncatedText = text.slice(0, 8000);

  const command = new InvokeModelCommand({
    modelId: EMBEDDING_MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: truncatedText,
      dimensions: EMBEDDING_DIMENSION,
      normalize: true, // Pre-normalize for cosine similarity
    }),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  return result.embedding;
}

/**
 * Generate embedding for a paper using title + abstract
 */
export async function generatePaperEmbedding(paper) {
  // Combine title and abstract for richer semantic representation
  const text = `${paper.title}\n\n${paper.abstract}`;
  return generateEmbedding(text);
}

export { EMBEDDING_DIMENSION };
