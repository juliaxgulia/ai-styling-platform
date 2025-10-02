#!/usr/bin/env node

/**
 * AWS Setup Script
 * Automates the creation of AWS resources for the AI Styling Platform
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const config = {
  region: 'us-east-1',
  tableName: 'ai-styling-platform-prod',
  bucketName: 'ai-styling-platform-images-prod',
  iamUserName: 'vercel-ai-styling-platform'
};

function executeCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

function checkAWSCLI() {
  try {
    execSync('aws --version', { stdio: 'pipe' });
    console.log('✅ AWS CLI is installed');
  } catch (error) {
    console.error('❌ AWS CLI is not installed. Please install it first.');
    process.exit(1);
  }
}

function createDynamoDBTable() {
  const createTableCommand = `
    aws dynamodb create-table \\
      --table-name ${config.tableName} \\
      --attribute-definitions \\
        AttributeName=PK,AttributeType=S \\
        AttributeName=SK,AttributeType=S \\
      --key-schema \\
        AttributeName=PK,KeyType=HASH \\
        AttributeName=SK,KeyType=RANGE \\
      --billing-mode PAY_PER_REQUEST \\
      --region ${config.region}
  `;

  executeCommand(createTableCommand, 'Creating DynamoDB table');

  // Wait for table to be active
  const waitCommand = `aws dynamodb wait table-exists --table-name ${config.tableName} --region ${config.region}`;
  executeCommand(waitCommand, 'Waiting for table to be active');

  // Add GSI
  const gsiCommand = `
    aws dynamodb update-table \\
      --table-name ${config.tableName} \\
      --attribute-definitions \\
        AttributeName=GSI1PK,AttributeType=S \\
        AttributeName=GSI1SK,AttributeType=S \\
      --global-secondary-index-updates \\
        '[{
          "Create": {
            "IndexName": "GSI1",
            "KeySchema": [
              {"AttributeName": "GSI1PK", "KeyType": "HASH"},
              {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "BillingMode": "PAY_PER_REQUEST"
          }
        }]' \\
      --region ${config.region}
  `;

  executeCommand(gsiCommand, 'Adding Global Secondary Index');
}

function createS3Bucket() {
  const createBucketCommand = `aws s3 mb s3://${config.bucketName} --region ${config.region}`;
  executeCommand(createBucketCommand, 'Creating S3 bucket');

  // Enable versioning
  const versioningCommand = `
    aws s3api put-bucket-versioning \\
      --bucket ${config.bucketName} \\
      --versioning-configuration Status=Enabled
  `;
  executeCommand(versioningCommand, 'Enabling S3 versioning');

  // Block public access
  const blockPublicCommand = `
    aws s3api put-public-access-block \\
      --bucket ${config.bucketName} \\
      --public-access-block-configuration \\
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  `;
  executeCommand(blockPublicCommand, 'Blocking S3 public access');
}

function configureCORS() {
  const corsConfig = {
    CORSRules: [
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "PUT", "POST"],
        AllowedOrigins: ["https://localhost:3000", "https://*.vercel.app"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000
      }
    ]
  };

  fs.writeFileSync('/tmp/cors-config.json', JSON.stringify(corsConfig, null, 2));

  const corsCommand = `
    aws s3api put-bucket-cors \\
      --bucket ${config.bucketName} \\
      --cors-configuration file:///tmp/cors-config.json
  `;
  executeCommand(corsCommand, 'Configuring S3 CORS');
}

function setLifecyclePolicy() {
  const lifecycleConfig = {
    Rules: [
      {
        ID: "DeleteTempImages",
        Status: "Enabled",
        Filter: { Prefix: "temp/" },
        Expiration: { Days: 7 }
      },
      {
        ID: "DeleteUnconfirmedAnalysis",
        Status: "Enabled",
        Filter: { Prefix: "analysis/" },
        Expiration: { Days: 30 }
      }
    ]
  };

  fs.writeFileSync('/tmp/lifecycle-config.json', JSON.stringify(lifecycleConfig, null, 2));

  const lifecycleCommand = `
    aws s3api put-bucket-lifecycle-configuration \\
      --bucket ${config.bucketName} \\
      --lifecycle-configuration file:///tmp/lifecycle-config.json
  `;
  executeCommand(lifecycleCommand, 'Setting S3 lifecycle policy');
}

function createIAMUser() {
  const iamPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ],
        Resource: [
          `arn:aws:dynamodb:${config.region}:*:table/${config.tableName}`,
          `arn:aws:dynamodb:${config.region}:*:table/${config.tableName}/index/*`
        ]
      },
      {
        Effect: "Allow",
        Action: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectTagging",
          "s3:PutObjectTagging"
        ],
        Resource: `arn:aws:s3:::${config.bucketName}/*`
      },
      {
        Effect: "Allow",
        Action: ["s3:ListBucket"],
        Resource: `arn:aws:s3:::${config.bucketName}`
      },
      {
        Effect: "Allow",
        Action: ["bedrock:InvokeModel"],
        Resource: "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      }
    ]
  };

  fs.writeFileSync('/tmp/iam-policy.json', JSON.stringify(iamPolicy, null, 2));

  // Create user
  const createUserCommand = `aws iam create-user --user-name ${config.iamUserName}`;
  executeCommand(createUserCommand, 'Creating IAM user');

  // Attach policy
  const attachPolicyCommand = `
    aws iam put-user-policy \\
      --user-name ${config.iamUserName} \\
      --policy-name AIStylingPlatformPolicy \\
      --policy-document file:///tmp/iam-policy.json
  `;
  executeCommand(attachPolicyCommand, 'Attaching IAM policy');

  // Create access keys
  const createKeysCommand = `aws iam create-access-key --user-name ${config.iamUserName}`;
  const keysResult = executeCommand(createKeysCommand, 'Creating access keys');
  
  console.log('\n🔑 IMPORTANT: Save these credentials for Vercel:');
  console.log(keysResult);
}

function generateNextAuthSecret() {
  const crypto = require('crypto');
  const secret = crypto.randomBytes(32).toString('base64');
  console.log('\n🔐 Generated NEXTAUTH_SECRET:');
  console.log(secret);
  return secret;
}

function displaySummary() {
  console.log('\n🎉 AWS Setup Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Set environment variables in Vercel dashboard');
  console.log('2. Update CORS configuration with your actual domain');
  console.log('3. Enable Bedrock model access in AWS Console');
  console.log('4. Test the deployment');
  
  console.log('\n🔧 Environment Variables for Vercel:');
  console.log(`AWS_REGION=${config.region}`);
  console.log(`DYNAMODB_TABLE_NAME=${config.tableName}`);
  console.log(`S3_BUCKET_NAME=${config.bucketName}`);
  console.log('AWS_ACCESS_KEY_ID=[From IAM user creation above]');
  console.log('AWS_SECRET_ACCESS_KEY=[From IAM user creation above]');
  console.log('NEXTAUTH_SECRET=[Generated above]');
  console.log('NEXTAUTH_URL=https://your-domain.vercel.app');
}

async function main() {
  console.log('🚀 Starting AWS Setup for AI Styling Platform\n');

  try {
    checkAWSCLI();
    createDynamoDBTable();
    createS3Bucket();
    configureCORS();
    setLifecyclePolicy();
    createIAMUser();
    generateNextAuthSecret();
    displaySummary();
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check AWS CLI configuration: aws configure list');
    console.log('2. Verify AWS permissions');
    console.log('3. Check if resources already exist');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { config, main };