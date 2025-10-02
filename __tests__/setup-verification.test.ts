/**
 * Setup Verification Test
 * Verifies that the test environment is properly configured
 */

describe('Test Environment Setup', () => {
  it('should have proper environment variables', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.AWS_REGION).toBeDefined();
    expect(process.env.DYNAMODB_TABLE_NAME).toBeDefined();
    expect(process.env.S3_BUCKET_NAME).toBeDefined();
  });

  it('should have global mocks available', () => {
    expect(global.fetch).toBeDefined();
    expect(global.Request).toBeDefined();
    expect(global.Response).toBeDefined();
    expect(global.Headers).toBeDefined();
    expect(global.crypto).toBeDefined();
  });

  it('should have custom Jest matchers', () => {
    expect(5).toBeOneOf([1, 2, 3, 4, 5]);
    expect(5).toBeWithinRange(1, 10);
  });

  it('should be able to create mock requests', () => {
    const request = new Request('http://localhost:3000/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });

    expect(request.url).toBe('http://localhost:3000/test');
    expect(request.method).toBe('POST');
  });
});