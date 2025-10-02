import { s3Service } from '@/lib/s3';

describe('S3Service', () => {
  describe('generateImageKey', () => {
    it('should generate unique keys for body analysis', async () => {
      const key1 = s3Service.generateImageKey('user123', 'body', 'jpg');
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const key2 = s3Service.generateImageKey('user123', 'body', 'jpg');

      expect(key1).toMatch(/^users\/user123\/analysis\/body-\d+\.jpg$/);
      expect(key2).toMatch(/^users\/user123\/analysis\/body-\d+\.jpg$/);
      expect(key1).not.toBe(key2); // Should be unique due to timestamp
    });

    it('should generate unique keys for portrait analysis', () => {
      const key = s3Service.generateImageKey('user456', 'portrait', 'png');
      expect(key).toMatch(/^users\/user456\/analysis\/portrait-\d+\.png$/);
    });

    it('should handle different file extensions', () => {
      const jpgKey = s3Service.generateImageKey('user123', 'body', 'jpg');
      const pngKey = s3Service.generateImageKey('user123', 'body', 'png');
      const webpKey = s3Service.generateImageKey('user123', 'body', 'webp');

      expect(jpgKey).toMatch(/\.jpg$/);
      expect(pngKey).toMatch(/\.png$/);
      expect(webpKey).toMatch(/\.webp$/);
    });
  });

  describe('validateImageFile', () => {
    it('should validate JPEG files', () => {
      const result = s3Service.validateImageFile('photo.jpg', 'image/jpeg', 5000000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate PNG files', () => {
      const result = s3Service.validateImageFile('photo.png', 'image/png', 3000000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate WebP files', () => {
      const result = s3Service.validateImageFile('photo.webp', 'image/webp', 2000000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file types', () => {
      const result = s3Service.validateImageFile('document.pdf', 'application/pdf', 1000000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    });

    it('should reject files that are too large', () => {
      const result = s3Service.validateImageFile('huge.jpg', 'image/jpeg', 15000000); // 15MB
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size too large. Please upload an image smaller than 10MB.');
    });

    it('should reject files that are too small', () => {
      const result = s3Service.validateImageFile('tiny.jpg', 'image/jpeg', 500); // 500 bytes
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size too small. Please upload a valid image file.');
    });

    it('should validate without file size', () => {
      const result = s3Service.validateImageFile('photo.jpg', 'image/jpeg');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate file extension matches content type', () => {
      const validResult = s3Service.validateImageFile('photo.jpg', 'image/jpeg', 1000000);
      expect(validResult.valid).toBe(true);

      const invalidResult = s3Service.validateImageFile('photo.jpg', 'image/png', 1000000);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBe('File extension does not match the file type.');
    });

    it('should handle files without extensions', () => {
      const result = s3Service.validateImageFile('photo', 'image/jpeg', 1000000);
      expect(result.valid).toBe(true); // Should pass when no extension to validate
    });

    it('should handle jpeg vs jpg content types', () => {
      const jpegResult = s3Service.validateImageFile('photo.jpg', 'image/jpeg', 1000000);
      const jpgResult = s3Service.validateImageFile('photo.jpeg', 'image/jpg', 1000000);
      
      expect(jpegResult.valid).toBe(true);
      expect(jpgResult.valid).toBe(true);
    });
  });

  describe('validateImageForAnalysis', () => {
    it('should return body analysis requirements', () => {
      const requirements = s3Service.validateImageForAnalysis('body');
      
      expect(requirements.minWidth).toBe(400);
      expect(requirements.minHeight).toBe(600);
      expect(requirements.recommendations).toHaveLength(5);
      expect(requirements.recommendations[0]).toBe('Take a full-body photo from head to toe');
    });

    it('should return portrait analysis requirements', () => {
      const requirements = s3Service.validateImageForAnalysis('portrait');
      
      expect(requirements.minWidth).toBe(300);
      expect(requirements.minHeight).toBe(400);
      expect(requirements.recommendations).toHaveLength(5);
      expect(requirements.recommendations[0]).toBe('Take a clear photo of your face and upper body');
    });

    it('should provide different recommendations for different analysis types', () => {
      const bodyReqs = s3Service.validateImageForAnalysis('body');
      const portraitReqs = s3Service.validateImageForAnalysis('portrait');
      
      expect(bodyReqs.recommendations).not.toEqual(portraitReqs.recommendations);
      expect(bodyReqs.minWidth).not.toBe(portraitReqs.minWidth);
      expect(bodyReqs.minHeight).not.toBe(portraitReqs.minHeight);
    });
  });
});