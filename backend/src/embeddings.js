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

/**
 * Calculate cosine similarity between two embedding vectors
 * Vectors are pre-normalized by Titan, so dot product = cosine similarity
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  return dotProduct;
}

/**
 * Find top K similar papers using embedding cosine similarity
 */
export function findSimilarByEmbedding(targetPaper, allPapers, topK = 3) {
  if (!targetPaper.embedding) {
    return [];
  }

  const similarities = allPapers
    .filter(p => p.id !== targetPaper.id && p.embedding)
    .map(p => ({
      paper: p,
      score: cosineSimilarity(targetPaper.embedding, p.embedding),
    }))
    .filter(s => s.score > 0.3) // Minimum similarity threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return similarities.map(s => ({
    ...s.paper,
    similarityScore: s.score,
  }));
}

/**
 * Batch generate embeddings for multiple papers
 * Processes sequentially with delay to respect rate limits
 */
export async function generatePaperEmbeddings(papers, delayMs = 200) {
  const results = [];

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];

    try {
      const embedding = await generatePaperEmbedding(paper);
      results.push({ ...paper, embedding });
      console.log(`Generated embedding ${i + 1}/${papers.length}: ${paper.title.slice(0, 40)}...`);
    } catch (error) {
      console.error(`Failed to generate embedding for ${paper.id}:`, error.message);
      results.push(paper); // Keep paper without embedding
    }

    // Rate limiting delay
    if (i < papers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

export { EMBEDDING_DIMENSION };
