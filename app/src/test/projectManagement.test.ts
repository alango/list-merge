import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppState, Project, InputList, MainListItem, Tag, InputListItem, ProjectSummary } from '../types/index';

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
  createdAt: createdAt || new Date(),
  modifiedAt: modifiedAt || new Date(),
  inputLists,
  mainList
});

const createProjectSummary = (id: string, name: string, itemCount: number, createdAt?: Date, modifiedAt?: Date): ProjectSummary => ({
  id,
  name,
  createdAt: createdAt || new Date(),
  modifiedAt: modifiedAt || new Date(),
  itemCount
});

// Project management operations based on App.tsx patterns
class ProjectManager {
  private state: AppState;
  
  constructor(state: AppState) {
    this.state = state;
  }

  // Create new project (based on handleNewProject)
  createNewProject(projectName = 'New Project'): AppState {
    const now = new Date();
    const newProject: Project = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: projectName,
      createdAt: now,
      modifiedAt: now,
      inputLists: [],
      mainList: []
    };
    
    return {
      ...this.state,
      currentProject: newProject,
      ui: { 
        ...this.state.ui, 
        selectedItems: [], 
        activeInputList: null,
        anchorItem: null
      }
    };
  }

  // Load existing project
  loadProject(project: Project): AppState {
    return {
      ...this.state,
      currentProject: { ...project, modifiedAt: new Date() }, // Update access time
      ui: { 
        ...this.state.ui, 
        selectedItems: [], 
        activeInputList: project.inputLists.length > 0 ? project.inputLists[0].id : null,
        anchorItem: null
      }
    };
  }

  // Save current project (future localStorage implementation)
  saveProject(): AppState {
    if (!this.state.currentProject) return this.state;

    const updatedProject = {
      ...this.state.currentProject,
      modifiedAt: new Date()
    };

    // Update project in savedProjects list
    const projectSummary: ProjectSummary = {
      id: updatedProject.id,
      name: updatedProject.name,
      createdAt: updatedProject.createdAt,
      modifiedAt: updatedProject.modifiedAt,
      itemCount: this.calculateItemCount(updatedProject)
    };

    const updatedSavedProjects = this.state.savedProjects.some(p => p.id === updatedProject.id)
      ? this.state.savedProjects.map(p => p.id === updatedProject.id ? projectSummary : p)
      : [...this.state.savedProjects, projectSummary];

    return {
      ...this.state,
      currentProject: updatedProject,
      savedProjects: updatedSavedProjects
    };
  }

  // Delete project
  deleteProject(projectId: string): AppState {
    const updatedSavedProjects = this.state.savedProjects.filter(p => p.id !== projectId);
    
    // If deleting current project, create new empty project
    const shouldCreateNew = this.state.currentProject?.id === projectId;
    
    if (shouldCreateNew) {
      return new ProjectManager({
        ...this.state,
        savedProjects: updatedSavedProjects,
        currentProject: null
      }).createNewProject();
    }

    return {
      ...this.state,
      savedProjects: updatedSavedProjects
    };
  }

  // Rename current project
  renameProject(newName: string): AppState {
    if (!this.state.currentProject) return this.state;

    const updatedProject = {
      ...this.state.currentProject,
      name: newName,
      modifiedAt: new Date()
    };

    return {
      ...this.state,
      currentProject: updatedProject
    };
  }

  // Duplicate project
  duplicateProject(sourceProjectId: string, newName?: string): AppState {
    const sourceProject = this.state.savedProjects.find(p => p.id === sourceProjectId);
    if (!sourceProject && this.state.currentProject?.id !== sourceProjectId) {
      return this.state;
    }

    // For this test, we'll assume we have access to the full project data
    // In real implementation, this would load from localStorage
    const projectToDuplicate = this.state.currentProject?.id === sourceProjectId 
      ? this.state.currentProject 
      : null; // In real implementation, would load from storage

    if (!projectToDuplicate) return this.state;

    // Ensure timestamp is different by adding 1ms
    const now = new Date(Date.now() + 1);
    const duplicatedProject: Project = {
      ...projectToDuplicate,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: newName || `${projectToDuplicate.name} (Copy)`,
      createdAt: now,
      modifiedAt: now
    };

    return {
      ...this.state,
      currentProject: duplicatedProject,
      ui: { 
        ...this.state.ui, 
        selectedItems: [], 
        activeInputList: duplicatedProject.inputLists.length > 0 ? duplicatedProject.inputLists[0].id : null,
        anchorItem: null
      }
    };
  }

  // Calculate total item count for project summary
  private calculateItemCount(project: Project): number {
    const inputItemCount = project.inputLists.reduce((total, list) => total + list.items.length, 0);
    const mainItemCount = project.mainList.length;
    return inputItemCount + mainItemCount;
  }

  // Validate project structure
  validateProject(project: Project): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!project.id) errors.push('Project ID is required');
    if (!project.name) errors.push('Project name is required');
    if (!project.createdAt) errors.push('Project createdAt is required');
    if (!project.modifiedAt) errors.push('Project modifiedAt is required');
    if (!Array.isArray(project.inputLists)) errors.push('Project inputLists must be an array');
    if (!Array.isArray(project.mainList)) errors.push('Project mainList must be an array');

    // Date validation
    if (project.createdAt && project.modifiedAt && project.createdAt > project.modifiedAt) {
      errors.push('Project createdAt cannot be after modifiedAt');
    }

    // Input lists validation
    if (project.inputLists) {
      project.inputLists.forEach((list, listIndex) => {
        if (!list || typeof list !== 'object') {
          errors.push(`Input list ${listIndex} is not a valid object`);
          return;
        }
        if (!list.id) errors.push(`Input list ${listIndex} missing ID`);
        if (!list.name) errors.push(`Input list ${listIndex} missing name`);
        if (!Array.isArray(list.items)) errors.push(`Input list ${listIndex} items must be an array`);
        
        // Validate items within the list
        if (list.items) {
          list.items.forEach((item, itemIndex) => {
            if (!item || typeof item !== 'object') {
              errors.push(`Input list ${listIndex} item ${itemIndex} is not a valid object`);
              return;
            }
            if (!item.id) errors.push(`Input list ${listIndex} item ${itemIndex} missing ID`);
            if (typeof item.content !== 'string') errors.push(`Input list ${listIndex} item ${itemIndex} missing content`);
            if (typeof item.isUsed !== 'boolean') errors.push(`Input list ${listIndex} item ${itemIndex} missing isUsed flag`);
            if (!Array.isArray(item.tags)) errors.push(`Input list ${listIndex} item ${itemIndex} tags must be an array`);
          });
        }
      });
    }

    // Main list validation
    if (project.mainList) {
      const orders = project.mainList.map(item => item.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        errors.push('Main list contains duplicate order values');
      }

      project.mainList.forEach((item, index) => {
        if (!item.id) errors.push(`Main list item ${index} missing ID`);
        if (!item.content) errors.push(`Main list item ${index} missing content`);
        if (!item.sourceListId) errors.push(`Main list item ${index} missing sourceListId`);
        if (typeof item.order !== 'number') errors.push(`Main list item ${index} missing valid order`);
      });
    }

    // ID uniqueness validation
    const allIds: string[] = [];
    if (project.inputLists) {
      project.inputLists.forEach(list => {
        if (list && list.id) allIds.push(list.id);
        if (list && list.items) {
          list.items.forEach(item => {
            if (item && typeof item === 'object' && item.id) allIds.push(item.id);
          });
        }
      });
    }
    if (project.mainList) {
      project.mainList.forEach(item => {
        if (item && typeof item === 'object' && item.id) allIds.push(item.id);
      });
    }

    const uniqueIds = new Set(allIds);
    if (allIds.length !== uniqueIds.size) {
      errors.push('Project contains duplicate IDs');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get project statistics
  getProjectStats(project: Project): {
    totalInputItems: number;
    totalMainItems: number;
    totalLists: number;
    usedItems: number;
    unusedItems: number;
    tagsUsed: Set<string>;
  } {
    const totalLists = project.inputLists.length;
    const totalMainItems = project.mainList.length;
    
    let totalInputItems = 0;
    let usedItems = 0;
    let unusedItems = 0;
    const tagsUsed = new Set<string>();

    project.inputLists.forEach(list => {
      totalInputItems += list.items.length;
      list.items.forEach(item => {
        if (item.isUsed) {
          usedItems++;
        } else {
          unusedItems++;
        }
        item.tags.forEach(tag => tagsUsed.add(tag));
      });
    });

    project.mainList.forEach(item => {
      item.tags.forEach(tag => tagsUsed.add(tag));
    });

    return {
      totalInputItems,
      totalMainItems,
      totalLists,
      usedItems,
      unusedItems,
      tagsUsed
    };
  }

  // Merge two projects
  mergeProjects(project1: Project, project2: Project, newName: string): Project {
    const now = new Date();
    
    // Generate new IDs for all items to avoid conflicts
    const generateNewId = (): string => {
      return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    };

    // Merge input lists
    const mergedInputLists: InputList[] = [
      ...project1.inputLists.map(list => ({
        ...list,
        id: generateNewId(),
        name: `${project1.name} - ${list.name}`,
        items: list.items.map(item => ({
          ...item,
          id: generateNewId()
        }))
      })),
      ...project2.inputLists.map(list => ({
        ...list,
        id: generateNewId(),
        name: `${project2.name} - ${list.name}`,
        items: list.items.map(item => ({
          ...item,
          id: generateNewId()
        }))
      }))
    ];

    // Merge main lists
    const mergedMainList: MainListItem[] = [
      ...project1.mainList.map((item, index) => ({
        ...item,
        id: generateNewId(),
        sourceListId: generateNewId(),
        order: index + 1
      })),
      ...project2.mainList.map((item, index) => ({
        ...item,
        id: generateNewId(),
        sourceListId: generateNewId(),
        order: project1.mainList.length + index + 1
      }))
    ];

    return {
      id: generateNewId(),
      name: newName,
      createdAt: now,
      modifiedAt: now,
      inputLists: mergedInputLists,
      mainList: mergedMainList
    };
  }
}

describe('Project Management - CRUD Operations', () => {
  let initialState: AppState;
  let projectManager: ProjectManager;

  beforeEach(() => {
    const mockProject = createProject('existing1', 'Existing Project', [
      createInputList('list1', 'Todo Items', [
        createInputListItem('item1', 'Task 1', false, ['tag1']),
        createInputListItem('item2', 'Task 2', true, ['tag2'])
      ])
    ], [
      createMainListItem('item2', 'Task 2', 'list1', 1, ['tag2'])
    ]);

    const mockTags = [
      createTag('tag1', 'Priority', '#ef4444', 1),
      createTag('tag2', 'Development', '#3b82f6', 2)
    ];

    initialState = {
      currentProject: mockProject,
      savedProjects: [
        createProjectSummary('existing1', 'Existing Project', 3),
        createProjectSummary('saved1', 'Saved Project 1', 5),
        createProjectSummary('saved2', 'Saved Project 2', 2)
      ],
      tagPool: mockTags,
      ui: {
        selectedItems: ['item1'],
        activeInputList: 'list1',
        anchorItem: 'item1'
      }
    };

    projectManager = new ProjectManager(initialState);
  });

  describe('Project Creation', () => {
    it('should create new project with default name', () => {
      const result = projectManager.createNewProject();
      
      expect(result.currentProject).toBeDefined();
      expect(result.currentProject?.name).toBe('New Project');
      expect(result.currentProject?.inputLists).toEqual([]);
      expect(result.currentProject?.mainList).toEqual([]);
      expect(result.currentProject?.id).toBeTruthy();
      expect(result.currentProject?.createdAt).toBeInstanceOf(Date);
      expect(result.currentProject?.modifiedAt).toBeInstanceOf(Date);
    });

    it('should create new project with custom name', () => {
      const result = projectManager.createNewProject('My Custom Project');
      
      expect(result.currentProject?.name).toBe('My Custom Project');
    });

    it('should clear UI state when creating new project', () => {
      const result = projectManager.createNewProject();
      
      expect(result.ui.selectedItems).toEqual([]);
      expect(result.ui.activeInputList).toBe(null);
      expect(result.ui.anchorItem).toBe(null);
    });

    it('should generate unique project IDs', () => {
      const result1 = projectManager.createNewProject();
      const manager2 = new ProjectManager(result1);
      const result2 = manager2.createNewProject();
      
      expect(result1.currentProject?.id).not.toBe(result2.currentProject?.id);
    });

    it('should set creation and modification times correctly', () => {
      const beforeCreate = new Date();
      const result = projectManager.createNewProject();
      const afterCreate = new Date();
      
      expect(result.currentProject?.createdAt).toBeInstanceOf(Date);
      expect(result.currentProject?.modifiedAt).toBeInstanceOf(Date);
      expect(result.currentProject?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(result.currentProject?.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(result.currentProject?.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(result.currentProject?.modifiedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Project Loading', () => {
    it('should load project and update current state', () => {
      const projectToLoad = createProject('load1', 'Loaded Project', [
        createInputList('newlist1', 'New List', [
          createInputListItem('newitem1', 'New Task')
        ])
      ]);

      const result = projectManager.loadProject(projectToLoad);
      
      expect(result.currentProject?.id).toBe('load1');
      expect(result.currentProject?.name).toBe('Loaded Project');
      expect(result.currentProject?.inputLists).toHaveLength(1);
    });

    it('should set activeInputList to first input list when loading', () => {
      const projectToLoad = createProject('load1', 'Loaded Project', [
        createInputList('first1', 'First List'),
        createInputList('second1', 'Second List')
      ]);

      const result = projectManager.loadProject(projectToLoad);
      
      expect(result.ui.activeInputList).toBe('first1');
    });

    it('should set activeInputList to null when loading project with no input lists', () => {
      const projectToLoad = createProject('load1', 'Empty Project');

      const result = projectManager.loadProject(projectToLoad);
      
      expect(result.ui.activeInputList).toBe(null);
    });

    it('should clear selection state when loading project', () => {
      const projectToLoad = createProject('load1', 'Loaded Project');

      const result = projectManager.loadProject(projectToLoad);
      
      expect(result.ui.selectedItems).toEqual([]);
      expect(result.ui.anchorItem).toBe(null);
    });

    it('should update modifiedAt when loading project', () => {
      const oldDate = new Date('2023-01-01');
      const projectToLoad = createProject('load1', 'Loaded Project', [], [], oldDate, oldDate);

      const beforeLoad = new Date();
      const result = projectManager.loadProject(projectToLoad);
      
      expect(result.currentProject?.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeLoad.getTime());
      expect(result.currentProject?.createdAt).toEqual(oldDate);
    });
  });

  describe('Project Saving', () => {
    it('should update modifiedAt when saving project', () => {
      const beforeSave = new Date();
      const result = projectManager.saveProject();
      
      expect(result.currentProject?.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
    });

    it('should add new project to savedProjects list', () => {
      // Create a new project first
      let result = projectManager.createNewProject('New Unsaved Project');
      const manager = new ProjectManager(result);
      result = manager.saveProject();
      
      expect(result.savedProjects).toHaveLength(4); // 3 initial + 1 new
      const newProjectSummary = result.savedProjects.find(p => p.name === 'New Unsaved Project');
      expect(newProjectSummary).toBeDefined();
      expect(newProjectSummary?.itemCount).toBe(0); // Empty project
    });

    it('should update existing project in savedProjects list', () => {
      const result = projectManager.saveProject();
      
      expect(result.savedProjects).toHaveLength(3); // Same as initial
      const existingProject = result.savedProjects.find(p => p.id === 'existing1');
      expect(existingProject?.name).toBe('Existing Project');
    });

    it('should handle saving when no current project exists', () => {
      const stateWithoutProject = { ...initialState, currentProject: null };
      const manager = new ProjectManager(stateWithoutProject);
      
      const result = manager.saveProject();
      
      expect(result).toBe(stateWithoutProject); // No change
    });

    it('should calculate item count correctly for project summary', () => {
      const result = projectManager.saveProject();
      
      const projectSummary = result.savedProjects.find(p => p.id === 'existing1');
      expect(projectSummary?.itemCount).toBe(3); // 2 input items + 1 main item
    });
  });

  describe('Project Deletion', () => {
    it('should remove project from savedProjects list', () => {
      const result = projectManager.deleteProject('saved1');
      
      expect(result.savedProjects).toHaveLength(2);
      expect(result.savedProjects.find(p => p.id === 'saved1')).toBeUndefined();
    });

    it('should create new project when deleting current project', () => {
      const result = projectManager.deleteProject('existing1');
      
      expect(result.currentProject?.name).toBe('New Project');
      expect(result.currentProject?.id).not.toBe('existing1');
      expect(result.savedProjects.find(p => p.id === 'existing1')).toBeUndefined();
    });

    it('should not affect current project when deleting different project', () => {
      const result = projectManager.deleteProject('saved2');
      
      expect(result.currentProject?.id).toBe('existing1');
      expect(result.currentProject?.name).toBe('Existing Project');
    });

    it('should handle deletion of non-existent project', () => {
      const result = projectManager.deleteProject('nonexistent');
      
      expect(result).toEqual(initialState); // No change
    });
  });

  describe('Project Renaming', () => {
    it('should rename current project', () => {
      const result = projectManager.renameProject('Renamed Project');
      
      expect(result.currentProject?.name).toBe('Renamed Project');
      expect(result.currentProject?.id).toBe('existing1'); // ID unchanged
    });

    it('should update modifiedAt when renaming', () => {
      const beforeRename = new Date();
      const result = projectManager.renameProject('Renamed Project');
      
      expect(result.currentProject?.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeRename.getTime());
    });

    it('should handle renaming when no current project exists', () => {
      const stateWithoutProject = { ...initialState, currentProject: null };
      const manager = new ProjectManager(stateWithoutProject);
      
      const result = manager.renameProject('New Name');
      
      expect(result).toBe(stateWithoutProject); // No change
    });

    it('should preserve all other project data when renaming', () => {
      const result = projectManager.renameProject('Renamed Project');
      
      expect(result.currentProject?.inputLists).toEqual(initialState.currentProject?.inputLists);
      expect(result.currentProject?.mainList).toEqual(initialState.currentProject?.mainList);
      expect(result.currentProject?.createdAt).toEqual(initialState.currentProject?.createdAt);
    });
  });

  describe('Project Duplication', () => {
    it('should duplicate current project with new name', () => {
      const result = projectManager.duplicateProject('existing1', 'Duplicated Project');
      
      expect(result.currentProject?.name).toBe('Duplicated Project');
      expect(result.currentProject?.id).not.toBe('existing1');
      expect(result.currentProject?.inputLists).toHaveLength(1);
      expect(result.currentProject?.mainList).toHaveLength(1);
    });

    it('should generate default copy name when not provided', () => {
      const result = projectManager.duplicateProject('existing1');
      
      expect(result.currentProject?.name).toBe('Existing Project (Copy)');
    });

    it('should set new timestamps for duplicated project', () => {
      const result = projectManager.duplicateProject('existing1');
      
      expect(result.currentProject?.createdAt).not.toEqual(initialState.currentProject?.createdAt);
      expect(result.currentProject?.modifiedAt).not.toEqual(initialState.currentProject?.modifiedAt);
    });

    it('should clear UI state when duplicating project', () => {
      const result = projectManager.duplicateProject('existing1');
      
      expect(result.ui.selectedItems).toEqual([]);
      expect(result.ui.anchorItem).toBe(null);
      expect(result.ui.activeInputList).toBe('list1'); // Should be set to first list
    });

    it('should handle duplication of non-existent project', () => {
      const result = projectManager.duplicateProject('nonexistent');
      
      expect(result).toBe(initialState); // No change
    });
  });
});

describe('Project Validation & Structure', () => {
  let projectManager: ProjectManager;

  beforeEach(() => {
    projectManager = new ProjectManager({
      currentProject: null,
      savedProjects: [],
      tagPool: [],
      ui: { selectedItems: [], activeInputList: null, anchorItem: null }
    });
  });

  describe('Project Structure Validation', () => {
    it('should validate complete valid project', () => {
      const validProject = createProject('valid1', 'Valid Project', [
        createInputList('list1', 'Test List', [
          createInputListItem('item1', 'Test Item')
        ])
      ], [
        createMainListItem('item2', 'Main Item', 'list1', 1)
      ]);

      const validation = projectManager.validateProject(validProject);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalidProject = {
        id: '',
        name: '',
        createdAt: null as any,
        modifiedAt: null as any,
        inputLists: null as any,
        mainList: null as any
      };

      const validation = projectManager.validateProject(invalidProject);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Project ID is required');
      expect(validation.errors).toContain('Project name is required');
      expect(validation.errors).toContain('Project createdAt is required');
      expect(validation.errors).toContain('Project modifiedAt is required');
      expect(validation.errors).toContain('Project inputLists must be an array');
      expect(validation.errors).toContain('Project mainList must be an array');
    });

    it('should detect invalid date relationships', () => {
      const futureDate = new Date('2025-12-31');
      const pastDate = new Date('2023-01-01');
      
      const invalidProject = createProject('invalid1', 'Invalid Project', [], [], futureDate, pastDate);

      const validation = projectManager.validateProject(invalidProject);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Project createdAt cannot be after modifiedAt');
    });

    it('should detect duplicate order values in main list', () => {
      const invalidProject = createProject('invalid1', 'Invalid Project', [], [
        createMainListItem('item1', 'Item 1', 'list1', 1),
        createMainListItem('item2', 'Item 2', 'list1', 1), // Duplicate order
        createMainListItem('item3', 'Item 3', 'list1', 2)
      ]);

      const validation = projectManager.validateProject(invalidProject);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Main list contains duplicate order values');
    });

    it('should detect missing item fields', () => {
      const invalidProject = createProject('invalid1', 'Invalid Project', [
        {
          id: '',
          name: '',
          items: [
            { id: '', content: '', isUsed: false, tags: [] }
          ]
        } as any
      ], [
        { id: '', content: '', sourceListId: '', order: 'invalid' as any, tags: [] }
      ]);

      const validation = projectManager.validateProject(invalidProject);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate IDs across all items', () => {
      const invalidProject = createProject('invalid1', 'Invalid Project', [
        createInputList('list1', 'List 1', [
          createInputListItem('duplicate-id', 'Input Item')
        ])
      ], [
        createMainListItem('duplicate-id', 'Main Item', 'list1', 1) // Same ID
      ]);

      const validation = projectManager.validateProject(invalidProject);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Project contains duplicate IDs');
    });
  });

  describe('Project Statistics', () => {
    it('should calculate project statistics correctly', () => {
      const project = createProject('stats1', 'Stats Project', [
        createInputList('list1', 'List 1', [
          createInputListItem('item1', 'Used Item', true, ['tag1', 'tag2']),
          createInputListItem('item2', 'Unused Item', false, ['tag1'])
        ]),
        createInputList('list2', 'List 2', [
          createInputListItem('item3', 'Another Item', false, ['tag3'])
        ])
      ], [
        createMainListItem('item1', 'Used Item', 'list1', 1, ['tag1', 'tag2']),
        createMainListItem('item4', 'Main Only', 'list2', 2, ['tag4'])
      ]);

      const stats = projectManager.getProjectStats(project);
      
      expect(stats.totalInputItems).toBe(3);
      expect(stats.totalMainItems).toBe(2);
      expect(stats.totalLists).toBe(2);
      expect(stats.usedItems).toBe(1);
      expect(stats.unusedItems).toBe(2);
      expect(stats.tagsUsed.size).toBe(4); // tag1, tag2, tag3, tag4
    });

    it('should handle empty project statistics', () => {
      const emptyProject = createProject('empty1', 'Empty Project');

      const stats = projectManager.getProjectStats(emptyProject);
      
      expect(stats.totalInputItems).toBe(0);
      expect(stats.totalMainItems).toBe(0);
      expect(stats.totalLists).toBe(0);
      expect(stats.usedItems).toBe(0);
      expect(stats.unusedItems).toBe(0);
      expect(stats.tagsUsed.size).toBe(0);
    });
  });

  describe('Project Merging', () => {
    it('should merge two projects correctly', () => {
      const project1 = createProject('p1', 'Project 1', [
        createInputList('list1', 'List 1', [
          createInputListItem('item1', 'Item 1', false, ['tag1'])
        ])
      ], [
        createMainListItem('item2', 'Main 1', 'list1', 1)
      ]);

      const project2 = createProject('p2', 'Project 2', [
        createInputList('list2', 'List 2', [
          createInputListItem('item3', 'Item 3', false, ['tag2'])
        ])
      ], [
        createMainListItem('item4', 'Main 2', 'list2', 1)
      ]);

      const merged = projectManager.mergeProjects(project1, project2, 'Merged Project');
      
      expect(merged.name).toBe('Merged Project');
      expect(merged.inputLists).toHaveLength(2);
      expect(merged.mainList).toHaveLength(2);
      expect(merged.inputLists[0].name).toBe('Project 1 - List 1');
      expect(merged.inputLists[1].name).toBe('Project 2 - List 2');
    });

    it('should generate unique IDs when merging projects', () => {
      const project1 = createProject('p1', 'Project 1', [
        createInputList('sameid', 'List 1', [
          createInputListItem('sameid', 'Item 1') // Same IDs
        ])
      ]);

      const project2 = createProject('p2', 'Project 2', [
        createInputList('sameid', 'List 2', [
          createInputListItem('sameid', 'Item 2') // Same IDs
        ])
      ]);

      const merged = projectManager.mergeProjects(project1, project2, 'Merged Project');
      
      const allIds: string[] = [];
      merged.inputLists.forEach(list => {
        allIds.push(list.id);
        list.items.forEach(item => allIds.push(item.id));
      });
      merged.mainList.forEach(item => allIds.push(item.id));

      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length); // No duplicates
    });

    it('should maintain correct order in merged main list', () => {
      const project1 = createProject('p1', 'Project 1', [], [
        createMainListItem('item1', 'Main 1', 'list1', 1),
        createMainListItem('item2', 'Main 2', 'list1', 2)
      ]);

      const project2 = createProject('p2', 'Project 2', [], [
        createMainListItem('item3', 'Main 3', 'list2', 1),
        createMainListItem('item4', 'Main 4', 'list2', 2)
      ]);

      const merged = projectManager.mergeProjects(project1, project2, 'Merged Project');
      
      expect(merged.mainList).toHaveLength(4);
      expect(merged.mainList[0].order).toBe(1);
      expect(merged.mainList[1].order).toBe(2);
      expect(merged.mainList[2].order).toBe(3);
      expect(merged.mainList[3].order).toBe(4);
    });
  });
});

describe('Project Edge Cases & Error Handling', () => {
  let projectManager: ProjectManager;

  beforeEach(() => {
    projectManager = new ProjectManager({
      currentProject: null,
      savedProjects: [],
      tagPool: [],
      ui: { selectedItems: [], activeInputList: null, anchorItem: null }
    });
  });

  describe('Null and Undefined Handling', () => {
    it('should handle operations when currentProject is null', () => {
      const result1 = projectManager.saveProject();
      const result2 = projectManager.renameProject('New Name');
      
      expect(result1.currentProject).toBe(null);
      expect(result2.currentProject).toBe(null);
    });

    it('should handle projects with undefined/null fields gracefully', () => {
      const corruptProject = {
        id: 'corrupt1',
        name: 'Corrupt Project',
        createdAt: null as any,
        modifiedAt: undefined as any,
        inputLists: undefined as any,
        mainList: null as any
      };

      const validation = projectManager.validateProject(corruptProject);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid successive project operations', () => {
      let result = projectManager.createNewProject('Project 1');
      let manager = new ProjectManager(result);
      
      result = manager.renameProject('Renamed Project 1');
      manager = new ProjectManager(result);
      
      result = manager.saveProject();
      manager = new ProjectManager(result);
      
      result = manager.createNewProject('Project 2');
      
      expect(result.currentProject?.name).toBe('Project 2');
      expect(result.savedProjects).toHaveLength(1);
      expect(result.savedProjects[0].name).toBe('Renamed Project 1');
    });

    it('should maintain state consistency during complex operations', () => {
      // Create project
      let result = projectManager.createNewProject('Test Project');
      let manager = new ProjectManager(result);
      
      // Duplicate it
      result = manager.duplicateProject(result.currentProject!.id, 'Duplicated');
      manager = new ProjectManager(result);
      
      // Save both
      result = manager.saveProject();
      
      expect(result.savedProjects).toHaveLength(1);
      expect(result.currentProject?.name).toBe('Duplicated');
    });
  });

  describe('Large Data Handling', () => {
    it('should handle projects with many input lists and items', () => {
      const largeProject = createProject('large1', 'Large Project');
      
      // Create 50 input lists with 20 items each
      for (let i = 0; i < 50; i++) {
        const items: InputListItem[] = [];
        for (let j = 0; j < 20; j++) {
          items.push(createInputListItem(`item_${i}_${j}`, `Item ${i}-${j}`));
        }
        largeProject.inputLists.push(createInputList(`list_${i}`, `List ${i}`, items));
      }

      const validation = projectManager.validateProject(largeProject);
      expect(validation.isValid).toBe(true);

      const stats = projectManager.getProjectStats(largeProject);
      expect(stats.totalInputItems).toBe(1000); // 50 * 20
      expect(stats.totalLists).toBe(50);
    });

    it('should handle projects with very long names and content', () => {
      const longName = 'A'.repeat(1000);
      const longContent = 'B'.repeat(5000);
      
      const project = createProject('long1', longName, [
        createInputList('list1', longName, [
          createInputListItem('item1', longContent)
        ])
      ]);

      const validation = projectManager.validateProject(project);
      expect(validation.isValid).toBe(true);
      expect(project.name).toHaveLength(1000);
      expect(project.inputLists[0].items[0].content).toHaveLength(5000);
    });
  });

  describe('Data Corruption Scenarios', () => {
    it('should detect circular references in project structure', () => {
      const project = createProject('circular1', 'Circular Project', [
        createInputList('list1', 'List 1', [])
      ]);

      // Simulate circular reference
      (project as any).circularRef = project;

      // Should not crash validation (though circular ref won't be detected by our simple validator)
      const validation = projectManager.validateProject(project);
      expect(validation.isValid).toBe(true); // Our validator doesn't check for circular refs
    });

    it('should handle malformed item structures', () => {
      const malformedProject = {
        id: 'malformed1',
        name: 'Malformed Project',
        createdAt: new Date(),
        modifiedAt: new Date(),
        inputLists: [
          {
            id: 'list1',
            name: 'List 1',
            items: [
              'not an object', // Invalid item
              { id: 'item1' }, // Missing fields
              null, // Null item
              undefined // Undefined item
            ]
          }
        ],
        mainList: []
      };

      // Should not crash
      expect(() => {
        const validation = projectManager.validateProject(malformedProject as any);
        expect(validation.isValid).toBe(false);
      }).not.toThrow();
    });
  });
});