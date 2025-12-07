import 'dotenv/config';
import { fetchArxivPapers } from './arxiv.js';
import { summarizePapers } from './summarize.js';
import { savePapersBatch, getExistingPaperIds, getPaperCount } from './db.js';

// Configuration
const TARGET_PAPERS = 100;
const BATCH_SIZE = 50; // arXiv API max per request
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds between arXiv requests

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBatch() {
  console.log('='.repeat(60));
  console.log('arXiv Paper Batch Processor');
  console.log('='.repeat(60));

  // Check configuration
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in .env');
    process.exit(1);
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.DYNAMODB_TABLE) {
    console.error('ERROR: AWS credentials or DYNAMODB_TABLE not set in .env');
    process.exit(1);
  }

  try {
    // Get current paper count
    const existingCount = await getPaperCount();
    console.log(`\nCurrent papers in database: ${existingCount}`);
    console.log(`Target: ${TARGET_PAPERS} new papers\n`);

    let totalFetched = 0;
    let totalNew = 0;
    let totalSummarized = 0;
    let start = 0;

    while (totalNew < TARGET_PAPERS) {
      console.log('-'.repeat(60));
      console.log(`Batch: Fetching papers ${start} to ${start + BATCH_SIZE}...`);

      // Fetch papers from arXiv
      const rawPapers = await fetchArxivPapers({
        maxResults: BATCH_SIZE,
        start,
        sortBy: 'submittedDate',
        sortOrder: 'descending',
      });

      if (rawPapers.length === 0) {
        console.log('No more papers available from arXiv');
        break;
      }

      totalFetched += rawPapers.length;
      console.log(`Fetched ${rawPapers.length} papers from arXiv`);

      // Check which papers already exist in database
      const paperIds = rawPapers.map(p => p.id);
      const existingIds = await getExistingPaperIds(paperIds);
      console.log(`Found ${existingIds.size} papers already in database`);

      // Filter to only new papers
      const newPapers = rawPapers.filter(p => !existingIds.has(p.id));
      console.log(`${newPapers.length} new papers to process`);

      if (newPapers.length > 0) {
        // Limit to not exceed target
        const papersToProcess = newPapers.slice(0, TARGET_PAPERS - totalNew);

        console.log(`\nSummarizing ${papersToProcess.length} papers with Claude + generating embeddings...`);
        const summarizedPapers = await summarizePapers(papersToProcess);

        const withEmbeddings = summarizedPapers.filter(p => p.embedding).length;
        console.log(`Summarized ${summarizedPapers.length} papers (${withEmbeddings} with embeddings)`);

        // Save to DynamoDB
        console.log('Saving to DynamoDB...');
        await savePapersBatch(summarizedPapers);
        console.log('Saved successfully');

        totalNew += summarizedPapers.length;
        totalSummarized += summarizedPapers.length;
      }

      // Move to next batch
      start += BATCH_SIZE;

      // Progress update
      console.log(`\nProgress: ${totalNew}/${TARGET_PAPERS} new papers processed`);

      // Rate limiting for arXiv API
      if (totalNew < TARGET_PAPERS && rawPapers.length === BATCH_SIZE) {
        console.log(`Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('BATCH PROCESSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Papers fetched from arXiv: ${totalFetched}`);
    console.log(`New papers summarized: ${totalSummarized}`);
    console.log(`Papers skipped (duplicates): ${totalFetched - totalSummarized}`);

    const finalCount = await getPaperCount();
    console.log(`Total papers in database: ${finalCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nBatch processing failed:', error);
    process.exit(1);
  }
}

// Run the batch
runBatch();
