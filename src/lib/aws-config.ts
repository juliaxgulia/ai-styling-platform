import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// AWS Clients
export const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Configuration constants
export const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'ai-styling-platform-prod';
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'ai-styling-platform-images';
export const BEDROCK_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';