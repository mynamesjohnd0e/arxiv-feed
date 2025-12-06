import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

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

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

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
  const summaries = await Promise.all(
    papers.map(async (paper) => {
      const summary = await summarizePaper(paper);
      return {
        ...paper,
        ...summary
      };
    })
  );
  return summaries;
}
