import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState, Project, InputList, MainListItem, Tag, InputListItem } from '../types/index';

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

// File processing results  
interface ImportResult<T = string[]> {
  success: boolean;
  data?: T;
  error?: string;
  itemCount?: number;
  warnings?: string[];
}

interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
  size?: number;
}

// File processing manager for Phase 6 implementation
class FileProcessor {
  private state: AppState;
  
  constructor(state: AppState) {
    this.state = state;
  }

  // CSV Import - single row format with comma-separated values
  importCSV(csvContent: string): ImportResult<string[]> {
    try {
      if (!csvContent.trim()) {
        return { success: false, error: 'CSV file is empty' };
      }

      // Parse CSV - simple implementation for single-row format
      const items = this.parseCSVRow(csvContent.trim());
      
      if (items.length === 0) {
        return { success: false, error: 'No valid items found in CSV' };
      }

      // Validate and sanitize items
      const validItems = items
        .map(item => this.sanitizeContent(item))
        .filter(item => item.length > 0)
        .filter(item => item.length <= 500); // Max content length

      if (validItems.length === 0) {
        return { success: false, error: 'No valid items after sanitization' };
      }

      const warnings: string[] = [];
      if (validItems.length < items.length) {
        warnings.push(`${items.length - validItems.length} items were filtered out (empty or too long)`);
      }

      return {
        success: true,
        data: validItems,
        itemCount: validItems.length,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return { success: false, error: `CSV parsing error: ${(error as Error).message}` };
    }
  }

  // Plain text import - line-by-line format
  importPlainText(textContent: string): ImportResult<string[]> {
    try {
      if (!textContent || textContent.length === 0) {
        return { success: false, error: 'Text file is empty' };
      }

      // Parse lines and filter out empty ones
      const lines = textContent
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (lines.length === 0) {
        return { success: false, error: 'No valid lines found in text file' };
      }

      // Validate and sanitize items
      const validItems = lines
        .map(line => this.sanitizeContent(line))
        .filter(item => item.length > 0)
        .filter(item => item.length <= 500); // Max content length

      if (validItems.length === 0) {
        return { success: false, error: 'No valid items after sanitization' };
      }

      const warnings: string[] = [];
      if (validItems.length < lines.length) {
        warnings.push(`${lines.length - validItems.length} lines were filtered out (empty or too long)`);
      }

      return {
        success: true,
        data: validItems,
        itemCount: validItems.length,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return { success: false, error: `Text parsing error: ${(error as Error).message}` };
    }
  }

  // JSON project import - complete project data
  importProjectJSON(jsonContent: string): ImportResult<Project> {
    try {
      if (!jsonContent.trim()) {
        return { success: false, error: 'JSON file is empty' };
      }

      const projectData = JSON.parse(jsonContent);

      // Validate project structure
      const validation = this.validateProjectJSON(projectData);
      if (!validation.isValid) {
        return { success: false, error: `Invalid project data: ${validation.errors.join(', ')}` };
      }

      // Convert date strings back to Date objects
      const restoredProject = this.restoreProjectDates(projectData);

      // Regenerate IDs to avoid conflicts
      const projectWithNewIds = this.regenerateProjectIds(restoredProject);

      return {
        success: true,
        data: projectWithNewIds,
        itemCount: this.calculateProjectItemCount(projectWithNewIds),
        warnings: []
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { success: false, error: 'Invalid JSON format' };
      }
      return { success: false, error: `JSON import error: ${(error as Error).message}` };
    }
  }

  // Export project to JSON
  exportProjectJSON(project: Project): ExportResult {
    try {
      if (!project) {
        return { success: false, error: 'No project to export' };
      }

      // Validate project before export
      const validation = this.validateProjectForExport(project);
      if (!validation.isValid) {
        return { success: false, error: `Project validation failed: ${validation.errors.join(', ')}` };
      }

      // Create export data with metadata
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          modifiedAt: project.modifiedAt.toISOString(),
          tags: this.getProjectTags(project)
        }
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const filename = `${this.sanitizeFilename(project.name)}_${new Date().toISOString().split('T')[0]}.json`;

      return {
        success: true,
        data: jsonString,
        filename,
        size: new Blob([jsonString]).size
      };
    } catch (error) {
      return { success: false, error: `Export error: ${(error as Error).message}` };
    }
  }

  // Export input list to CSV
  exportListCSV(list: InputList): ExportResult {
    try {
      if (!list || !list.items || list.items.length === 0) {
        return { success: false, error: 'List is empty or invalid' };
      }

      // Convert to CSV format - single row with comma-separated values
      const csvContent = list.items
        .map(item => this.escapeCSVValue(item.content))
        .join(',');

      const filename = `${this.sanitizeFilename(list.name)}_${new Date().toISOString().split('T')[0]}.csv`;

      return {
        success: true,
        data: csvContent,
        filename,
        size: new Blob([csvContent]).size
      };
    } catch (error) {
      return { success: false, error: `CSV export error: ${(error as Error).message}` };
    }
  }

  // Export input list to plain text
  exportListText(list: InputList): ExportResult {
    try {
      if (!list || !list.items || list.items.length === 0) {
        return { success: false, error: 'List is empty or invalid' };
      }

      // Convert to plain text format - one item per line
      const textContent = list.items
        .map(item => item.content.trim())
        .join('\n');

      const filename = `${this.sanitizeFilename(list.name)}_${new Date().toISOString().split('T')[0]}.txt`;

      return {
        success: true,
        data: textContent,
        filename,
        size: new Blob([textContent]).size
      };
    } catch (error) {
      return { success: false, error: `Text export error: ${(error as Error).message}` };
    }
  }

  // Helper: Parse CSV row (handles quoted values)
  private parseCSVRow(csvRow: string): string[] {
    const items: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvRow.length; i++) {
      const char = csvRow[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        items.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last item
    items.push(current.trim());
    
    return items; // Return all items including empty ones for warning counting
  }

  // Helper: Sanitize content (remove HTML, trim, validate)
  private sanitizeContent(content: string): string {
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags and content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Helper: Escape CSV values (add quotes if needed)
  private escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // Helper: Sanitize filename
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .slice(0, 50); // Limit length
  }

  // Helper: Validate project JSON structure
  private validateProjectJSON(data: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object' || !('project' in data)) {
      errors.push('Missing project data');
      return { isValid: false, errors };
    }

    const project = (data as { project: Record<string, unknown> }).project;

    if (!project.id) errors.push('Missing project ID');
    if (!project.name) errors.push('Missing project name');
    if (!project.createdAt) errors.push('Missing createdAt');
    if (!project.modifiedAt) errors.push('Missing modifiedAt');
    if (!Array.isArray(project.inputLists)) errors.push('Invalid inputLists');
    if (!Array.isArray(project.mainList)) errors.push('Invalid mainList');

    return { isValid: errors.length === 0, errors };
  }

  // Helper: Restore Date objects from JSON
  private restoreProjectDates(projectData: Record<string, unknown>): Project {
    const project = projectData.project as Record<string, unknown>;
    return {
      ...project,
      createdAt: new Date(project.createdAt as string),
      modifiedAt: new Date(project.modifiedAt as string),
      tags: (project.tags as Array<Record<string, unknown>>)?.map((tag) => ({
        ...tag,
        createdAt: new Date(tag.createdAt as string)
      })) || []
    } as unknown as Project;
  }

  // Helper: Regenerate all IDs to avoid conflicts
  private regenerateProjectIds(project: Project): Project {
    const idMap = new Map<string, string>();
    const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Generate new project ID
    const newProjectId = generateId();

    // Regenerate input list and item IDs
    const newInputLists = project.inputLists.map(list => {
      const newListId = generateId();
      idMap.set(list.id, newListId);

      return {
        ...list,
        id: newListId,
        items: list.items.map(item => {
          const newItemId = generateId();
          idMap.set(item.id, newItemId);
          return { ...item, id: newItemId };
        })
      };
    });

    // Regenerate main list IDs and update source references
    const newMainList = project.mainList.map(item => {
      const newItemId = idMap.get(item.id) || generateId();
      const newSourceListId = idMap.get(item.sourceListId) || item.sourceListId;
      
      return {
        ...item,
        id: newItemId,
        sourceListId: newSourceListId
      };
    });

    return {
      ...project,
      id: newProjectId,
      inputLists: newInputLists,
      mainList: newMainList
    };
  }

  // Helper: Get all tags used in project
  private getProjectTags(project: Project): Tag[] {
    const tagIds = new Set<string>();
    
    project.inputLists.forEach(list => {
      list.items.forEach(item => {
        item.tags.forEach(tagId => tagIds.add(tagId));
      });
    });

    project.mainList.forEach(item => {
      item.tags.forEach(tagId => tagIds.add(tagId));
    });

    return this.state.tagPool.filter(tag => tagIds.has(tag.id));
  }

  // Helper: Calculate total item count in project
  private calculateProjectItemCount(project: Project): number {
    const inputItemCount = project.inputLists.reduce((total, list) => total + list.items.length, 0);
    return inputItemCount + project.mainList.length;
  }

  // Helper: Validate project for export
  private validateProjectForExport(project: Project): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!project.id) errors.push('Project missing ID');
    if (!project.name) errors.push('Project missing name');
    if (!project.createdAt) errors.push('Project missing createdAt');
    if (!project.modifiedAt) errors.push('Project missing modifiedAt');

    // Check for ID uniqueness within categories (not across - items can be shared between input and main)
    const listIds: string[] = [];
    const inputItemIds: string[] = [];
    
    project.inputLists?.forEach(list => {
      listIds.push(list.id);
      list.items?.forEach(item => inputItemIds.push(item.id));
    });

    // Check for duplicate list IDs
    const uniqueListIds = new Set(listIds);
    if (listIds.length !== uniqueListIds.size) {
      errors.push('Project contains duplicate list IDs');
    }

    // Check for duplicate input item IDs
    const uniqueInputIds = new Set(inputItemIds);
    if (inputItemIds.length !== uniqueInputIds.size) {
      errors.push('Project contains duplicate input item IDs');
    }

    return { isValid: errors.length === 0, errors };
  }
}

describe('File Processing - Import Operations', () => {
  let fileProcessor: FileProcessor;
  let mockState: AppState;

  beforeEach(() => {
    const mockProject = createProject('test1', 'Test Project');
    const mockTags = [
      createTag('tag1', 'Priority', '#ef4444'),
      createTag('tag2', 'Development', '#3b82f6')
    ];

    mockState = {
      currentProject: mockProject,
      savedProjects: [],
      tagPool: mockTags,
      ui: { selectedItems: [], activeInputList: null, anchorItem: null }
    };

    fileProcessor = new FileProcessor(mockState);
  });

  describe('CSV Import', () => {
    it('should parse simple CSV content', () => {
      const csvContent = 'Write project proposal,Review budget documents,Schedule team meeting';
      const result = fileProcessor.importCSV(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        'Write project proposal',
        'Review budget documents', 
        'Schedule team meeting'
      ]);
      expect(result.itemCount).toBe(3);
    });

    it('should handle quoted CSV values with commas', () => {
      const csvContent = '"Task with, comma","Another task","Simple task"';
      const result = fileProcessor.importCSV(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        'Task with, comma',
        'Another task',
        'Simple task'
      ]);
    });

    it('should handle CSV with mixed quoted and unquoted values', () => {
      const csvContent = 'Simple task,"Task with, comma",Another simple task';
      const result = fileProcessor.importCSV(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        'Simple task',
        'Task with, comma',
        'Another simple task'
      ]);
    });

    it('should reject empty CSV content', () => {
      const result = fileProcessor.importCSV('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('CSV file is empty');
    });

    it('should reject CSV with only whitespace', () => {
      const result = fileProcessor.importCSV('   \n\t  ');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('CSV file is empty');
    });

    it('should filter out empty items and provide warnings', () => {
      const csvContent = 'Valid task,,Another valid task,   ,Final task';
      const result = fileProcessor.importCSV(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Valid task', 'Another valid task', 'Final task']);
      expect(result.warnings).toContain('2 items were filtered out (empty or too long)');
    });

    it('should filter out items that are too long', () => {
      const longItem = 'A'.repeat(501); // Over 500 char limit
      const csvContent = `Valid task,${longItem},Another valid task`;
      const result = fileProcessor.importCSV(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Valid task', 'Another valid task']);
      expect(result.warnings).toContain('1 items were filtered out (empty or too long)');
    });

    it('should sanitize HTML content', () => {
      const csvContent = 'Normal task,<b>Bold task</b>,<script>alert("bad")</script>Clean task';
      const result = fileProcessor.importCSV(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Normal task', 'Bold task', 'Clean task']);
    });

    it('should handle malformed CSV gracefully', () => {
      const csvContent = 'Task 1,"Unclosed quote,Task 2';
      const result = fileProcessor.importCSV(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Plain Text Import', () => {
    it('should parse line-by-line text content', () => {
      const textContent = `Write project proposal
Review budget documents
Schedule team meeting`;
      const result = fileProcessor.importPlainText(textContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        'Write project proposal',
        'Review budget documents',
        'Schedule team meeting'
      ]);
      expect(result.itemCount).toBe(3);
    });

    it('should handle different line endings', () => {
      const textContent = 'Task 1\r\nTask 2\nTask 3\r\n\rTask 4';
      const result = fileProcessor.importPlainText(textContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4']);
    });

    it('should filter out empty lines', () => {
      const textContent = `Task 1

Task 2
   
Task 3


Task 4`;
      const result = fileProcessor.importPlainText(textContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4']);
    });

    it('should reject empty text content', () => {
      const result = fileProcessor.importPlainText('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Text file is empty');
    });

    it('should reject text with only empty lines', () => {
      const result = fileProcessor.importPlainText('\n\n   \n\t\n');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No valid lines found in text file');
    });

    it('should sanitize HTML and normalize whitespace', () => {
      const textContent = `Normal task
<p>HTML   task   with   spaces</p>
<script>alert("bad")</script>  
Final task`;
      const result = fileProcessor.importPlainText(textContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Normal task', 'HTML task with spaces', 'Final task']);
    });

    it('should provide warnings for filtered content', () => {
      const longLine = 'A'.repeat(501);
      const textContent = `Valid task
${longLine}
Another valid task`;
      const result = fileProcessor.importPlainText(textContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Valid task', 'Another valid task']);
      expect(result.warnings).toContain('1 lines were filtered out (empty or too long)');
    });
  });

  describe('JSON Project Import', () => {
    it('should import valid project JSON', () => {
      const project = createProject('import1', 'Imported Project', [
        createInputList('list1', 'Imported List', [
          createInputListItem('item1', 'Imported Task', false, ['tag1'])
        ])
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          modifiedAt: project.modifiedAt.toISOString(),
          tags: [createTag('tag1', 'Priority')]
        }
      };

      const result = fileProcessor.importProjectJSON(JSON.stringify(exportData));
      
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Imported Project');
      expect(result.data!.inputLists).toHaveLength(1);
      expect(result.data!.inputLists[0].items).toHaveLength(1);
      expect(result.itemCount).toBe(1);
    });

    it('should regenerate IDs to avoid conflicts', () => {
      const project = createProject('import1', 'Imported Project', [
        createInputList('list1', 'List 1', [
          createInputListItem('item1', 'Task 1')
        ])
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          modifiedAt: project.modifiedAt.toISOString()
        }
      };

      const result = fileProcessor.importProjectJSON(JSON.stringify(exportData));
      
      expect(result.success).toBe(true);
      expect(result.data!.id).not.toBe('import1');
      expect(result.data!.inputLists[0].id).not.toBe('list1');
      expect(result.data!.inputLists[0].items[0].id).not.toBe('item1');
    });

    it('should restore Date objects from ISO strings', () => {
      const project = createProject('import1', 'Imported Project');
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          ...project,
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-15T12:00:00.000Z'
        }
      };

      const result = fileProcessor.importProjectJSON(JSON.stringify(exportData));
      
      expect(result.success).toBe(true);
      expect(result.data!.createdAt).toBeInstanceOf(Date);
      expect(result.data!.modifiedAt).toBeInstanceOf(Date);
      expect(result.data!.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should reject malformed JSON', () => {
      const result = fileProcessor.importProjectJSON('{invalid json');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON format');
    });

    it('should reject JSON missing required project fields', () => {
      const invalidData = {
        version: '1.0',
        project: {
          // Missing required fields
          inputLists: [],
          mainList: []
        }
      };

      const result = fileProcessor.importProjectJSON(JSON.stringify(invalidData));
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid project data');
    });

    it('should reject empty JSON content', () => {
      const result = fileProcessor.importProjectJSON('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('JSON file is empty');
    });

    it('should handle complex project with tags and relationships', () => {
      const project = createProject('complex1', 'Complex Project', [
        createInputList('list1', 'List 1', [
          createInputListItem('item1', 'Task 1', false, ['tag1', 'tag2']),
          createInputListItem('item2', 'Task 2', true, ['tag1'])
        ])
      ], [
        createMainListItem('item2', 'Task 2', 'list1', 1, ['tag1'])
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          modifiedAt: project.modifiedAt.toISOString(),
          tags: [
            createTag('tag1', 'Priority'),
            createTag('tag2', 'Development')
          ]
        }
      };

      const result = fileProcessor.importProjectJSON(JSON.stringify(exportData));
      
      expect(result.success).toBe(true);
      expect(result.data!.inputLists[0].items[0].tags).toHaveLength(2);
      expect(result.data!.mainList[0].tags).toHaveLength(1);
      expect(result.itemCount).toBe(3); // 2 input + 1 main
    });
  });
});

describe('File Processing - Export Operations', () => {
  let fileProcessor: FileProcessor;
  let mockState: AppState;
  let testProject: Project;

  beforeEach(() => {
    testProject = createProject('test1', 'Test Project', [
      createInputList('list1', 'Todo Items', [
        createInputListItem('item1', 'Write project proposal', false, ['tag1']),
        createInputListItem('item2', 'Review budget documents', false, ['tag2']),
        createInputListItem('item3', 'Schedule team meeting', true, ['tag1'])
      ]),
      createInputList('list2', 'Features', [
        createInputListItem('item4', 'Dark mode toggle', false),
        createInputListItem('item5', 'Export feature', false, ['tag2'])
      ])
    ], [
      createMainListItem('item3', 'Schedule team meeting', 'list1', 1, ['tag1']),
      createMainListItem('item6', 'User authentication', 'list2', 2, ['tag2'])
    ]);

    const mockTags = [
      createTag('tag1', 'High Priority', '#ef4444', 2),
      createTag('tag2', 'Development', '#3b82f6', 3)
    ];

    mockState = {
      currentProject: testProject,
      savedProjects: [],
      tagPool: mockTags,
      ui: { selectedItems: [], activeInputList: null, anchorItem: null }
    };

    fileProcessor = new FileProcessor(mockState);
  });

  describe('Project JSON Export', () => {
    it('should export complete project as JSON', () => {
      const result = fileProcessor.exportProjectJSON(testProject);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.filename).toMatch(/Test_Project_\d{4}-\d{2}-\d{2}\.json/);
      expect(result.size).toBeGreaterThan(0);

      // Verify JSON structure
      const exportData = JSON.parse(result.data!);
      expect(exportData.version).toBe('1.0');
      expect(exportData.exportedAt).toBeTruthy();
      expect(exportData.project.name).toBe('Test Project');
      expect(exportData.project.inputLists).toHaveLength(2);
      expect(exportData.project.mainList).toHaveLength(2);
      expect(exportData.project.tags).toHaveLength(2);
    });

    it('should convert dates to ISO strings', () => {
      const result = fileProcessor.exportProjectJSON(testProject);
      
      expect(result.success).toBe(true);
      
      const exportData = JSON.parse(result.data!);
      expect(typeof exportData.project.createdAt).toBe('string');
      expect(typeof exportData.project.modifiedAt).toBe('string');
      expect(exportData.project.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include only tags used in the project', () => {
      const result = fileProcessor.exportProjectJSON(testProject);
      
      expect(result.success).toBe(true);
      
      const exportData = JSON.parse(result.data!);
      expect(exportData.project.tags).toHaveLength(2);
      
      const tagIds = exportData.project.tags.map((tag: Tag) => tag.id);
      expect(tagIds).toContain('tag1');
      expect(tagIds).toContain('tag2');
    });

    it('should reject null/undefined project', () => {
      const result = fileProcessor.exportProjectJSON(null as unknown as Project);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No project to export');
    });

    it('should validate project before export', () => {
      const invalidProject = { ...testProject, id: '', name: '' } as Project;
      
      const result = fileProcessor.exportProjectJSON(invalidProject);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Project validation failed');
    });

    it('should handle projects with special characters in name', () => {
      const specialProject = { ...testProject, name: 'Test/Project:With*Special<>Chars|?' };
      
      const result = fileProcessor.exportProjectJSON(specialProject);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/TestProjectWithSpecialChars_\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should generate valid JSON that can be parsed', () => {
      const result = fileProcessor.exportProjectJSON(testProject);
      
      expect(result.success).toBe(true);
      
      // Should be able to parse without errors
      expect(() => JSON.parse(result.data!)).not.toThrow();
    });
  });

  describe('List CSV Export', () => {
    it('should export input list to CSV format', () => {
      const list = testProject.inputLists[0]; // Todo Items
      const result = fileProcessor.exportListCSV(list);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Write project proposal,Review budget documents,Schedule team meeting');
      expect(result.filename).toMatch(/Todo_Items_\d{4}-\d{2}-\d{2}\.csv/);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should properly escape CSV values with commas', () => {
      const listWithCommas = createInputList('test', 'Test List', [
        createInputListItem('item1', 'Task with, comma'),
        createInputListItem('item2', 'Normal task'),
        createInputListItem('item3', 'Another task, with comma')
      ]);
      
      const result = fileProcessor.exportListCSV(listWithCommas);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('"Task with, comma",Normal task,"Another task, with comma"');
    });

    it('should handle quotes in CSV values', () => {
      const listWithQuotes = createInputList('test', 'Test List', [
        createInputListItem('item1', 'Task with "quotes"'),
        createInputListItem('item2', 'Task with "nested, quotes"')
      ]);
      
      const result = fileProcessor.exportListCSV(listWithQuotes);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('"Task with ""quotes""","Task with ""nested, quotes"""');
    });

    it('should reject empty or invalid lists', () => {
      const emptyList = createInputList('empty', 'Empty List', []);
      const result = fileProcessor.exportListCSV(emptyList);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('List is empty or invalid');
    });

    it('should reject null list', () => {
      const result = fileProcessor.exportListCSV(null as unknown as InputList);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('List is empty or invalid');
    });

    it('should sanitize filename from list name', () => {
      const specialList = createInputList('test', 'My/Special<>List:Name*', [
        createInputListItem('item1', 'Task 1')
      ]);
      
      const result = fileProcessor.exportListCSV(specialList);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/MySpecialListName_\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe('List Text Export', () => {
    it('should export input list to plain text format', () => {
      const list = testProject.inputLists[0]; // Todo Items
      const result = fileProcessor.exportListText(list);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Write project proposal\nReview budget documents\nSchedule team meeting');
      expect(result.filename).toMatch(/Todo_Items_\d{4}-\d{2}-\d{2}\.txt/);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle items with line breaks', () => {
      const listWithBreaks = createInputList('test', 'Test List', [
        createInputListItem('item1', 'Task with\nline break'),
        createInputListItem('item2', 'Normal task'),
        createInputListItem('item3', 'Task with\r\nWindows line break')
      ]);
      
      const result = fileProcessor.exportListText(listWithBreaks);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Task with\nline break\nNormal task\nTask with\r\nWindows line break');
    });

    it('should trim whitespace from items', () => {
      const listWithWhitespace = createInputList('test', 'Test List', [
        createInputListItem('item1', '  Task with spaces  '),
        createInputListItem('item2', '\tTask with tabs\t'),
        createInputListItem('item3', '\nTask with newlines\n')
      ]);
      
      const result = fileProcessor.exportListText(listWithWhitespace);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Task with spaces\nTask with tabs\nTask with newlines');
    });

    it('should reject empty or invalid lists', () => {
      const emptyList = createInputList('empty', 'Empty List', []);
      const result = fileProcessor.exportListText(emptyList);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('List is empty or invalid');
    });

    it('should handle single item lists', () => {
      const singleItemList = createInputList('single', 'Single Item', [
        createInputListItem('item1', 'Only task')
      ]);
      
      const result = fileProcessor.exportListText(singleItemList);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Only task');
    });
  });
});

describe('File Processing - Error Handling & Edge Cases', () => {
  let fileProcessor: FileProcessor;
  let mockState: AppState;

  beforeEach(() => {
    mockState = {
      currentProject: null,
      savedProjects: [],
      tagPool: [],
      ui: { selectedItems: [], activeInputList: null, anchorItem: null }
    };

    fileProcessor = new FileProcessor(mockState);
  });

  describe('File Size and Content Limits', () => {
    it('should handle very large CSV files', () => {
      const largeCSV = Array(1000).fill('Large task item').join(',');
      const result = fileProcessor.importCSV(largeCSV);
      
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(1000);
    });

    it('should handle very large text files', () => {
      const largeText = Array(1000).fill('Large task item').join('\n');
      const result = fileProcessor.importPlainText(largeText);
      
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(1000);
    });

    it('should handle Unicode content in all formats', () => {
      const unicodeContent = 'Tâsk wîth ûnicøde 🚀 émojis';
      
      const csvResult = fileProcessor.importCSV(unicodeContent);
      expect(csvResult.success).toBe(true);
      expect(csvResult.data![0]).toBe(unicodeContent);

      const textResult = fileProcessor.importPlainText(unicodeContent);
      expect(textResult.success).toBe(true);
      expect(textResult.data![0]).toBe(unicodeContent);
    });
  });

  describe('Malformed Data Handling', () => {
    it('should handle CSV with unbalanced quotes', () => {
      const malformedCSV = 'Normal task,"Unbalanced quote,Another task';
      const result = fileProcessor.importCSV(malformedCSV);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle text with various encodings', () => {
      const textWithSpecialChars = 'Task 1\u2013with\u2014special\u2015chars';
      const result = fileProcessor.importPlainText(textWithSpecialChars);
      
      expect(result.success).toBe(true);
      expect(result.data![0]).toContain('special');
    });

    it('should handle JSON with extra fields gracefully', () => {
      const jsonWithExtras = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        extraField: 'should be ignored',
        project: {
          id: 'test1',
          name: 'Test Project',
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          inputLists: [],
          mainList: [],
          extraProjectField: 'should be ignored'
        }
      };

      const result = fileProcessor.importProjectJSON(JSON.stringify(jsonWithExtras));
      expect(result.success).toBe(true);
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle different line ending styles', () => {
      const mixedLineEndings = 'Task 1\r\nTask 2\nTask 3\r\nTask 4\n\rTask 5';
      const result = fileProcessor.importPlainText(mixedLineEndings);
      
      expect(result.success).toBe(true);
      expect(result.itemCount).toBe(5);
    });

    it('should handle files with BOM (Byte Order Mark)', () => {
      const bomText = '\uFEFFTask with BOM\nAnother task';
      const result = fileProcessor.importPlainText(bomText);
      
      expect(result.success).toBe(true);
      expect(result.data![0]).toBe('Task with BOM'); // BOM should be stripped
    });

    it('should generate reasonable filename lengths', () => {
      const veryLongName = 'A'.repeat(200);
      const list = createInputList('test', veryLongName, [
        createInputListItem('item1', 'Task 1')
      ]);
      
      const result = fileProcessor.exportListCSV(list);
      
      expect(result.success).toBe(true);
      expect(result.filename!.length).toBeLessThan(70); // Reasonable filename length
    });
  });

  describe('Performance and Memory Edge Cases', () => {
    it('should handle projects with many items efficiently', () => {
      const largeProject = createProject('large', 'Large Project');
      
      // Create 100 lists with 50 items each
      for (let i = 0; i < 100; i++) {
        const items: InputListItem[] = [];
        for (let j = 0; j < 50; j++) {
          items.push(createInputListItem(`item_${i}_${j}`, `Task ${i}-${j}`, false, ['tag1']));
        }
        largeProject.inputLists.push(createInputList(`list_${i}`, `List ${i}`, items));
      }

      const result = fileProcessor.exportProjectJSON(largeProject);
      
      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(1000); // Should be a substantial file
    });

    it('should handle deep nesting in project structure', () => {
      const deepProject = createProject('deep', 'Deep Project');
      
      // Create items with deep tag structures
      const deepTags = Array(20).fill(0).map((_, i) => `tag${i}`);
      deepProject.inputLists.push(
        createInputList('deep_list', 'Deep List', [
          createInputListItem('deep_item', 'Deep Item', false, deepTags)
        ])
      );

      const result = fileProcessor.exportProjectJSON(deepProject);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Cross-Format Compatibility', () => {
    it('should export and import project maintaining data integrity', () => {
      const originalProject = createProject('roundtrip', 'Roundtrip Test', [
        createInputList('list1', 'Test List', [
          createInputListItem('item1', 'Task with, comma and "quotes"', false, ['tag1']),
          createInputListItem('item2', 'Task with\nnewlines', true, ['tag2'])
        ])
      ], [
        createMainListItem('item2', 'Task with\nnewlines', 'list1', 1, ['tag2'])
      ]);

      const processor = new FileProcessor({
        ...mockState,
        tagPool: [createTag('tag1', 'Tag 1'), createTag('tag2', 'Tag 2')]
      });

      // Export to JSON
      const exportResult = processor.exportProjectJSON(originalProject);
      expect(exportResult.success).toBe(true);

      // Import back from JSON
      const importResult = processor.importProjectJSON(exportResult.data!);
      expect(importResult.success).toBe(true);

      // Verify data integrity (ignoring regenerated IDs)
      expect(importResult.data!.name).toBe(originalProject.name);
      expect(importResult.data!.inputLists).toHaveLength(1);
      expect(importResult.data!.inputLists[0].items).toHaveLength(2);
      expect(importResult.data!.mainList).toHaveLength(1);
      expect(importResult.data!.inputLists[0].items[0].content).toBe('Task with, comma and "quotes"');
      expect(importResult.data!.inputLists[0].items[1].content).toBe('Task with\nnewlines');
    });

    it('should handle export to CSV and text maintaining content', () => {
      const testList = createInputList('test', 'Test List', [
        createInputListItem('item1', 'Simple task'),
        createInputListItem('item2', 'Task with, comma'),
        createInputListItem('item3', 'Task with "quotes"')
      ]);

      const csvResult = fileProcessor.exportListCSV(testList);
      const textResult = fileProcessor.exportListText(testList);

      expect(csvResult.success).toBe(true);
      expect(textResult.success).toBe(true);

      // Verify both formats preserve content
      expect(csvResult.data).toContain('Simple task');
      expect(textResult.data).toContain('Simple task');
      
      expect(csvResult.data).toContain('"Task with, comma"');
      expect(textResult.data).toContain('Task with, comma');
    });
  });
});