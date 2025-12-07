/**
 * Paper similarity using vector embeddings with tag-based fallback
 */

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
 * Calculate tag-based similarity score (legacy fallback)
 * Tags match = 2 points each, Category match = 1 point each
 */
function calculateTagSimilarity(paperA, paperB) {
  let score = 0;

  // Tag matching (weighted 2x)
  const tagsA = new Set(paperA.tags || []);
  const tagsB = new Set(paperB.tags || []);
  for (const tag of tagsA) {
    if (tagsB.has(tag)) score += 2;
  }

  // Category matching (weighted 1x)
  const catsA = new Set(paperA.categories || []);
  const catsB = new Set(paperB.categories || []);
  for (const cat of catsA) {
    if (catsB.has(cat)) score += 1;
  }

  // Normalize to 0-1 range (max possible: ~10 points for similar papers)
  return Math.min(score / 10, 1);
}

/**
 * Find top K similar papers using embedding similarity with tag fallback
 * @param {Object} targetPaper - The paper to find similar papers for
 * @param {Array} allPapers - Pool of papers to search
 * @param {number} topK - Number of similar papers to return
 * @returns {Array} Similar papers with similarity scores
 */
export function findSimilarPapers(targetPaper, allPapers, topK = 3) {
  const hasEmbedding = !!targetPaper.embedding;

  const similarities = allPapers
    .filter(p => p.id !== targetPaper.id)
    .map(p => {
      let score = 0;
      let method = 'none';

      // Prefer embedding similarity if both papers have embeddings
      if (hasEmbedding && p.embedding) {
        score = cosineSimilarity(targetPaper.embedding, p.embedding);
        method = 'embedding';
      } else {
        // Fallback to tag-based similarity
        score = calculateTagSimilarity(targetPaper, p);
        method = 'tags';
      }

      return { paper: p, score, method };
    })
    .filter(s => s.score > 0.3) // Threshold: 0.3 for embeddings, normalized tags
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Return papers with similarity info (strip embedding from response)
  return similarities.map(s => {
    const { embedding, ...paperWithoutEmbedding } = s.paper;
    return {
      ...paperWithoutEmbedding,
      similarityScore: Math.round(s.score * 100) / 100,
      similarityMethod: s.method,
    };
  });
}

/**
 * Legacy function for backward compatibility
 */
export function calculateSimilarity(paperA, paperB) {
  if (paperA.embedding && paperB.embedding) {
    return cosineSimilarity(paperA.embedding, paperB.embedding);
  }
  return calculateTagSimilarity(paperA, paperB);
}
