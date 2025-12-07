/**
 * Calculate similarity score between two papers
 * Tags match = 2 points each, Category match = 1 point each
 */
export function calculateSimilarity(paperA, paperB) {
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

  return score;
}

/**
 * Find top K similar papers
 */
export function findSimilarPapers(targetPaper, allPapers, topK = 3) {
  const similarities = allPapers
    .filter(p => p.id !== targetPaper.id)
    .map(p => ({
      paper: p,
      score: calculateSimilarity(targetPaper, p)
    }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return similarities.map(s => s.paper);
}
