import { fetchArxivPapers } from './arxiv.js';
import { summarizePapers } from './summarize.js';
import { savePapersBatch, getExistingPaperIds } from './db.js';

const MAX_PAPERS = 50; // Scope limit for initial rollout

export const handler = async (event) => {
  console.log('Starting daily arXiv paper batch processing...');
  console.log('Event:', JSON.stringify(event));

  try {
    // 1. Fetch recent papers from arXiv
    console.log(`Fetching up to ${MAX_PAPERS} papers from arXiv...`);
    const rawPapers = await fetchArxivPapers({ maxResults: MAX_PAPERS });
    console.log(`Fetched ${rawPapers.length} papers from arXiv`);

    if (rawPapers.length === 0) {
      console.log('No papers fetched from arXiv');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No papers available from arXiv' }),
      };
    }

    // 2. Check which papers already exist in DynamoDB
    console.log('Checking for existing papers in DynamoDB...');
    const paperIds = rawPapers.map(p => p.id);
    const existingIds = await getExistingPaperIds(paperIds);
    console.log(`Found ${existingIds.size} papers already in database`);

    // 3. Filter to only new papers
    const newPapers = rawPapers.filter(p => !existingIds.has(p.id));
    console.log(`${newPapers.length} new papers to process`);

    if (newPapers.length === 0) {
      console.log('All papers already processed');
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No new papers to process',
          skipped: existingIds.size,
        }),
      };
    }

    // 4. Summarize new papers with Claude and generate embeddings with Bedrock
    console.log(`Summarizing ${newPapers.length} papers with Claude and generating embeddings...`);
    const summarizedPapers = await summarizePapers(newPapers);
    const withEmbeddings = summarizedPapers.filter(p => p.embedding).length;
    console.log(`Successfully summarized ${summarizedPapers.length} papers (${withEmbeddings} with embeddings)`);

    // 5. Save to DynamoDB
    console.log('Saving papers to DynamoDB...');
    await savePapersBatch(summarizedPapers);
    console.log('Papers saved to DynamoDB');

    const result = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Batch processing complete',
        processed: summarizedPapers.length,
        withEmbeddings,
        skipped: existingIds.size,
        total: rawPapers.length,
      }),
    };

    console.log('Result:', result.body);
    return result;

  } catch (error) {
    console.error('Batch processing failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Batch processing failed',
        message: error.message,
      }),
    };
  }
};
