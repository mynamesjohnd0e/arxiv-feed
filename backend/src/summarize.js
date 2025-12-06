import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
}

// Truncate abstract to save tokens
function truncateAbstract(abstract, maxLength = 600) {
  if (abstract.length <= maxLength) return abstract;
  return abstract.slice(0, maxLength) + '...';
}

// Create fallback summary for failed papers
function createFallback(paper) {
  return {
    headline: paper.title.slice(0, 60),
    problem: 'See abstract for problem statement.',
    approach: 'See abstract for methodology.',
    method: 'See abstract for technical details.',
    findings: 'See abstract for key results.',
    takeaway: 'Read the full paper for insights.',
    tags: paper.categories?.slice(0, 3) || []
  };
}

// Batch summarize multiple papers in ONE API call (major token savings)
async function summarizeBatch(papers) {
  const papersText = papers.map((p, i) =>
    `[${i + 1}] "${p.title}"\n${truncateAbstract(p.abstract)}`
  ).join('\n\n');

  const prompt = `Analyze these ${papers.length} AI/ML papers. Return a JSON array with structured summaries optimized for LinkedIn sharing.

${papersText}

For each paper return:
{
  "id": 1,
  "headline": "Catchy 5-10 word headline",
  "problem": "One sentence: What problem does this solve?",
  "approach": "One sentence: How do they solve it?",
  "method": "One sentence: Key technical innovation",
  "findings": "One sentence: Main results/impact",
  "takeaway": "One sentence: Why this matters for practitioners",
  "tags": ["tag1", "tag2"]
}

Keep each field concise (under 25 words). Tags: LLM, Vision, NLP, Efficiency, Training, Benchmarks, Multimodal, RL, Safety, Data

Return ONLY a JSON array, no markdown.`;

  const response = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: 'claude-haiku-4-20250514',  // Haiku is ~10x cheaper
      max_tokens: 250 * papers.length,    // ~250 tokens per paper for richer summaries
      messages: [{ role: 'user', content: prompt }]
    })
  );

  const content = response.content[0].text;

  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const summaries = JSON.parse(jsonStr);
    console.log(`Parsed ${summaries.length} summaries successfully`);

    return papers.map((paper, i) => {
      // Find matching summary by index or id
      const summary = summaries[i] || summaries.find(s => s.id === i + 1) || {};

      // Remove the 'id' field to avoid overwriting paper's arXiv ID
      const { id: _, ...summaryFields } = summary;

      return {
        ...paper,
        headline: summaryFields.headline || paper.title.slice(0, 60),
        problem: summaryFields.problem || null,
        approach: summaryFields.approach || null,
        method: summaryFields.method || null,
        findings: summaryFields.findings || null,
        takeaway: summaryFields.takeaway || null,
        tags: summaryFields.tags || paper.categories?.slice(0, 3) || []
      };
    });
  } catch (error) {
    console.error('Failed to parse batch response:', error.message);
    console.error('Raw response:', content.slice(0, 500));
    return papers.map(p => ({ ...p, ...createFallback(p) }));
  }
}

export async function summarizePapers(papers) {
  const summaries = [];
  const BATCH_SIZE = 5; // 5 papers per API call (1 call instead of 5!)
  const DELAY_BETWEEN_BATCHES = 1000;

  console.log(`Processing ${papers.length} papers in batches of ${BATCH_SIZE} (token-optimized)...`);

  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    const batch = papers.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await summarizeBatch(batch);
      summaries.push(...batchResults);
    } catch (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      summaries.push(...batch.map(p => ({ ...p, ...createFallback(p) })));
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, papers.length)}/${papers.length} papers`);

    if (i + BATCH_SIZE < papers.length) {
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  return summaries;
}

// Keep single paper function for potential future use
export async function summarizePaper(paper) {
  const results = await summarizeBatch([paper]);
  return results[0];
}
