import 'dotenv/config';
import { DynamoDBClient, CreateTableCommand, UpdateTimeToLiveCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'arxiv-papers';
const REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({ region: REGION });

async function createTable() {
  console.log(`Creating DynamoDB table: ${TABLE_NAME} in ${REGION}...`);

  try {
    // Check if table already exists
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log(`Table ${TABLE_NAME} already exists!`);
      return;
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') {
        throw err;
      }
      // Table doesn't exist, proceed to create
    }

    // Create table
    const createParams = {
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' },
        { AttributeName: 'published', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'published-index',
          KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'published', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    };

    await client.send(new CreateTableCommand(createParams));
    console.log('Table creation initiated. Waiting for table to become active...');

    // Wait for table to be active
    let tableActive = false;
    while (!tableActive) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const desc = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      if (desc.Table.TableStatus === 'ACTIVE') {
        tableActive = true;
        console.log('Table is now ACTIVE!');
      } else {
        console.log(`Table status: ${desc.Table.TableStatus}...`);
      }
    }

    // Enable TTL
    console.log('Enabling TTL on ttl attribute...');
    await client.send(new UpdateTimeToLiveCommand({
      TableName: TABLE_NAME,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'ttl',
      },
    }));
    console.log('TTL enabled!');

    console.log('\nDynamoDB setup complete!');
    console.log(`Table: ${TABLE_NAME}`);
    console.log(`Region: ${REGION}`);

  } catch (error) {
    console.error('Failed to create table:', error.message);
    process.exit(1);
  }
}

createTable();
