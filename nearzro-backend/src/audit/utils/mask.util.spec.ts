// src/audit/utils/mask.util.spec.ts
import { maskSensitiveData } from './mask.util';

describe('maskSensitiveData', () => {
  const MASK = '***REDACTED***';

  describe('basic masking', () => {
    it('should mask password fields', () => {
      const input = { password: 'secret123' };
      const result = maskSensitiveData(input);
      expect(result.password).toBe(MASK);
    });

    it('should mask token fields', () => {
      const input = { token: 'abc123', accessToken: 'xyz789' };
      const result = maskSensitiveData(input);
      expect(result.token).toBe(MASK);
      expect(result.accessToken).toBe(MASK);
    });

    it('should mask fields containing secret', () => {
      const input = { apiSecret: 'secretkey' };
      const result = maskSensitiveData(input);
      expect(result.apiSecret).toBe(MASK);
    });

    it('should mask fields containing hash', () => {
      const input = { passwordHash: 'abc123' };
      const result = maskSensitiveData(input);
      expect(result.passwordHash).toBe(MASK);
    });

    it('should mask email fields', () => {
      const input = { email: 'test@example.com' };
      const result = maskSensitiveData(input);
      expect(result.email).toBe(MASK);
    });

    it('should mask phone fields', () => {
      const input = { phone: '+1234567890' };
      const result = maskSensitiveData(input);
      expect(result.phone).toBe(MASK);
    });

    it('should mask account fields', () => {
      const input = { accountNumber: '1234567890' };
      const result = maskSensitiveData(input);
      expect(result.accountNumber).toBe(MASK);
    });

    it('should mask doc fields', () => {
      const input = { docNumber: 'ABC123' };
      const result = maskSensitiveData(input);
      expect(result.docNumber).toBe(MASK);
    });
  });

  describe('case insensitive', () => {
    it('should mask regardless of case', () => {
      const input = { PASSWORD: 'secret', Password: 'secret', pAsSwOrD: 'secret' };
      const result = maskSensitiveData(input);
      expect(result.PASSWORD).toBe(MASK);
      expect(result.Password).toBe(MASK);
      expect(result.pAsSwOrD).toBe(MASK);
    });
  });

  describe('nested objects', () => {
    it('should mask nested sensitive fields', () => {
      const input = {
        user: {
          password: 'secret',
          profile: {
            phone: '123456'
          }
        }
      };
      const result = maskSensitiveData(input);
      expect(result.user.password).toBe(MASK);
      expect(result.user.profile.phone).toBe(MASK);
    });

    it('should preserve non-sensitive nested fields', () => {
      const input = {
        user: {
          name: 'John',
          age: 30
        }
      };
      const result = maskSensitiveData(input);
      expect(result.user.name).toBe('John');
      expect(result.user.age).toBe(30);
    });
  });

  describe('arrays', () => {
    it('should mask sensitive fields in array objects', () => {
      const input = {
        users: [
          { name: 'Alice', password: 'secret1' },
          { name: 'Bob', password: 'secret2' }
        ]
      };
      const result = maskSensitiveData(input);
      expect(result.users[0].password).toBe(MASK);
      expect(result.users[1].password).toBe(MASK);
    });
  });

  describe('primitives', () => {
    it('should return primitives unchanged', () => {
      expect(maskSensitiveData('string')).toBe('string');
      expect(maskSensitiveData(123)).toBe(123);
      expect(maskSensitiveData(true)).toBe(true);
    });

    it('should return null unchanged', () => {
      expect(maskSensitiveData(null)).toBe(null);
    });

    it('should return undefined unchanged', () => {
      expect(maskSensitiveData(undefined)).toBe(undefined);
    });
  });

  describe('partial matches', () => {
    it('should mask fields that partially contain sensitive keywords', () => {
      const input = {
        myPassword: 'secret',
        passwordResetToken: 'token',
        xToken: 'value',
        authToken: 'token'
      };
      const result = maskSensitiveData(input);
      expect(result.myPassword).toBe(MASK);
      expect(result.passwordResetToken).toBe(MASK);
      expect(result.xToken).toBe(MASK);
      expect(result.authToken).toBe(MASK);
    });
  });

  describe('circular references', () => {
    it('should handle circular references without infinite loops', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      const result = maskSensitiveData(obj);
      expect(result.name).toBe('test');
      expect(result.self).toBe(result);
    });
  });

  describe('non-objects', () => {
    it('should handle empty objects', () => {
      expect(maskSensitiveData({})).toEqual({});
    });

    it('should handle empty arrays', () => {
      expect(maskSensitiveData([])).toEqual([]);
    });
  });
});
