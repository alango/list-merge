import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from './fuzzyMatch';

describe('fuzzyMatch', () => {
  describe('perfect matches', () => {
    it('should return 100 for exact matches', () => {
      expect(fuzzyMatch('hello', 'hello')).toBe(100);
      expect(fuzzyMatch('test', 'test')).toBe(100);
      expect(fuzzyMatch('', '')).toBe(100);
    });

    it('should be case insensitive for exact matches', () => {
      expect(fuzzyMatch('Hello', 'hello')).toBe(100);
      expect(fuzzyMatch('TEST', 'test')).toBe(100);
      expect(fuzzyMatch('CamelCase', 'camelcase')).toBe(100);
    });
  });

  describe('starts with matches', () => {
    it('should return 90 for strings that start with query', () => {
      expect(fuzzyMatch('hel', 'hello')).toBe(90);
      expect(fuzzyMatch('test', 'testing')).toBe(90);
      expect(fuzzyMatch('a', 'apple')).toBe(90);
    });

    it('should be case insensitive for starts with', () => {
      expect(fuzzyMatch('HEL', 'hello')).toBe(90);
      expect(fuzzyMatch('Test', 'TESTING')).toBe(90);
    });
  });

  describe('contains matches', () => {
    it('should return 70 for strings that contain query', () => {
      expect(fuzzyMatch('ell', 'hello')).toBe(70);
      expect(fuzzyMatch('est', 'testing')).toBe(70);
      expect(fuzzyMatch('ppl', 'apple')).toBe(70);
    });

    it('should be case insensitive for contains', () => {
      expect(fuzzyMatch('ELL', 'hello')).toBe(70);
      expect(fuzzyMatch('Est', 'TESTING')).toBe(70);
    });
  });

  describe('character-by-character fuzzy matches', () => {
    it('should score partial character matches correctly', () => {
      // 'hlo' in 'hello' - h(10) + l(10) + o(10) = 30
      expect(fuzzyMatch('hlo', 'hello')).toBe(30);
      
      // 'tst' in 'testing' - t(10) + s(10) + t(10) = 30
      expect(fuzzyMatch('tst', 'testing')).toBe(30);
    });

    it('should handle scattered character matches', () => {
      // 'ace' in 'abcde' - a(10) + c(10) + e(10) = 30
      expect(fuzzyMatch('ace', 'abcde')).toBe(30);
      
      // 'bd' in 'abcde' - b(10) + d(10) = 20
      expect(fuzzyMatch('bd', 'abcde')).toBe(20);
    });

    it('should return 0 for partial character matches', () => {
      // 'xyz' in 'hello' - no characters match
      expect(fuzzyMatch('xyz', 'hello')).toBe(0);
      
      // 'hlz' in 'hello' - h(10) + l(10) but z not found, so 0
      expect(fuzzyMatch('hlz', 'hello')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', () => {
      // Empty query should match empty string exactly
      expect(fuzzyMatch('', '')).toBe(100);
      // Empty query should "start with" any non-empty string
      expect(fuzzyMatch('', 'hello')).toBe(90);
      expect(fuzzyMatch('', 'test')).toBe(90);
    });

    it('should return 0 for non-matching queries', () => {
      expect(fuzzyMatch('xyz', 'abc')).toBe(0);
      expect(fuzzyMatch('hello', 'world')).toBe(0);
    });

    it('should handle special characters', () => {
      expect(fuzzyMatch('!@#', '!@#$%')).toBe(90);
      expect(fuzzyMatch('@#', '!@#$%')).toBe(70);
    });

    it('should handle unicode characters', () => {
      expect(fuzzyMatch('café', 'café')).toBe(100);
      expect(fuzzyMatch('caf', 'café')).toBe(90);
    });

    it('should handle very long strings', () => {
      const longText = 'a'.repeat(1000) + 'test' + 'b'.repeat(1000);
      expect(fuzzyMatch('test', longText)).toBe(70);
    });
  });

  describe('ranking consistency', () => {
    it('should rank exact matches highest', () => {
      const query = 'test';
      const exact = fuzzyMatch(query, 'test');
      const startsWith = fuzzyMatch(query, 'testing');
      const contains = fuzzyMatch(query, 'latest');
      const fuzzy = fuzzyMatch(query, 'tset');

      expect(exact).toBeGreaterThan(startsWith);
      expect(startsWith).toBeGreaterThan(contains);
      expect(contains).toBeGreaterThan(fuzzy);
    });

    it('should provide consistent scoring for tag suggestions', () => {
      const query = 'proj';
      
      // These should be ranked in order of relevance
      const scores = [
        { name: 'project', score: fuzzyMatch(query, 'project') },
        { name: 'my-project', score: fuzzyMatch(query, 'my-project') },
        { name: 'important', score: fuzzyMatch(query, 'important') },
        { name: 'priority', score: fuzzyMatch(query, 'priority') }
      ].sort((a, b) => b.score - a.score);

      expect(scores[0].name).toBe('project'); // starts with 'proj'
      expect(scores[1].name).toBe('my-project'); // contains 'proj'
      expect(scores[0].score).toBeGreaterThan(scores[1].score);
    });
  });
});