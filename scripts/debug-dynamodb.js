#!/usr/bin/env node

/**
 * DynamoDB Debug Script
 * Tests DynamoDB operations to identify the session update issue
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'ai-styling-platform-prod';

const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function debugDynamoDB() {
  console.log('🔍 DynamoDB Debug Script');
  console.log('========================');
  
  // Check environment variables
  console.log('\n📋 Environment Check:');
  console.log('AWS_REGION:', AWS_REGION);
  console.log('DYNAMODB_TABLE_NAME:', DYNAMODB_TABLE_NAME);
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing');
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('\n❌ Missing AWS credentials');
    process.exit(1);
  }

  const testUserId = 'debug-test-user';
  const testSessionId = 'debug-test-session';
  
  try {
    // Test 1: Create a test session
    console.log('\n🧪 Test 1: Creating test session...');
    const testSession = {
      PK: `USER#${testUserId}`,
      SK: `ONBOARDING#${testSessionId}`,
      conversationHistory: [],
      currentStep: 'greeting',
      extractedData: {},
      isComplete: false,
      createdAt: new Date().toISOString(),
    };
    
    const createCommand = new PutItemCommand({
      TableName: DYNAMODB_TABLE_NAME,
      Item: marshall(testSession),
    });
    
    await dynamoClient.send(createCommand);
    console.log('✅ Session created successfully');
    
    // Test 2: Retrieve the session
    console.log('\n🧪 Test 2: Retrieving test session...');
    const getCommand = new GetItemCommand({
      TableName: DYNAMODB_TABLE_NAME,
      Key: marshall({
        PK: `USER#${testUserId}`,
        SK: `ONBOARDING#${testSessionId}`,
      }),
    });
    
    const getResult = await dynamoClient.send(getCommand);
    if (!getResult.Item) {
      throw new Error('Session not found after creation');
    }
    console.log('✅ Session retrieved successfully');
    
    // Test 3: Update the session (this is where it's failing)
    console.log('\n🧪 Test 3: Updating test session...');
    const updateData = {
      conversationHistory: [
        { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() }
      ],
      currentStep: 'emotions',
      extractedData: { testField: 'testValue' },
      isComplete: false,
    };
    
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updateData).forEach(([key, value], index) => {
      if (key !== 'PK' && key !== 'SK') {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    console.log('Update Expression:', `SET ${updateExpression.join(', ')}`);
    console.log('Attribute Names:', expressionAttributeNames);
    console.log('Attribute Values (before marshall):', expressionAttributeValues);
    
    const updateCommand = new UpdateItemCommand({
      TableName: DYNAMODB_TABLE_NAME,
      Key: marshall({
        PK: `USER#${testUserId}`,
        SK: `ONBOARDING#${testSessionId}`,
      }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    });
    
    await dynamoClient.send(updateCommand);
    console.log('✅ Session updated successfully');
    
    // Test 4: Verify the update
    console.log('\n🧪 Test 4: Verifying update...');
    const verifyResult = await dynamoClient.send(getCommand);
    const updatedSession = unmarshall(verifyResult.Item);
    console.log('✅ Update verified - conversation history length:', updatedSession.conversationHistory.length);
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    // Note: We'll leave the test data for now since we don't have a delete operation
    
    console.log('\n🎉 All DynamoDB operations successful!');
    console.log('The issue is likely not with DynamoDB operations themselves.');
    
  } catch (error) {
    console.log('\n❌ DynamoDB Error:');
    console.log('Error Name:', error.name);
    console.log('Error Message:', error.message);
    console.log('Error Code:', error.$metadata?.httpStatusCode);
    
    if (error.name === 'ResourceNotFoundException') {
      console.log('\n💡 Suggestion: The DynamoDB table might not exist or the table name is incorrect.');
      console.log('Expected table name:', DYNAMODB_TABLE_NAME);
    } else if (error.name === 'UnauthorizedOperation' || error.name === 'AccessDeniedException') {
      console.log('\n💡 Suggestion: Check AWS credentials and IAM permissions for DynamoDB.');
    } else if (error.name === 'ValidationException') {
      console.log('\n💡 Suggestion: There might be an issue with the data format or table schema.');
    }
    
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

// Run the debug script
debugDynamoDB().catch(console.error);