import { describe, it, expect } from 'vitest';
import type { Project } from '../types/index';

// Mock project setup for testing synchronization
const createTestProject = (): Project => ({
  id: 'test-project',
  name: 'Test Project',
  createdAt: new Date(),
  modifiedAt: new Date(),
  inputLists: [{
    id: 'list1',
    name: 'Test List',
    items: [
      { id: 'item1', content: 'Original content', isUsed: true, tags: [] },
      { id: 'item2', content: 'Another item', isUsed: false, tags: [] }
    ]
  }],
  mainList: [
    { id: 'item1', content: 'Original content', sourceListId: 'list1', tags: [], order: 1 }
  ]
});

// Simulate the edit function logic
const simulateEditListItem = (project: Project, listId: string, itemId: string, content: string): Project => {
  return {
    ...project,
    inputLists: project.inputLists.map(list =>
      list.id === listId ? {
        ...list,
        items: list.items.map(item =>
          item.id === itemId ? { ...item, content } : item
        )
      } : list
    ),
    // Also update the corresponding item in main list if it exists
    mainList: project.mainList.map(item =>
      item.id === itemId ? { ...item, content } : item
    ),
    modifiedAt: new Date()
  };
};

// Simulate the delete function logic
const simulateDeleteListItem = (project: Project, listId: string, itemId: string): Project => {
  return {
    ...project,
    inputLists: project.inputLists.map(list =>
      list.id === listId ? {
        ...list,
        items: list.items.filter(item => item.id !== itemId)
      } : list
    ),
    // Also remove the corresponding item from main list if it exists
    mainList: project.mainList.filter(item => item.id !== itemId),
    modifiedAt: new Date()
  };
};

describe('Item Synchronization Between Input Lists and Main List', () => {
  describe('Edit Synchronization', () => {
    it('should update both input list item and main list item when editing', () => {
      const project = createTestProject();
      const newContent = 'Updated content';
      
      const updatedProject = simulateEditListItem(project, 'list1', 'item1', newContent);
      
      // Check input list item was updated
      const inputItem = updatedProject.inputLists[0].items.find(item => item.id === 'item1');
      expect(inputItem?.content).toBe(newContent);
      
      // Check main list item was updated
      const mainItem = updatedProject.mainList.find(item => item.id === 'item1');
      expect(mainItem?.content).toBe(newContent);
    });

    it('should only update input list item when item is not in main list', () => {
      const project = createTestProject();
      const newContent = 'Updated content for item not in main list';
      
      const updatedProject = simulateEditListItem(project, 'list1', 'item2', newContent);
      
      // Check input list item was updated
      const inputItem = updatedProject.inputLists[0].items.find(item => item.id === 'item2');
      expect(inputItem?.content).toBe(newContent);
      
      // Check main list still has same items (item2 wasn't there)
      expect(updatedProject.mainList).toHaveLength(1);
      expect(updatedProject.mainList[0].id).toBe('item1');
    });
  });

  describe('Delete Synchronization', () => {
    it('should remove both input list item and main list item when deleting', () => {
      const project = createTestProject();
      
      const updatedProject = simulateDeleteListItem(project, 'list1', 'item1');
      
      // Check input list item was removed
      const inputItem = updatedProject.inputLists[0].items.find(item => item.id === 'item1');
      expect(inputItem).toBeUndefined();
      expect(updatedProject.inputLists[0].items).toHaveLength(1);
      
      // Check main list item was removed
      const mainItem = updatedProject.mainList.find(item => item.id === 'item1');
      expect(mainItem).toBeUndefined();
      expect(updatedProject.mainList).toHaveLength(0);
    });

    it('should only remove input list item when item is not in main list', () => {
      const project = createTestProject();
      
      const updatedProject = simulateDeleteListItem(project, 'list1', 'item2');
      
      // Check input list item was removed
      const inputItem = updatedProject.inputLists[0].items.find(item => item.id === 'item2');
      expect(inputItem).toBeUndefined();
      expect(updatedProject.inputLists[0].items).toHaveLength(1);
      
      // Check main list still has same items (item2 wasn't there)
      expect(updatedProject.mainList).toHaveLength(1);
      expect(updatedProject.mainList[0].id).toBe('item1');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency after multiple operations', () => {
      let project = createTestProject();
      
      // Edit item1
      project = simulateEditListItem(project, 'list1', 'item1', 'First edit');
      
      // Verify both places have same content
      const inputItem1 = project.inputLists[0].items.find(item => item.id === 'item1');
      const mainItem1 = project.mainList.find(item => item.id === 'item1');
      expect(inputItem1?.content).toBe('First edit');
      expect(mainItem1?.content).toBe('First edit');
      
      // Edit again
      project = simulateEditListItem(project, 'list1', 'item1', 'Second edit');
      
      // Verify both places still have same content
      const inputItem2 = project.inputLists[0].items.find(item => item.id === 'item1');
      const mainItem2 = project.mainList.find(item => item.id === 'item1');
      expect(inputItem2?.content).toBe('Second edit');
      expect(mainItem2?.content).toBe('Second edit');
    });
  });
});