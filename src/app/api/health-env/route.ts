import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: process.env.AWS_REGION,
    dynamoTableName: process.env.DYNAMODB_TABLE_NAME,
    timestamp: new Date().toISOString()
  });
}