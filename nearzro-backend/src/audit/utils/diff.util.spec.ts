// src/audit/utils/diff.util.spec.ts
import { diffObjects, DiffResult } from './diff.util';

describe('diffObjects', () => {
  describe('basic differences', () => {
    it('should detect differences in primitive values', () => {
      const result = diffObjects('old', 'new');
      expect(result).toEqual([
        { path: '', before: 'old', after: 'new' },
      ]);
    });

    it('should return empty array for identical primitives', () => {
      const result = diffObjects('same', 'same');
      expect(result).toEqual([]);
    });

    it('should detect number differences', () => {
      const result = diffObjects(10, 20);
      expect(result).toEqual([
        { path: '', before: 10, after: 20 },
      ]);
    });

    it('should detect boolean differences', () => {
      const result = diffObjects(true, false);
      expect(result).toEqual([
        { path: '', before: true, after: false },
      ]);
    });
  });

  describe('object differences', () => {
    it('should detect differences in object properties', () => {
      const before = { name: 'John', age: 30 };
      const after = { name: 'Jane', age: 30 };
      const result = diffObjects(before, after);
      
      expect(result).toContainEqual({
        path: 'name',
        before: 'John',
        after: 'Jane',
      });
    });

    it('should return empty array for identical objects', () => {
      const obj = { name: 'John', age: 30 };
      const result = diffObjects(obj, obj);
      expect(result).toEqual([]);
    });

    it('should detect added properties', () => {
      const before = { name: 'John' };
      const after = { name: 'John', age: 30 };
      const result = diffObjects(before, after);
      
      expect(result).toContainEqual({
        path: 'age',
        before: undefined,
        after: 30,
      });
    });

    it('should detect removed properties', () => {
      const before = { name: 'John', age: 30 };
      const after = { name: 'John' };
      const result = diffObjects(before, after);
      
      expect(result).toContainEqual({
        path: 'age',
        before: 30,
        after: undefined,
      });
    });

    it('should use path for nested properties', () => {
      const before = { user: { name: 'John' } };
      const after = { user: { name: 'Jane' } };
      const result = diffObjects(before, after);
      
      expect(result).toContainEqual({
        path: 'user.name',
        before: 'John',
        after: 'Jane',
      });
    });

    it('should handle deep nested objects', () => {
      const before = {
        level1: {
          level2: {
            level3: 'old'
          }
        }
      };
      const after = {
        level1: {
          level2: {
            level3: 'new'
          }
        }
      };
      const result = diffObjects(before, after);
      
      expect(result).toContainEqual({
        path: 'level1.level2.level3',
        before: 'old',
        after: 'new',
      });
    });
  });

  describe('array differences', () => {
    it('should detect array differences', () => {
      const before = [1, 2, 3];
      const after = [1, 2, 4];
      const result = diffObjects(before, after);
      
      expect(result.length).toBeGreaterThan(0);
    });

    it('should detect array length differences', () => {
      const before = [1, 2];
      const after = [1, 2, 3];
      const result = diffObjects(before, after);
      
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('null and undefined', () => {
    it('should detect null to object differences', () => {
      const result = diffObjects(null, { name: 'John' });
      expect(result).toEqual([
        { path: '', before: null, after: { name: 'John' } },
      ]);
    });

    it('should detect object to null differences', () => {
      const result = diffObjects({ name: 'John' }, null);
      expect(result).toEqual([
        { path: '', before: { name: 'John' }, after: null },
      ]);
    });

    it('should handle undefined values', () => {
      const before = { name: undefined };
      const after = { name: 'John' };
      const result = diffObjects(before, after);
      
      expect(result).toContainEqual({
        path: 'name',
        before: undefined,
        after: 'John',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const result = diffObjects({}, {});
      expect(result).toEqual([]);
    });

    it('should handle both null', () => {
      const result = diffObjects(null, null);
      expect(result).toEqual([]);
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      const result = diffObjects(obj, { name: 'changed', self: obj });
      // Should not throw and should handle circular ref
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle mixed types', () => {
      const result = diffObjects('string', 123);
      expect(result).toEqual([
        { path: '', before: 'string', after: 123 },
      ]);
    });
  });

  describe('path building', () => {
    it('should build correct paths for multiple levels', () => {
      const before = {
        a: {
          b: {
            c: {
              d: 'old'
            }
          }
        }
      };
      const after = {
        a: {
          b: {
            c: {
              d: 'new'
            }
          }
        }
      };
      const result = diffObjects(before, after);
      
      expect(result).toContainEqual({
        path: 'a.b.c.d',
        before: 'old',
        after: 'new',
      });
    });

    it('should use empty path for root level differences', () => {
      const result = diffObjects('old', 'new');
      expect(result[0].path).toBe('');
    });
  });
});
