#!/usr/bin/env node

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'ai-styling-platform';

async function createTable() {
  try {
    // Check if table already exists
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log(`✅ Table '${TABLE_NAME}' already exists`);
      return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    // Create the table
    const createTableParams = {
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },  // Partition key
        { AttributeName: 'SK', KeyType: 'RANGE' }  // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand billing
      Tags: [
        {
          Key: 'Project',
          Value: 'AI-Styling-Platform'
        },
        {
          Key: 'Environment',
          Value: 'Production'
        }
      ]
    };

    console.log(`🔄 Creating DynamoDB table '${TABLE_NAME}'...`);
    await client.send(new CreateTableCommand(createTableParams));
    
    console.log(`✅ Successfully created DynamoDB table '${TABLE_NAME}'`);
    console.log(`📋 Table configuration:`);
    console.log(`   - Name: ${TABLE_NAME}`);
    console.log(`   - Partition Key: PK (String)`);
    console.log(`   - Sort Key: SK (String)`);
    console.log(`   - Billing: Pay-per-request`);
    console.log(`   - Region: ${process.env.AWS_REGION || 'us-east-1'}`);

  } catch (error) {
    console.error('❌ Error creating DynamoDB table:', error.message);
    process.exit(1);
  }
}

// Run the setup
createTable();