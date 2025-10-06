#!/usr/bin/env node

/**
 * Test AWS Permissions Script
 * Tests if AWS credentials have the necessary DynamoDB permissions
 */

require('dotenv').config({ path: '.env.local' });

const { DynamoDBClient, ListTablesCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'ai-styling-platform-prod';

const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testPermissions() {
  console.log('🔐 Testing AWS Permissions');
  console.log('==========================');
  
  try {
    // Test 1: List tables permission
    console.log('\n📋 Test 1: List Tables...');
    const listCommand = new ListTablesCommand({});
    const listResult = await dynamoClient.send(listCommand);
    console.log('✅ Can list tables:', listResult.TableNames?.length || 0, 'tables found');
    
    if (listResult.TableNames?.includes(DYNAMODB_TABLE_NAME)) {
      console.log('✅ Target table found in list:', DYNAMODB_TABLE_NAME);
    } else {
      console.log('❌ Target table NOT found in list:', DYNAMODB_TABLE_NAME);
      console.log('Available tables:', listResult.TableNames);
    }
    
    // Test 2: Describe table permission
    console.log('\n📊 Test 2: Describe Table...');
    const describeCommand = new DescribeTableCommand({
      TableName: DYNAMODB_TABLE_NAME
    });
    const describeResult = await dynamoClient.send(describeCommand);
    console.log('✅ Can describe table:', describeResult.Table?.TableName);
    console.log('Table status:', describeResult.Table?.TableStatus);
    console.log('Item count:', describeResult.Table?.ItemCount);
    
    console.log('\n🎉 All permission tests passed!');
    console.log('Your AWS credentials have the necessary DynamoDB permissions.');
    
  } catch (error) {
    console.log('\n❌ Permission test failed:');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    
    if (error.name === 'UnauthorizedOperation' || error.name === 'AccessDeniedException') {
      console.log('\n💡 Issue: Your AWS credentials do not have sufficient DynamoDB permissions.');
      console.log('Required permissions:');
      console.log('- dynamodb:ListTables');
      console.log('- dynamodb:DescribeTable');
      console.log('- dynamodb:GetItem');
      console.log('- dynamodb:PutItem');
      console.log('- dynamodb:UpdateItem');
    } else if (error.name === 'ResourceNotFoundException') {
      console.log('\n💡 Issue: The DynamoDB table does not exist or is in a different region.');
      console.log('Expected table:', DYNAMODB_TABLE_NAME);
      console.log('Expected region:', AWS_REGION);
    }
    
    console.log('\nFull error:', error);
  }
}

testPermissions().catch(console.error);