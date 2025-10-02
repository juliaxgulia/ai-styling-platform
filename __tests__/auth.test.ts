import { validateEmail, validatePassword, validateRegistrationData } from '@/lib/validation';

describe('Authentication Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toEqual({ valid: true });
      expect(validateEmail('user.name@domain.co.uk')).toEqual({ valid: true });
      expect(validateEmail('test+tag@example.org')).toEqual({ valid: true });
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('')).toEqual({ valid: false, error: 'Email is required' });
      expect(validateEmail('invalid-email')).toEqual({ valid: false, error: 'Invalid email format' });
      expect(validateEmail('test@')).toEqual({ valid: false, error: 'Invalid email format' });
      expect(validateEmail('@example.com')).toEqual({ valid: false, error: 'Invalid email format' });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('Password123')).toEqual({ valid: true });
      expect(validatePassword('MySecure1Pass')).toEqual({ valid: true });
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('')).toEqual({ valid: false, error: 'Password is required' });
      expect(validatePassword('short')).toEqual({ valid: false, error: 'Password must be at least 8 characters long' });
      expect(validatePassword('alllowercase1')).toEqual({ 
        valid: false, 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
      expect(validatePassword('ALLUPPERCASE1')).toEqual({ 
        valid: false, 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
      expect(validatePassword('NoNumbers')).toEqual({ 
        valid: false, 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    });
  });

  describe('validateRegistrationData', () => {
    it('should validate correct registration data', () => {
      const result = validateRegistrationData({
        email: 'test@example.com',
        password: 'Password123'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should collect all validation errors', () => {
      const result = validateRegistrationData({
        email: 'invalid-email',
        password: 'weak'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });
});