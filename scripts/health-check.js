#!/usr/bin/env node

/**
 * Health Check Script
 * Verifies deployment health and functionality
 */

const https = require('https');
const http = require('http');

const config = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 3
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout after ${config.timeout}ms`));
    }, config.timeout);

    const req = client.get(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function checkEndpoint(path, expectedStatus = 200, description = '') {
  const url = `${config.baseUrl}${path}`;
  console.log(`🔍 Checking ${description || path}...`);
  
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const response = await makeRequest(url);
      
      if (response.statusCode === expectedStatus) {
        console.log(`✅ ${description || path} - OK (${response.statusCode})`);
        return response;
      } else {
        console.log(`⚠️  ${description || path} - Unexpected status: ${response.statusCode}`);
        if (attempt === config.retries) {
          throw new Error(`Expected ${expectedStatus}, got ${response.statusCode}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${description || path} - Attempt ${attempt}/${config.retries} failed: ${error.message}`);
      if (attempt === config.retries) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function checkHealthEndpoint() {
  try {
    const response = await checkEndpoint('/api/health', 200, 'Health Check');
    const healthData = JSON.parse(response.body);
    
    console.log('\n📊 Health Check Details:');
    console.log(`Status: ${healthData.status}`);
    console.log(`Response Time: ${healthData.responseTime}ms`);
    console.log(`Environment: ${healthData.environment}`);
    
    if (healthData.services) {
      console.log('\n🔧 Service Status:');
      if (healthData.services.aws) {
        console.log(`  DynamoDB: ${healthData.services.aws.dynamodb ? '✅' : '❌'}`);
        console.log(`  S3: ${healthData.services.aws.s3 ? '✅' : '❌'}`);
        console.log(`  Bedrock: ${healthData.services.aws.bedrock ? '✅' : '❌'}`);
      }
      if (healthData.services.environment) {
        console.log(`  AWS Config: ${healthData.services.environment.hasAwsConfig ? '✅' : '❌'}`);
        console.log(`  DB Config: ${healthData.services.environment.hasDbConfig ? '✅' : '❌'}`);
        console.log(`  S3 Config: ${healthData.services.environment.hasS3Config ? '✅' : '❌'}`);
        console.log(`  Auth Config: ${healthData.services.environment.hasAuthConfig ? '✅' : '❌'}`);
      }
    }
    
    return healthData.status === 'healthy';
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function checkCoreEndpoints() {
  const endpoints = [
    { path: '/', status: 200, description: 'Homepage' },
    { path: '/api/auth/register', status: 405, description: 'Auth Register (Method check)' },
    { path: '/api/chat/onboarding', status: 405, description: 'Onboarding Chat (Method check)' },
    { path: '/api/analysis/upload-url', status: 405, description: 'Upload URL (Method check)' }
  ];

  console.log('\n🔍 Checking Core Endpoints:');
  
  for (const endpoint of endpoints) {
    try {
      await checkEndpoint(endpoint.path, endpoint.status, endpoint.description);
    } catch (error) {
      console.error(`❌ ${endpoint.description} failed:`, error.message);
      return false;
    }
  }
  
  return true;
}

async function checkPerformance() {
  console.log('\n⚡ Performance Check:');
  
  const startTime = Date.now();
  try {
    await checkEndpoint('/', 200, 'Homepage Load Time');
    const loadTime = Date.now() - startTime;
    
    console.log(`📈 Homepage load time: ${loadTime}ms`);
    
    if (loadTime > 5000) {
      console.log('⚠️  Warning: Page load time is slow (>5s)');
      return false;
    } else if (loadTime > 3000) {
      console.log('⚠️  Warning: Page load time is moderate (>3s)');
    } else {
      console.log('✅ Page load time is good (<3s)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Performance check failed:', error.message);
    return false;
  }
}

async function runSmokeTests() {
  console.log('\n🧪 Running Smoke Tests:');
  
  // Test that would require actual API calls
  // For now, just check that endpoints are reachable
  const tests = [
    'Health endpoint accessible',
    'Core API endpoints responding',
    'Performance within limits'
  ];
  
  let passed = 0;
  
  try {
    if (await checkHealthEndpoint()) {
      console.log('✅ Health endpoint accessible');
      passed++;
    }
    
    if (await checkCoreEndpoints()) {
      console.log('✅ Core API endpoints responding');
      passed++;
    }
    
    if (await checkPerformance()) {
      console.log('✅ Performance within limits');
      passed++;
    }
    
    console.log(`\n📊 Smoke Tests: ${passed}/${tests.length} passed`);
    return passed === tests.length;
    
  } catch (error) {
    console.error('❌ Smoke tests failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🏥 Starting Health Check for AI Styling Platform');
  console.log(`🌐 Target URL: ${config.baseUrl}\n`);
  
  try {
    const allPassed = await runSmokeTests();
    
    if (allPassed) {
      console.log('\n🎉 All health checks passed! Deployment is healthy.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some health checks failed. Please investigate.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Health check script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkHealthEndpoint, checkCoreEndpoints, checkPerformance };