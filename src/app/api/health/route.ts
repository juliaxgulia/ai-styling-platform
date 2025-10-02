import { NextRequest, NextResponse } from 'next/server';
import { HealthChecker, logger } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Check AWS services health
    const awsHealth = await HealthChecker.checkAWSServices();
    
    // Check environment configuration
    const envHealth = {
      hasAwsConfig: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      hasDbConfig: !!process.env.DYNAMODB_TABLE_NAME,
      hasS3Config: !!process.env.S3_BUCKET_NAME,
      hasAuthConfig: !!process.env.NEXTAUTH_SECRET
    };

    const allHealthy = Object.values(awsHealth).every(Boolean) && 
                      Object.values(envHealth).every(Boolean);

    const responseTime = Date.now() - startTime;

    const healthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      services: {
        aws: awsHealth,
        environment: envHealth
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV
    };

    logger.info('Health check requested', {
      status: healthStatus.status,
      responseTime,
      userAgent: request.headers.get('user-agent')
    });

    return NextResponse.json(healthStatus, {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logger.error('Health check failed', error as Error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 500 });
  }
}