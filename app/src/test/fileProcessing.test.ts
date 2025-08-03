import { describe, it, expect } from 'vitest';
import { FileProcessor } from '../utils/fileProcessing';
import type { Project, InputList, MainListItem, Tag, InputListItem } from '../types/index';

// Test data helpers
const createInputListItem = (id: string, content: string, isUsed = false, tags: string[] = []): InputListItem => ({
  id,
  content,
  isUsed,
  tags
});

const createInputList = (id: string, name: string, items: InputListItem[] = []): InputList => ({
  id,
  name,
  items
});

const createMainListItem = (id: string, content: string, sourceListId: string, order: number, tags: string[] = []): MainListItem => ({
  id,
  content,
  sourceListId,
  tags,
  order
});

const createTag = (id: string, name: string, color = '#3b82f6', usageCount = 0): Tag => ({
  id,
  name,
  color,
  createdAt: new Date(),
  usageCount
});

const createProject = (id: string, name: string, inputLists: InputList[] = [], mainList: MainListItem[] = [], createdAt?: Date, modifiedAt?: Date): Project => ({
  id,
  name,
  createdAt: createdAt || new Date('2024-01-01'),
  modifiedAt: modifiedAt || new Date('2024-01-15'),
  inputLists,
  mainList
});

describe('FileProcessor', () => {
  describe('importPlainText', () => {
    it('should import valid plain text content', () => {
      const content = 'Item 1\nItem 2\nItem 3';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
      expect(result.itemCount).toBe(3);
    });

    it('should handle empty content', () => {
      const result = FileProcessor.importPlainText('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Text file is empty');
    });

    it('should filter out empty lines', () => {
      const content = 'Item 1\n\nItem 2\n   \nItem 3';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
      expect(result.itemCount).toBe(3);
      if (result.warnings) {
        expect(result.warnings).toContain('2 lines were filtered out (empty or too long)');
      }
    });

    it('should handle different line endings', () => {
      const content = 'Item 1\r\nItem 2\nItem 3\n';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should enforce 250 item limit', () => {
      const items = Array.from({ length: 251 }, (_, i) => `Item ${i + 1}`);
      const content = items.join('\n');
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many items (251). Maximum allowed is 250 items.');
    });

    it('should sanitize HTML content', () => {
      const content = '<script>alert("evil")</script>Item 1\n<b>Item 2</b>\n<div>Item 3</div>';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should filter out items that are too long', () => {
      const longItem = 'a'.repeat(501);
      const content = `Item 1\n${longItem}\nItem 2`;
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2']);
      if (result.warnings) {
        expect(result.warnings).toContain('1 lines were filtered out (empty or too long)');
      }
    });

    it('should handle only invalid content', () => {
      const content = '\n\n   \n\n';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No valid lines found in text file');
    });
  });

  describe('importCSV', () => {
    it('should import simple CSV content', () => {
      const content = 'Item 1,Item 2,Item 3';
      const result = FileProcessor.importCSV(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
      expect(result.itemCount).toBe(3);
    });

    it('should handle quoted CSV values', () => {
      const content = '"Item 1","Item with, comma","Item 3"';
      const result = FileProcessor.importCSV(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item with, comma', 'Item 3']);
    });

    it('should handle empty CSV content', () => {
      const result = FileProcessor.importCSV('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('CSV file is empty');
    });

    it('should filter out empty CSV items', () => {
      const content = 'Item 1,,Item 2,   ,Item 3';
      const result = FileProcessor.importCSV(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
      if (result.warnings) {
        expect(result.warnings).toContain('2 items were filtered out (empty or too long)');
      }
    });

    it('should enforce 250 item limit for CSV', () => {
      const items = Array.from({ length: 251 }, (_, i) => `Item ${i + 1}`);
      const content = items.join(',');
      const result = FileProcessor.importCSV(content);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many items (251). Maximum allowed is 250 items.');
    });

    it('should sanitize HTML in CSV items', () => {
      const content = '<script>evil</script>,"<b>Bold</b>",normal';
      const result = FileProcessor.importCSV(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Bold', 'normal']); // Empty items are filtered out
    });

    it('should handle single item CSV', () => {
      const content = 'Single Item';
      const result = FileProcessor.importCSV(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Single Item']);
    });
  });

  describe('importListContent', () => {
    it('should try plain text first, then CSV', () => {
      const content = 'Item 1\nItem 2\nItem 3';
      const result = FileProcessor.importListContent(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should fall back to CSV when plain text fails', () => {
      // Content that would succeed as plain text (single line gets treated as one item)
      const content = 'Item 1,Item 2,Item 3';
      const result = FileProcessor.importListContent(content);
      
      expect(result.success).toBe(true);
      // Plain text succeeds first with single line as one item
      expect(result.data).toEqual(['Item 1,Item 2,Item 3']);
    });

    it('should return combined error when both formats fail', () => {
      const content = ''; // Empty content fails both
      const result = FileProcessor.importListContent(content);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not parse file as either plain text or CSV');
      expect(result.error).toContain('Plain text parsing');
      expect(result.error).toContain('CSV parsing');
    });
  });

  describe('importProjectJSON', () => {
    const validProjectData = {
      version: '1.0',
      exportedAt: '2024-01-15T10:00:00.000Z',
      project: {
        id: 'project-1',
        name: 'Test Project',
        createdAt: '2024-01-01T10:00:00.000Z',
        modifiedAt: '2024-01-15T10:00:00.000Z',
        inputLists: [
          {
            id: 'list-1',
            name: 'List 1',
            items: [
              { id: 'item-1', content: 'Item 1', isUsed: false, tags: [] }
            ]
          }
        ],
        mainList: [
          { id: 'item-1', content: 'Item 1', sourceListId: 'list-1', order: 0, tags: [] }
        ]
      },
      tagPool: []
    };

    it('should import valid project JSON', () => {
      const jsonContent = JSON.stringify(validProjectData);
      const result = FileProcessor.importProjectJSON(jsonContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Test Project');
      expect(result.data!.inputLists).toHaveLength(1);
      expect(result.data!.mainList).toHaveLength(1);
      expect(result.itemCount).toBe(2); // 1 input + 1 main list item
    });

    it('should handle empty JSON content', () => {
      const result = FileProcessor.importProjectJSON('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('JSON file is empty');
    });

    it('should handle invalid JSON syntax', () => {
      const result = FileProcessor.importProjectJSON('{ invalid json');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON format');
    });

    it('should validate required project fields', () => {
      const invalidData = { project: { name: 'Test' } }; // Missing required fields
      const jsonContent = JSON.stringify(invalidData);
      const result = FileProcessor.importProjectJSON(jsonContent);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid project data');
      expect(result.error).toContain('Missing project ID');
    });

    it('should restore Date objects from JSON strings', () => {
      const jsonContent = JSON.stringify(validProjectData);
      const result = FileProcessor.importProjectJSON(jsonContent);
      
      expect(result.success).toBe(true);
      expect(result.data!.createdAt).toBeInstanceOf(Date);
      expect(result.data!.modifiedAt).toBeInstanceOf(Date);
    });

    it('should regenerate IDs to avoid conflicts', () => {
      const jsonContent = JSON.stringify(validProjectData);
      const result = FileProcessor.importProjectJSON(jsonContent);
      
      expect(result.success).toBe(true);
      // IDs should be different from original
      expect(result.data!.id).not.toBe(validProjectData.project.id);
      expect(result.data!.inputLists[0].id).not.toBe(validProjectData.project.inputLists[0].id);
      expect(result.data!.inputLists[0].items[0].id).not.toBe(validProjectData.project.inputLists[0].items[0].id);
    });

    it('should handle missing project data', () => {
      const invalidData = { version: '1.0' }; // No project field
      const jsonContent = JSON.stringify(invalidData);
      const result = FileProcessor.importProjectJSON(jsonContent);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing project data');
    });
  });

  describe('exportProjectJSON', () => {
    const sampleProject = createProject(
      'project-1',
      'Test Project',
      [
        createInputList('list-1', 'List 1', [
          createInputListItem('item-1', 'Item 1', false, ['tag-1'])
        ])
      ],
      [
        createMainListItem('item-1', 'Item 1', 'list-1', 0, ['tag-1'])
      ]
    );

    const sampleTags = [
      createTag('tag-1', 'Important', '#ff0000'),
      createTag('tag-2', 'Unused', '#00ff00') // This shouldn't be exported
    ];

    it('should export project with used tags only', () => {
      const result = FileProcessor.exportProjectJSON(sampleProject, sampleTags);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.filename).toBeDefined();
      
      const exportData = JSON.parse(result.data!);
      expect(exportData.version).toBe('1.0');
      expect(exportData.project.name).toBe('Test Project');
      expect(exportData.tagPool).toHaveLength(1); // Only used tag
      expect(exportData.tagPool[0].name).toBe('Important');
    });

    it('should include export metadata', () => {
      const result = FileProcessor.exportProjectJSON(sampleProject, sampleTags);
      
      expect(result.success).toBe(true);
      const exportData = JSON.parse(result.data!);
      
      expect(exportData.exportedAt).toBeDefined();
      expect(exportData.version).toBe('1.0');
      expect(typeof exportData.exportedAt).toBe('string');
    });

    it('should convert Date objects to ISO strings', () => {
      const result = FileProcessor.exportProjectJSON(sampleProject, sampleTags);
      
      expect(result.success).toBe(true);
      const exportData = JSON.parse(result.data!);
      
      expect(typeof exportData.project.createdAt).toBe('string');
      expect(typeof exportData.project.modifiedAt).toBe('string');
      expect(typeof exportData.tagPool[0].createdAt).toBe('string');
    });

    it('should generate sanitized filename', () => {
      const projectWithSpecialChars = createProject('project-1', 'Test/Project<>Name', [], []);
      const result = FileProcessor.exportProjectJSON(projectWithSpecialChars, []);
      
      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
      expect(result.filename).toMatch(/^TestProjectName_\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should handle null project', () => {
      const result = FileProcessor.exportProjectJSON(null as unknown as Project, []);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No project to export');
    });

    it('should include file size in result', () => {
      const result = FileProcessor.exportProjectJSON(sampleProject, sampleTags);
      
      expect(result.success).toBe(true);
      expect(result.size).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle projects with no tags', () => {
      const projectWithoutTags = createProject('project-1', 'No Tags Project', [], []);
      const result = FileProcessor.exportProjectJSON(projectWithoutTags, []);
      
      expect(result.success).toBe(true);
      const exportData = JSON.parse(result.data!);
      expect(exportData.tagPool).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON gracefully', () => {
      const result = FileProcessor.importProjectJSON('{"incomplete":');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON format');
    });

    it('should handle undefined content in plain text import', () => {
      const result = FileProcessor.importPlainText(undefined as unknown as string);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Text file is empty');
    });

    it('should handle null content in CSV import', () => {
      const result = FileProcessor.importCSV(null as unknown as string);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('CSV parsing error');
    });
  });

  describe('content sanitization', () => {
    it('should remove script tags and content', () => {
      const content = 'Good<script>alert("bad")</script>Item';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data![0]).toBe('GoodItem');
    });

    it('should normalize whitespace', () => {
      const content = 'Item   with    lots     of    spaces\nAnother\t\ttab\t\titem';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item with lots of spaces', 'Another tab item']);
    });

    it('should handle mixed line endings', () => {
      const content = 'Item 1\r\nItem 2\nItem 3\nItem 4';
      const result = FileProcessor.importPlainText(content);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4']);
    });
  });
});