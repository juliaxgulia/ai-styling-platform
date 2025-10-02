# AI Personal Styling Platform

A conversational AI-powered personal styling system that creates comprehensive fashion profiles through natural conversation and computer vision analysis.

## 🌟 Features

- **Conversational Onboarding**: Natural chat-based style discovery using Claude 3.5 Sonnet
- **Body Shape Analysis**: AI-powered silhouette analysis from full-body photos
- **Color Palette Analysis**: Seasonal color palette determination from portrait photos
- **Comprehensive Style Profiling**: Schema-driven profiling across emotions, archetypes, essence, lifestyle, and values
- **Secure Photo Storage**: Privacy-focused image handling with automatic expiration
- **Real-time Chat Interface**: Responsive UI with typing indicators and progress tracking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- AWS Account with Bedrock, DynamoDB, and S3 access
- Vercel account for deployment

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-styling-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your AWS credentials and configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Deployment

See [Deployment Guide](./deployment.md) for detailed production setup instructions.

## 📖 Documentation

- [User Guide](./user-guide.md) - How to use the platform
- [API Documentation](./api.md) - API endpoints and usage
- [Deployment Guide](./deployment.md) - Production deployment setup
- [Development Guide](./development.md) - Development workflow and guidelines
- [Architecture Overview](./architecture.md) - System design and components

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

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AWS_REGION` | AWS region for services | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes |
| `DYNAMODB_TABLE_NAME` | DynamoDB table name | Yes |
| `S3_BUCKET_NAME` | S3 bucket for images | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |

### AWS Services Setup

1. **DynamoDB**: Single-table design for user profiles and sessions
2. **S3**: Secure image storage with signed URLs
3. **Bedrock**: Claude 3.5 Sonnet for AI interactions

See [AWS Setup Guide](../infrastructure/aws-setup.md) for detailed configuration.

## 🏗️ Architecture

The platform uses a modern serverless architecture:

- **Frontend**: Next.js with React and Tailwind CSS
- **Backend**: Next.js API routes
- **AI**: Claude 3.5 Sonnet via AWS Bedrock
- **Database**: DynamoDB single-table design
- **Storage**: S3 with signed URL uploads
- **Deployment**: Vercel with automated CI/CD

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- [Issue Tracker](https://github.com/your-org/ai-styling-platform/issues)
- [Discussions](https://github.com/your-org/ai-styling-platform/discussions)
- Email: support@yourdomain.com

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.