# AI Personal Styling Platform

A conversational AI-powered personal styling system that combines computer vision, machine learning, and fashion expertise to deliver hyper-personalized styling experiences.

## 🌟 Features

- **Conversational Onboarding**: Natural language style discovery using Claude 3.5 Sonnet
- **Photo Analysis**: Body shape and color palette analysis through computer vision
- **Style Profiling**: Structured style profiles using predefined schemas
- **Secure Storage**: Privacy-focused image and data handling
- **Real-time Chat**: Responsive UI with typing indicators and progress tracking
- **Production Ready**: Full CI/CD pipeline with monitoring and health checks

## 🚀 Tech Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes
- **AI**: Claude 3.5 Sonnet via AWS Bedrock
- **Database**: DynamoDB (single-table design)
- **Storage**: AWS S3 with signed URLs
- **Deployment**: Vercel with automated CI/CD
- **Monitoring**: Built-in logging and health checks

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS account with access to Bedrock, DynamoDB, and S3
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-styling-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your AWS credentials and configuration:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
DYNAMODB_TABLE_NAME=ai-styling-platform
S3_BUCKET_NAME=ai-styling-platform-images
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### AWS Setup

1. **DynamoDB Table**: Create a table named `ai-styling-platform` with:
   - Partition Key: `PK` (String)
   - Sort Key: `SK` (String)

2. **S3 Bucket**: Create a bucket named `ai-styling-platform-images` with:
   - Private access (no public read)
   - CORS configuration for your domain

3. **Bedrock Access**: Ensure your AWS account has access to Claude 3.5 Sonnet in Bedrock

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── lib/                 # Core utilities and services
│   ├── aws-config.ts    # AWS client configuration
│   ├── bedrock.ts       # Claude 3.5 Sonnet integration
│   ├── dynamodb.ts      # DynamoDB operations
│   ├── s3.ts           # S3 operations
│   ├── validation.ts    # Schema validation
│   └── errors.ts        # Error handling
└── types/              # TypeScript type definitions
    ├── schemas.ts       # Style profile schemas
    └── user.ts         # User and profile types
```

## Style Profile Schemas

The system uses structured schemas for consistent style profiling:

- **EMOTIONS**: How users want to feel (Confident, Powerful, Relaxed, etc.)
- **ARCHETYPE**: Personality-based preferences (The Hero, The Creator, etc.)
- **ESSENCE**: Lifestyle-based modes (Classic, Dramatic, Natural, etc.)
- **LIFESTYLE**: Daily patterns (Professional, Social, Casual, etc.)
- **VALUES**: Style values (Sustainable, Luxury, Timeless, etc.)
- **SILHOUETTE**: Body shape classifications
- **COLOR_PALETTE**: Seasonal color analysis

## API Endpoints

### Onboarding
- `POST /api/chat/onboarding` - Conversational style discovery
- `POST /api/chat/complete-profile` - Generate comprehensive profile
- `POST /api/profile/review` - Profile review and refinement

### Analysis
- `POST /api/analysis/upload-url` - Generate S3 signed URLs
- `POST /api/analysis/body-shape` - Body shape analysis
- `POST /api/analysis/color-palette` - Color palette analysis
- `POST /api/analysis/confirm` - Confirm analysis results

### Profile Management
- `GET/PUT /api/profile/style` - Style profile data
- `GET/PUT /api/profile/physical` - Physical analysis data
- `GET/PUT /api/profile/preferences` - User preferences

## 🚀 Production Deployment

### Quick Deploy to Vercel

1. **Automated AWS Setup**:
   ```bash
   npm run aws:setup
   ```

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy automatically on push to main

3. **Health Check**:
   ```bash
   npm run health:check
   ```

### Detailed Deployment Guide

See [docs/deployment.md](docs/deployment.md) for comprehensive production setup instructions.

### Deployment Checklist

Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) to ensure all deployment steps are completed.

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:performance # Performance tests
npm run test:security    # Security tests
```

## 📊 Monitoring

The platform includes comprehensive monitoring:

- **Health Checks**: `/api/health` endpoint
- **Performance Monitoring**: AI interaction metrics
- **Error Tracking**: Structured logging with context
- **Security Monitoring**: Automated security scans

## 📚 Documentation

- [User Guide](docs/user-guide.md) - How to use the platform
- [API Documentation](docs/api.md) - API endpoints and usage
- [Deployment Guide](docs/deployment.md) - Production deployment setup
- [Architecture Overview](docs/architecture.md) - System design and components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the test suite (`npm run test:all`)
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.