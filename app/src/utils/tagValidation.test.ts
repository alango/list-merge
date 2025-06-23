import { describe, it, expect } from 'vitest';
import { validateTag, validateTagForEdit } from './tagValidation';
import type { Tag, InputList } from '../types/index';

// Test data helpers
const createTag = (id: string, name: string): Tag => ({
  id,
  name,
  color: '#3b82f6',
  createdAt: new Date(),
  usageCount: 0
});

const createInputList = (id: string, name: string): InputList => ({
  id,
  name,
  items: []
});

describe('validateTag', () => {
  const existingTags: Tag[] = [
    createTag('1', 'project'),
    createTag('2', 'urgent'),
    createTag('3', 'Team Alpha')
  ];

  const inputLists: InputList[] = [
    createInputList('1', 'Todo Items'),
    createInputList('2', 'Features'),
    createInputList('3', 'bugs')
  ];

  describe('length validation', () => {
    it('should reject empty tag names', () => {
      const result = validateTag('', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tag name cannot be empty');
    });

    it('should reject tag names exceeding 50 characters', () => {
      const longName = 'a'.repeat(51);
      const result = validateTag(longName, existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tag name cannot exceed 50 characters');
    });

    it('should accept tag names at the 50 character limit', () => {
      const maxLengthName = 'a'.repeat(50);
      const result = validateTag(maxLengthName, existingTags, inputLists);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept tag names with 1 character', () => {
      const result = validateTag('a', existingTags, inputLists);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('whitespace validation', () => {
    it('should reject tag names that are only whitespace', () => {
      const result = validateTag('   ', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tag name cannot be just whitespace');
    });

    it('should reject tag names with tabs and spaces only', () => {
      const result = validateTag('\t \n ', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tag name cannot be just whitespace');
    });

    it('should accept tag names with leading/trailing whitespace (gets trimmed)', () => {
      const result = validateTag('  valid-tag  ', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });
  });

  describe('duplicate validation', () => {
    it('should reject exact duplicate tag names', () => {
      const result = validateTag('project', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A tag with this name already exists');
    });

    it('should reject case-insensitive duplicates', () => {
      const result = validateTag('PROJECT', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A tag with this name already exists');
    });

    it('should reject mixed case duplicates', () => {
      const result = validateTag('Project', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A tag with this name already exists');
    });

    it('should reject duplicates with different spacing', () => {
      const result = validateTag('Team Alpha', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A tag with this name already exists');
    });

    it('should accept unique tag names', () => {
      const result = validateTag('new-tag', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });
  });

  describe('reserved names validation', () => {
    it('should reject tag names that match input list names exactly', () => {
      const result = validateTag('Features', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot use source list names as tag names');
    });

    it('should reject tag names that match input list names case-insensitively', () => {
      const result = validateTag('BUGS', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot use source list names as tag names');
    });

    it('should reject tag names with mixed case that match input lists', () => {
      const result = validateTag('Todo Items', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot use source list names as tag names');
    });

    it('should accept tag names that are substrings of input list names', () => {
      const result = validateTag('Todo', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should work with empty existingTags array', () => {
      const result = validateTag('new-tag', [], inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should work with empty inputLists array', () => {
      const result = validateTag('new-tag', existingTags, []);
      expect(result.isValid).toBe(true);
    });

    it('should work with both arrays empty', () => {
      const result = validateTag('new-tag', [], []);
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters', () => {
      const result = validateTag('tag-with_special!chars', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const result = validateTag('tâg-wîth-ûnicøde', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should handle emojis', () => {
      const result = validateTag('tag-with-emoji-🚀', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateTagForEdit', () => {
  const existingTags: Tag[] = [
    createTag('1', 'project'),
    createTag('2', 'urgent'), 
    createTag('3', 'Team Alpha'),
    createTag('4', 'in-progress')
  ];

  const inputLists: InputList[] = [
    createInputList('1', 'Todo Items'),
    createInputList('2', 'Features')
  ];

  describe('length validation', () => {
    it('should reject empty tag names', () => {
      const result = validateTagForEdit('', '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tag name cannot be empty');
    });

    it('should reject tag names exceeding 50 characters', () => {
      const longName = 'a'.repeat(51);
      const result = validateTagForEdit(longName, '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tag name cannot exceed 50 characters');
    });

    it('should accept valid length tag names', () => {
      const result = validateTagForEdit('updated-tag', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });
  });

  describe('whitespace validation', () => {
    it('should reject tag names that are only whitespace', () => {
      const result = validateTagForEdit('   ', '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tag name cannot be just whitespace');
    });
  });

  describe('duplicate validation (excluding current tag)', () => {
    it('should allow keeping the same name (no change)', () => {
      const result = validateTagForEdit('urgent', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should allow case changes of the same tag', () => {
      const result = validateTagForEdit('URGENT', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should reject duplicates with other existing tags', () => {
      const result = validateTagForEdit('project', '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A tag with this name already exists');
    });

    it('should reject case-insensitive duplicates with other tags', () => {
      const result = validateTagForEdit('PROJECT', '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A tag with this name already exists');
    });

    it('should accept unique names when editing', () => {
      const result = validateTagForEdit('super-urgent', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });
  });

  describe('reserved names validation', () => {
    it('should reject tag names that match input list names', () => {
      const result = validateTagForEdit('Features', '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot use source list names as tag names');
    });

    it('should reject case-insensitive matches with input list names', () => {
      const result = validateTagForEdit('todo items', '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot use source list names as tag names');
    });
  });

  describe('edge cases', () => {
    it('should work with non-existent tag ID', () => {
      const result = validateTagForEdit('new-name', 'non-existent', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should work with empty existingTags array', () => {
      const result = validateTagForEdit('any-name', '1', [], inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should work with empty inputLists array', () => {
      const result = validateTagForEdit('any-name', '1', existingTags, []);
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in edit mode', () => {
      const result = validateTagForEdit('tag-with_special!chars', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });
  });

  describe('realistic editing scenarios', () => {
    it('should allow minor corrections (typo fixes)', () => {
      const result = validateTagForEdit('urgnet', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should allow adding prefixes/suffixes', () => {
      const result = validateTagForEdit('super-urgent', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should allow complete name changes to unique names', () => {
      const result = validateTagForEdit('high-priority', '2', existingTags, inputLists);
      expect(result.isValid).toBe(true);
    });

    it('should prevent changing to conflicting names', () => {
      const result = validateTagForEdit('in-progress', '2', existingTags, inputLists);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A tag with this name already exists');
    });
  });
});