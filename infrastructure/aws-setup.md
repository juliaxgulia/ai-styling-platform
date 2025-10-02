# AWS Production Setup Guide

## Prerequisites
- AWS CLI installed and configured
- Appropriate IAM permissions for DynamoDB, S3, and Bedrock

## 1. DynamoDB Table Setup

### Create Production Table
```bash
aws dynamodb create-table \
  --table-name ai-styling-platform-prod \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Add Global Secondary Index for User Queries
```bash
aws dynamodb update-table \
  --table-name ai-styling-platform-prod \
  --attribute-definitions \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --global-secondary-index-updates \
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
    }]'
```

## 2. S3 Bucket Setup

### Create Production Bucket
```bash
aws s3 mb s3://ai-styling-platform-images-prod --region us-east-1
```

### Configure Bucket Policy for Secure Access
```bash
aws s3api put-bucket-policy \
  --bucket ai-styling-platform-images-prod \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowSignedURLAccess",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::ai-styling-platform-images-prod/*",
        "Condition": {
          "StringEquals": {
            "s3:ExistingObjectTag/AccessType": "SignedURL"
          }
        }
      }
    ]
  }'
```

### Configure CORS for Web Access
```bash
aws s3api put-bucket-cors \
  --bucket ai-styling-platform-images-prod \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["https://your-domain.vercel.app"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'
```

### Set Lifecycle Policy for Automatic Cleanup
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket ai-styling-platform-images-prod \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "DeleteTempImages",
        "Status": "Enabled",
        "Filter": {"Prefix": "temp/"},
        "Expiration": {"Days": 7}
      },
      {
        "ID": "DeleteUnconfirmedAnalysis", 
        "Status": "Enabled",
        "Filter": {"Prefix": "analysis/"},
        "Expiration": {"Days": 30}
      }
    ]
  }'
```

## 3. Bedrock Model Access

### Enable Claude 3.5 Sonnet Access
```bash
# Request model access through AWS Console
# Navigate to: Bedrock > Model access > Request model access
# Select: Anthropic Claude 3.5 Sonnet
```

## 4. IAM Role for Vercel

### Create IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem", 
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/ai-styling-platform-prod",
        "arn:aws:dynamodb:us-east-1:*:table/ai-styling-platform-prod/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectTagging",
        "s3:PutObjectTagging"
      ],
      "Resource": "arn:aws:s3:::ai-styling-platform-images-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::ai-styling-platform-images-prod"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    }
  ]
}
```

### Create IAM User for Vercel
```bash
aws iam create-user --user-name vercel-ai-styling-platform

aws iam put-user-policy \
  --user-name vercel-ai-styling-platform \
  --policy-name AIStylingPlatformPolicy \
  --policy-document file://iam-policy.json

aws iam create-access-key --user-name vercel-ai-styling-platform
```

## 5. Environment Variables for Vercel

Set these in Vercel Dashboard > Project Settings > Environment Variables:

- `AWS_REGION`: us-east-1
- `AWS_ACCESS_KEY_ID`: [From IAM user creation]
- `AWS_SECRET_ACCESS_KEY`: [From IAM user creation]
- `DYNAMODB_TABLE_NAME`: ai-styling-platform-prod
- `S3_BUCKET_NAME`: ai-styling-platform-images-prod
- `NEXTAUTH_SECRET`: [Generate secure random string]
- `NEXTAUTH_URL`: https://your-domain.vercel.app