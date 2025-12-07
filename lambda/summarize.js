import Anthropic from '@anthropic-ai/sdk';
import { generatePaperEmbedding } from './embeddings.js';

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

// Summarize a single paper
async function summarizeSingle(paper) {
  const prompt = `Summarize this AI paper for LinkedIn sharing. Return JSON only.

Title: ${paper.title}
Abstract: ${truncateAbstract(paper.abstract)}

Return this exact JSON format:
{"headline":"5-10 word catchy headline","problem":"What problem? (1 sentence)","approach":"How solved? (1 sentence)","method":"Key innovation (1 sentence)","findings":"Results (1 sentence)","takeaway":"Why it matters (1 sentence)","tags":["Tag1","Tag2"]}

Tags to use: LLM, Vision, NLP, Efficiency, Training, Benchmarks, Multimodal, RL, Safety, Data`;

  const response = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  );

  const content = response.content[0].text;

  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;

    // Try to find JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const summary = JSON.parse(jsonStr);
    console.log(`Parsed summary for: ${paper.title.slice(0, 50)}...`);

    const summarizedPaper = {
      ...paper,
      headline: summary.headline || paper.title.slice(0, 60),
      problem: summary.problem || null,
      approach: summary.approach || null,
      method: summary.method || null,
      findings: summary.findings || null,
      takeaway: summary.takeaway || null,
      tags: summary.tags || paper.categories?.slice(0, 3) || []
    };

    // Generate embedding using Bedrock Titan
    try {
      summarizedPaper.embedding = await generatePaperEmbedding(paper);
      console.log(`Generated embedding for: ${paper.title.slice(0, 40)}...`);
    } catch (embErr) {
      console.error('Failed to generate embedding:', embErr.message);
    }

    return summarizedPaper;
  } catch (error) {
    console.error('Failed to parse response:', error.message);
    console.error('Raw response:', content.slice(0, 300));
    const fallbackPaper = { ...paper, ...createFallback(paper) };

    // Still try to generate embedding for fallback papers
    try {
      fallbackPaper.embedding = await generatePaperEmbedding(paper);
    } catch (embErr) {
      console.error('Failed to generate embedding:', embErr.message);
    }

    return fallbackPaper;
  }
}

export async function summarizePapers(papers) {
  const summaries = [];
  const DELAY_BETWEEN_CALLS = 500; // 500ms between API calls

  console.log(`Processing ${papers.length} papers individually...`);

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];

    try {
      const result = await summarizeSingle(paper);
      summaries.push(result);
    } catch (error) {
      console.error(`Paper ${i + 1} failed:`, error.message);
      summaries.push({ ...paper, ...createFallback(paper) });
    }

    console.log(`Processed ${i + 1}/${papers.length} papers`);

    if (i < papers.length - 1) {
      await delay(DELAY_BETWEEN_CALLS);
    }
  }

  return summaries;
}

// Single paper summarization export
export async function summarizePaper(paper) {
  return await summarizeSingle(paper);
}
