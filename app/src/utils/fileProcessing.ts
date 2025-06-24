import type { Project, Tag } from '../types/index';

// File processing results
export interface ImportResult<T = string[]> {
  success: boolean;
  data?: T;
  error?: string;
  itemCount?: number;
  warnings?: string[];
}

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
  size?: number;
}

// File processing class
export class FileProcessor {
  // Import text content as lines (plain text format)
  static importPlainText(textContent: string): ImportResult<string[]> {
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

      // Check item limit
      if (validItems.length > 250) {
        return { 
          success: false, 
          error: `Too many items (${validItems.length}). Maximum allowed is 250 items.` 
        };
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

  // Import CSV content (single-row format)
  static importCSV(csvContent: string): ImportResult<string[]> {
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

      // Check item limit
      if (validItems.length > 250) {
        return { 
          success: false, 
          error: `Too many items (${validItems.length}). Maximum allowed is 250 items.` 
        };
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

  // Try to import content (plain text first, then CSV)
  static importListContent(content: string): ImportResult<string[]> {
    // Try plain text first
    const textResult = this.importPlainText(content);
    if (textResult.success) {
      return textResult;
    }

    // If plain text fails, try CSV
    const csvResult = this.importCSV(content);
    if (csvResult.success) {
      return csvResult;
    }

    // If both fail, return the more informative error
    const errors = [
      `Plain text parsing: ${textResult.error}`,
      `CSV parsing: ${csvResult.error}`
    ];

    return {
      success: false,
      error: `Could not parse file as either plain text or CSV:\n${errors.join('\n')}`
    };
  }

  // Import project from JSON
  static importProjectJSON(jsonContent: string): ImportResult<Project> {
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

      // Restore Date objects and regenerate IDs
      const restoredProject = this.restoreProjectDates(projectData);
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
  static exportProjectJSON(project: Project, tagPool: Tag[]): ExportResult {
    try {
      if (!project) {
        return { success: false, error: 'No project to export' };
      }

      // Get all tags used in the project
      const usedTagIds = new Set<string>();
      project.inputLists.forEach(list => {
        list.items.forEach(item => {
          item.tags.forEach(tagId => usedTagIds.add(tagId));
        });
      });
      project.mainList.forEach(item => {
        item.tags.forEach(tagId => usedTagIds.add(tagId));
      });

      const usedTags = tagPool.filter(tag => usedTagIds.has(tag.id));

      // Create export data with metadata
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          modifiedAt: project.modifiedAt.toISOString()
        },
        tagPool: usedTags.map(tag => ({
          ...tag,
          createdAt: tag.createdAt.toISOString()
        }))
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

  // Helper: Parse CSV row (handles quoted values)
  private static parseCSVRow(csvRow: string): string[] {
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
  private static sanitizeContent(content: string): string {
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags and content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Helper: Sanitize filename
  private static sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .slice(0, 50); // Limit length
  }

  // Helper: Validate project JSON structure
  private static validateProjectJSON(data: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object' || !('project' in data)) {
      errors.push('Missing project data');
      return { isValid: false, errors };
    }

    const projectData = data as { project: Record<string, unknown>; tagPool?: Array<Record<string, unknown>> };
    const project = projectData.project;

    if (!project.id) errors.push('Missing project ID');
    if (!project.name) errors.push('Missing project name');
    if (!project.createdAt) errors.push('Missing createdAt');
    if (!project.modifiedAt) errors.push('Missing modifiedAt');
    if (!Array.isArray(project.inputLists)) errors.push('Invalid inputLists');
    if (!Array.isArray(project.mainList)) errors.push('Invalid mainList');

    return { isValid: errors.length === 0, errors };
  }

  // Helper: Restore Date objects from JSON
  private static restoreProjectDates(projectData: Record<string, unknown>): Project {
    const data = projectData as { 
      project: Record<string, unknown>; 
      tagPool?: Array<Record<string, unknown>> 
    };
    const project = data.project;
    
    return {
      ...project,
      createdAt: new Date(project.createdAt as string),
      modifiedAt: new Date(project.modifiedAt as string)
    } as unknown as Project;
  }

  // Helper: Regenerate all IDs to avoid conflicts
  private static regenerateProjectIds(project: Project): Project {
    const idMap = new Map<string, string>();
    const generateId = (): string => {
      return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    };

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
      id: generateId(),
      inputLists: newInputLists,
      mainList: newMainList
    };
  }

  // Helper: Calculate total item count in project
  private static calculateProjectItemCount(project: Project): number {
    const inputItemCount = project.inputLists.reduce((total, list) => total + list.items.length, 0);
    return inputItemCount + project.mainList.length;
  }
}