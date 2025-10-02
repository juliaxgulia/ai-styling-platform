# Comprehensive Testing Suite

This directory contains a comprehensive testing suite that validates all requirements from the AI Personal Styling Platform specification. The testing suite is organized into multiple categories to ensure thorough coverage of functionality, performance, security, and reliability.

## Test Categories

### 1. End-to-End Tests (`/e2e/`)
**Purpose**: Test complete user journeys from start to finish
**Files**:
- `user-onboarding-journey.test.ts` - Complete onboarding flow validation

**Coverage**:
- User registration and authentication flow
- Conversational onboarding with style preference extraction
- Photo analysis workflow (body shape and color palette)
- Profile generation and review
- Complete journey integration

### 2. Integration Tests (`/integration/`)
**Purpose**: Test interactions between different system components
**Files**:
- `photo-analysis-integration.test.ts` - Photo upload, analysis, and confirmation workflow

**Coverage**:
- Secure photo upload infrastructure
- Body shape analysis with SILHOUETTE schema validation
- Color palette analysis with seasonal classification
- Analysis confirmation and profile updates
- Error handling in integrated workflows

### 3. Performance Tests (`/performance/`)
**Purpose**: Validate system performance under various load conditions
**Files**:
- `ai-performance.test.ts` - AI response times and resource usage

**Coverage**:
- Conversational AI response time thresholds
- Image analysis performance benchmarks
- Concurrent request handling
- Memory usage monitoring
- Performance regression detection

**Performance Thresholds**:
- Onboarding chat response: < 3 seconds
- Body shape analysis: < 10 seconds
- Color palette analysis: < 8 seconds
- Profile generation: < 5 seconds
- Upload URL generation: < 1 second

### 4. Security Tests (`/security/`)
**Purpose**: Validate security measures and data protection
**Files**:
- `data-protection.test.ts` - Authentication, authorization, and data security

**Coverage**:
- JWT authentication and token validation
- User authorization and access controls
- Input validation and sanitization
- Path traversal attack prevention
- SQL injection protection
- XSS prevention
- S3 security and signed URL validation
- Session security and management

### 5. Load Tests (`/load/`)
**Purpose**: Test system behavior under concurrent user load
**Files**:
- `concurrent-onboarding.test.ts` - Concurrent user scenarios

**Coverage**:
- Concurrent user registrations
- Simultaneous onboarding conversations
- Concurrent photo analysis requests
- Profile operations under load
- Stress testing with graceful degradation
- Memory monitoring during load

**Load Levels**:
- Light Load: 10 concurrent users
- Medium Load: 25 concurrent users
- Heavy Load: 50 concurrent users
- Stress Load: 100 concurrent users

### 6. Comprehensive Validation (`/`)
**Purpose**: Validate all specification requirements
**Files**:
- `comprehensive-validation.test.ts` - Complete requirements validation

**Coverage**:
- All Requirement 1 acceptance criteria (User Onboarding & Style Discovery)
- All Requirement 2 acceptance criteria (Frame & Color Analysis)
- Cross-requirement integration validation
- Schema validation (EMOTIONS, ARCHETYPE, ESSENCE, LIFESTYLE, VALUES, SILHOUETTE)

## Test Utilities (`/utils/`)

### `test-helpers.ts`
Provides shared utilities for all test categories:

**MockDataGenerator**: Generate test data for users, profiles, and preferences
**RequestBuilder**: Create authenticated and unauthenticated API requests
**PerformanceMonitor**: Measure and track operation performance
**LoadTestRunner**: Execute concurrent and batched load tests
**SecurityTestHelper**: Validate security measures and input sanitization
**MemoryMonitor**: Track memory usage during test execution
**ValidationHelper**: Validate API responses and data structures

## Running Tests

### Individual Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Security tests
npm run test:security

# Load tests
npm run test:load

# All tests with coverage
npm run test:all

# CI pipeline tests
npm run test:ci
```

### Specific Test Files
```bash
# Run specific test file
npm test -- --testPathPatterns=setup-verification

# Run tests matching pattern
npm test -- --testPathPatterns=security

# Run with coverage
npm test -- --coverage
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Test Environment**: jsdom for React component testing
- **Timeout**: 30 seconds for standard tests, up to 2 minutes for load tests
- **Coverage Thresholds**: 70% minimum for branches, functions, lines, and statements
- **Module Mapping**: Supports `@/` path aliases
- **Transform Ignore**: Handles ES modules from node_modules

### Setup File (`jest.setup.js`)
- **Environment Variables**: Mock AWS and application configuration
- **Global Mocks**: Request, Response, Headers, crypto, fetch
- **Custom Matchers**: `toBeOneOf`, `toBeWithinRange`
- **Polyfills**: Web APIs for Node.js test environment

## Requirements Validation

### Requirement 1: User Onboarding & Style Discovery
✅ **1.1**: Conversational onboarding flow initiation
✅ **1.2**: EMOTIONS schema capture and assignment
✅ **1.3**: ARCHETYPE schema capture and assignment
✅ **1.4**: ESSENCE schema capture and assignment
✅ **1.5**: LIFESTYLE schema capture and assignment
✅ **1.6**: VALUES schema capture and assignment
✅ **1.7**: Climate preference (zip code) capture
✅ **1.8**: Budget preference capture
✅ **1.9**: Comprehensive style profile generation
✅ **1.10**: Profile review and refinement capability
✅ **1.11**: Follow-up questions for unclear responses

### Requirement 2: Frame & Color Analysis
✅ **2.1**: Body shape analysis using SILHOUETTE schema
✅ **2.2**: Color palette analysis for seasonal determination
✅ **2.3**: Body shape confidence scores and user confirmation
✅ **2.4**: Color palette display with explanations
✅ **2.5**: Low confidence handling with additional input requests
✅ **2.6**: Analysis results storage in user profile
✅ **2.7**: Secure photo storage with privacy controls

## Test Data and Mocking

### AWS Services Mocking
All AWS services are mocked to prevent external dependencies:
- **Bedrock Runtime**: Mocked for AI model interactions
- **DynamoDB**: Mocked for profile data storage
- **S3**: Mocked for image storage and signed URLs

### Test Data Generation
Consistent test data generation using:
- **User IDs**: Unique identifiers with timestamps
- **Style Profiles**: Valid schema-compliant data
- **Physical Profiles**: Body shape and color palette data
- **Preferences**: Location and budget information

### Security Test Scenarios
Comprehensive security testing including:
- **Malicious Inputs**: XSS, SQL injection, path traversal attempts
- **Authentication Bypass**: Invalid and expired tokens
- **Authorization Violations**: Cross-user data access attempts
- **Input Validation**: File type restrictions and data sanitization

## Continuous Integration

The test suite is designed for CI/CD pipelines with:
- **Fast Feedback**: Unit tests run quickly for rapid iteration
- **Comprehensive Coverage**: Integration and E2E tests for deployment validation
- **Performance Monitoring**: Automated performance regression detection
- **Security Validation**: Automated security vulnerability testing
- **Load Testing**: Scalability validation under concurrent load

## Monitoring and Reporting

### Performance Metrics
- Response time measurements for all API endpoints
- Memory usage tracking during test execution
- Concurrent request success rates
- Performance regression detection

### Security Metrics
- Authentication and authorization test coverage
- Input validation effectiveness
- Data protection compliance
- Privacy control validation

### Coverage Metrics
- Code coverage across all source files
- Requirement coverage validation
- Test execution success rates
- Error scenario coverage

This comprehensive testing suite ensures that the AI Personal Styling Platform meets all specified requirements while maintaining high standards for performance, security, and reliability.