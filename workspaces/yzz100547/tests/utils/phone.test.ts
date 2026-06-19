import { maskPhone, validatePhone } from '../../src/utils/phone';

describe('Phone Utils', () => {
  describe('maskPhone', () => {
    it('should mask Chinese mobile phone correctly', () => {
      expect(maskPhone('13800138000')).toBe('138****8000');
    });

    it('should handle short phone numbers', () => {
      expect(maskPhone('123456')).toBe('123456');
    });

    it('should handle empty string', () => {
      expect(maskPhone('')).toBe('');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct Chinese mobile phone', () => {
      expect(validatePhone('13800138000')).toBe(true);
      expect(validatePhone('15912345678')).toBe(true);
      expect(validatePhone('18900001111')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('12345678901')).toBe(false);
      expect(validatePhone('23800138000')).toBe(false);
      expect(validatePhone('1380013800')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });
});
