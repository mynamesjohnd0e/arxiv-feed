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

export async function summarizePaper(paper) {
  const prompt = `You are summarizing an AI research paper for busy professionals. Create a brief, engaging summary.

Paper Title: ${paper.title}

Abstract: ${paper.abstract}

Provide a JSON response with:
- "headline": A catchy 5-10 word headline that captures the key innovation (not the title)
- "summary": 2-3 sentences explaining what they did and why it matters, written for someone who understands AI but is short on time
- "keyTakeaway": One sentence starting with "Key takeaway:" about the practical implication
- "tags": Array of 2-3 relevant tags (e.g., "LLM", "Vision", "Efficiency", "Training", "Benchmarks")

Respond ONLY with valid JSON, no markdown.`;

  const response = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  );

  const content = response.content[0].text;

  try {
    return JSON.parse(content);
  } catch {
    return {
      headline: paper.title.slice(0, 60),
      summary: paper.abstract.slice(0, 200) + '...',
      keyTakeaway: 'See the full paper for details.',
      tags: paper.categories.slice(0, 3)
    };
  }
}

export async function summarizePapers(papers) {
  const summaries = [];
  const BATCH_SIZE = 3; // Process 3 papers at a time
  const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds between batches

  console.log(`Processing ${papers.length} papers in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    const batch = papers.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (paper) => {
        try {
          const summary = await summarizePaper(paper);
          return { ...paper, ...summary };
        } catch (error) {
          console.error(`Failed to summarize paper ${paper.id}:`, error.message);
          // Return paper with fallback summary
          return {
            ...paper,
            headline: paper.title.slice(0, 60),
            summary: paper.abstract.slice(0, 200) + '...',
            keyTakeaway: 'See the full paper for details.',
            tags: paper.categories?.slice(0, 3) || []
          };
        }
      })
    );

    summaries.push(...batchResults);
    console.log(`Processed ${Math.min(i + BATCH_SIZE, papers.length)}/${papers.length} papers`);

    // Wait between batches (except for the last batch)
    if (i + BATCH_SIZE < papers.length) {
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  return summaries;
}
