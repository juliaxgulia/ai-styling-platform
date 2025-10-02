# Deployment Guide

This guide covers deploying the AI Personal Styling Platform to production using Vercel and AWS services.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   AWS Bedrock   │    │   DynamoDB      │
│   (Next.js)     │───▶│   (Claude 3.5)  │    │   (Profiles)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐            │
         └─────────────▶│      S3         │◀───────────┘
                        │   (Images)      │
                        └─────────────────┘
```

## 📋 Prerequisites

### Required Accounts
- [AWS Account](https://aws.amazon.com/) with billing enabled
- [Vercel Account](https://vercel.com/) (free tier available)
- [GitHub Account](https://github.com/) for code repository

### Required Tools
- AWS CLI v2+
- Node.js 18+
- Git

### Required Permissions
- AWS IAM permissions for DynamoDB, S3, and Bedrock
- Vercel deployment permissions
- GitHub repository access

## 🔧 AWS Setup

### 1. Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key  
# Default region: us-east-1
# Default output format: json
```

### 2. Create DynamoDB Table

```bash
# Create main table
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

# Add Global Secondary Index
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

### 3. Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://ai-styling-platform-images-prod --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ai-styling-platform-images-prod \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket ai-styling-platform-images-prod \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 4. Configure S3 CORS

Create `cors-config.json`:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://your-domain.vercel.app"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply CORS configuration:
```bash
aws s3api put-bucket-cors \
  --bucket ai-styling-platform-images-prod \
  --cors-configuration file://cors-config.json
```

### 5. Set S3 Lifecycle Policy

Create `lifecycle-config.json`:
```json
{
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
}
```

Apply lifecycle policy:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket ai-styling-platform-images-prod \
  --lifecycle-configuration file://lifecycle-config.json
```

### 6. Enable Bedrock Model Access

1. Go to AWS Console → Bedrock → Model access
2. Request access to "Anthropic Claude 3.5 Sonnet"
3. Wait for approval (usually immediate)

### 7. Create IAM User for Vercel

Create `iam-policy.json`:
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
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::ai-styling-platform-images-prod"
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    }
  ]
}
```

Create IAM user:
```bash
# Create user
aws iam create-user --user-name vercel-ai-styling-platform

# Attach policy
aws iam put-user-policy \
  --user-name vercel-ai-styling-platform \
  --policy-name AIStylingPlatformPolicy \
  --policy-document file://iam-policy.json

# Create access keys
aws iam create-access-key --user-name vercel-ai-styling-platform
```

**Important**: Save the Access Key ID and Secret Access Key - you'll need them for Vercel.

## 🚀 Vercel Deployment

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `ai-styling-platform` directory as the root

### 2. Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `ai-styling-platform`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `AWS_REGION` | `us-east-1` | Production |
| `AWS_ACCESS_KEY_ID` | `[Your IAM Access Key]` | Production |
| `AWS_SECRET_ACCESS_KEY` | `[Your IAM Secret Key]` | Production |
| `DYNAMODB_TABLE_NAME` | `ai-styling-platform-prod` | Production |
| `S3_BUCKET_NAME` | `ai-styling-platform-images-prod` | Production |
| `NEXTAUTH_SECRET` | `[Generate 32-char random string]` | Production |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |

### 4. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

### 5. Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete
3. Test the deployment at your Vercel URL

## 🔍 Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": 150,
  "services": {
    "aws": {
      "dynamodb": true,
      "s3": true,
      "bedrock": true
    },
    "environment": {
      "hasAwsConfig": true,
      "hasDbConfig": true,
      "hasS3Config": true,
      "hasAuthConfig": true
    }
  }
}
```

### 2. Test Core Functionality

1. **Registration**: Create a test account
2. **Onboarding**: Complete the chat flow
3. **Photo Upload**: Test image upload and analysis
4. **Profile Review**: Verify profile generation

### 3. Monitor Logs

Check Vercel Function logs:
1. Go to Vercel Dashboard → Project → Functions
2. Click on any function to view logs
3. Look for errors or performance issues

## 🔒 Security Configuration

### 1. Update CORS Origins

Update S3 CORS configuration with your actual domain:

```bash
aws s3api put-bucket-cors \
  --bucket ai-styling-platform-images-prod \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["https://your-actual-domain.vercel.app"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'
```

### 2. Enable CloudTrail (Optional)

For audit logging:
```bash
aws cloudtrail create-trail \
  --name ai-styling-platform-audit \
  --s3-bucket-name your-cloudtrail-bucket
```

### 3. Set up CloudWatch Alarms

Monitor key metrics:
- DynamoDB throttling
- S3 error rates
- Bedrock invocation failures

## 📊 Monitoring & Alerting

### 1. Vercel Analytics

Enable in Vercel Dashboard:
- Go to Project Settings → Analytics
- Enable Web Analytics
- Enable Audience Analytics (if needed)

### 2. AWS CloudWatch

Key metrics to monitor:
- **DynamoDB**: ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits
- **S3**: NumberOfObjects, BucketSizeBytes
- **Bedrock**: Invocations, Errors, Duration

### 3. Custom Monitoring

The application includes built-in monitoring:
- Performance tracking
- Error logging
- AI interaction metrics
- Health checks

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Setup

The repository includes automated workflows:
- **CI Pipeline**: Tests on every PR
- **Security Scans**: Weekly dependency and code scans
- **Deployment**: Automatic deployment on main branch

### 2. Required Secrets

Add to GitHub Repository Settings → Secrets:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### 3. Branch Protection

Set up branch protection rules:
- Require PR reviews
- Require status checks
- Require up-to-date branches
- Restrict pushes to main

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**
- Check environment variables are set
- Verify AWS credentials have correct permissions
- Review build logs in Vercel

**Runtime Errors:**
- Check function logs in Vercel
- Verify AWS services are accessible
- Test health endpoint

**Performance Issues:**
- Monitor function execution time
- Check DynamoDB capacity
- Review Bedrock rate limits

**Security Issues:**
- Verify IAM permissions are minimal
- Check S3 bucket policies
- Review CORS configuration

### Getting Help

1. **Vercel Support**: [vercel.com/support](https://vercel.com/support)
2. **AWS Support**: [aws.amazon.com/support](https://aws.amazon.com/support)
3. **GitHub Issues**: Create an issue in the repository

## 📈 Scaling Considerations

### Traffic Growth

- **Vercel**: Automatically scales serverless functions
- **DynamoDB**: On-demand billing scales automatically
- **S3**: No scaling needed
- **Bedrock**: Monitor rate limits and request increases if needed

### Cost Optimization

- **DynamoDB**: Use on-demand billing for variable traffic
- **S3**: Implement lifecycle policies for old images
- **Bedrock**: Monitor token usage and optimize prompts
- **Vercel**: Consider Pro plan for higher limits

### Performance Optimization

- **Caching**: Implement Redis for session data
- **CDN**: Use Vercel Edge Network
- **Images**: Optimize image sizes and formats
- **Database**: Add indexes for common queries