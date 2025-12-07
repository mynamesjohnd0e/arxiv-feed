import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  BatchWriteCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'arxiv-papers';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

/**
 * Save a single summarized paper to DynamoDB
 */
export async function savePaper(paper) {
  const now = Date.now();
  const item = {
    pk: 'PAPER',
    sk: paper.id,
    ...paper,
    summarizedAt: now,
    ttl: Math.floor(now / 1000) + (90 * 24 * 60 * 60), // 90 days
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
  }));

  return item;
}

/**
 * Save multiple papers in batch (max 25 per batch due to DynamoDB limits)
 */
export async function savePapersBatch(papers) {
  const batches = [];
  for (let i = 0; i < papers.length; i += 25) {
    batches.push(papers.slice(i, i + 25));
  }

  const now = Date.now();

  for (const batch of batches) {
    const requests = batch.map(paper => ({
      PutRequest: {
        Item: {
          pk: 'PAPER',
          sk: paper.id,
          ...paper,
          summarizedAt: now,
          ttl: Math.floor(now / 1000) + (90 * 24 * 60 * 60),
        },
      },
    }));

    await docClient.send(new BatchWriteCommand({
      RequestItems: { [TABLE_NAME]: requests },
    }));
  }
}

/**
 * Get a single paper by ID
 */
export async function getPaper(paperId) {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: 'PAPER', sk: paperId },
  }));

  if (result.Item) {
    const { pk, sk, ttl, summarizedAt, ...paper } = result.Item;
    return paper;
  }
  return null;
}

/**
 * Check if a paper exists in the database
 */
export async function paperExists(paperId) {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: 'PAPER', sk: paperId },
    ProjectionExpression: 'sk',
  }));

  return !!result.Item;
}

/**
 * Get recent papers sorted by publication date (newest first)
 */
export async function getRecentPapers(limit = 50) {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'published-index',
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'PAPER' },
    ScanIndexForward: false, // Descending order (newest first)
    Limit: limit,
  }));

  // Strip DynamoDB-specific fields
  return (result.Items || []).map(item => {
    const { pk, sk, ttl, summarizedAt, ...paper } = item;
    return paper;
  });
}

/**
 * Get existing paper IDs from a list (for deduplication before summarizing)
 */
export async function getExistingPaperIds(paperIds) {
  const existing = new Set();

  // BatchGetItem can get up to 100 items at once
  const batches = [];
  for (let i = 0; i < paperIds.length; i += 100) {
    batches.push(paperIds.slice(i, i + 100));
  }

  for (const batch of batches) {
    const keys = batch.map(id => ({ pk: 'PAPER', sk: id }));

    const result = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: keys,
          ProjectionExpression: 'sk',
        },
      },
    }));

    const items = result.Responses?.[TABLE_NAME] || [];
    for (const item of items) {
      existing.add(item.sk);
    }
  }

  return existing;
}

/**
 * Get paper count in database
 */
export async function getPaperCount() {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'PAPER' },
    Select: 'COUNT',
  }));

  return result.Count || 0;
}
