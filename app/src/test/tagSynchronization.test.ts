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

const createProject = (id: string, name: string, inputLists: InputList[] = [], mainList: MainListItem[] = []): Project => ({
  id,
  name,
  createdAt: new Date(),
  modifiedAt: new Date(),
  inputLists,
  mainList
});

// Tag synchronization manager based on App.tsx patterns
class TagSynchronizationManager {
  private state: AppState;
  
  constructor(state: AppState) {
    this.state = state;
  }

  // Core item finding logic from App.tsx
  findItem(itemId: string): (InputListItem | MainListItem) | null {
    if (!this.state.currentProject) return null;

    // Check main list first
    const mainItem = this.state.currentProject.mainList.find(item => item.id === itemId);
    if (mainItem) return mainItem;

    // Check input lists
    for (const list of this.state.currentProject.inputLists) {
      const inputItem = list.items.find(item => item.id === itemId);
      if (inputItem) return inputItem;
    }
    return null;
  }

  // Advanced tag addition with bidirectional sync
  addTagWithSync(itemIds: string[], tagId: string): AppState {
    if (!this.state.currentProject) return this.state;

    let usageIncrement = 0;
    const processedItems = new Set<string>();

    const updatedProject = {
      ...this.state.currentProject,
      // Update main list items
      mainList: this.state.currentProject.mainList.map(item => {
        if (itemIds.includes(item.id) && !item.tags.includes(tagId)) {
          processedItems.add(item.id);
          usageIncrement++;
          return { ...item, tags: [...item.tags, tagId] };
        }
        return item;
      }),
      // Update input list items
      inputLists: this.state.currentProject.inputLists.map(list => ({
        ...list,
        items: list.items.map(item => {
          if (itemIds.includes(item.id) && !item.tags.includes(tagId)) {
            processedItems.add(item.id);
            usageIncrement++;
            return { ...item, tags: [...item.tags, tagId] };
          }
          return item;
        })
      }))
    };

    // Update tag usage count
    const updatedTagPool = this.state.tagPool.map(tag =>
      tag.id === tagId ? { ...tag, usageCount: tag.usageCount + usageIncrement } : tag
    );

    return {
      ...this.state,
      currentProject: updatedProject,
      tagPool: updatedTagPool
    };
  }

  // Advanced tag removal with bidirectional sync
  removeTagWithSync(itemIds: string[], tagId: string): AppState {
    if (!this.state.currentProject) return this.state;

    let usageDecrement = 0;
    const processedItems = new Set<string>();

    const updatedProject = {
      ...this.state.currentProject,
      // Update main list items
      mainList: this.state.currentProject.mainList.map(item => {
        if (itemIds.includes(item.id) && item.tags.includes(tagId)) {
          processedItems.add(item.id);
          usageDecrement++;
          return { ...item, tags: item.tags.filter(id => id !== tagId) };
        }
        return item;
      }),
      // Update input list items
      inputLists: this.state.currentProject.inputLists.map(list => ({
        ...list,
        items: list.items.map(item => {
          if (itemIds.includes(item.id) && item.tags.includes(tagId)) {
            processedItems.add(item.id);
            usageDecrement++;
            return { ...item, tags: item.tags.filter(id => id !== tagId) };
          }
          return item;
        })
      }))
    };

    // Update tag usage count (prevent negative values)
    const updatedTagPool = this.state.tagPool.map(tag =>
      tag.id === tagId ? { ...tag, usageCount: Math.max(0, tag.usageCount - usageDecrement) } : tag
    );

    return {
      ...this.state,
      currentProject: updatedProject,
      tagPool: updatedTagPool
    };
  }

  // Move item with tag preservation
  moveItemWithTags(sourceListId: string, itemId: string): AppState {
    if (!this.state.currentProject) return this.state;

    const sourceList = this.state.currentProject.inputLists.find(list => list.id === sourceListId);
    if (!sourceList) return this.state;

    const sourceItem = sourceList.items.find(item => item.id === itemId);
    if (!sourceItem || sourceItem.isUsed) return this.state;

    const newMainItem: MainListItem = {
      id: sourceItem.id, // Preserve ID for tag synchronization
      content: sourceItem.content,
      sourceListId,
      tags: [...sourceItem.tags], // Copy tags to maintain sync
      order: this.state.currentProject.mainList.length + 1
    };

    return {
      ...this.state,
      currentProject: {
        ...this.state.currentProject,
        inputLists: this.state.currentProject.inputLists.map(list =>
          list.id === sourceListId ? {
            ...list,
            items: list.items.map(item =>
              item.id === itemId ? { ...item, isUsed: true } : item
            )
          } : list
        ),
        mainList: [...this.state.currentProject.mainList, newMainItem],
        modifiedAt: new Date()
      }
    };
  }

  // Delete tag with cascading removal
  deleteTagWithCascade(tagId: string): AppState {
    if (!this.state.currentProject) return this.state;

    const updatedProject = {
      ...this.state.currentProject,
      // Remove from main list items
      mainList: this.state.currentProject.mainList.map(item => ({
        ...item,
        tags: item.tags.filter(id => id !== tagId)
      })),
      // Remove from input list items
      inputLists: this.state.currentProject.inputLists.map(list => ({
        ...list,
        items: list.items.map(item => ({
          ...item,
          tags: item.tags.filter(id => id !== tagId)
        }))
      }))
    };

    // Remove from tag pool
    const updatedTagPool = this.state.tagPool.filter(tag => tag.id !== tagId);

    return {
      ...this.state,
      currentProject: updatedProject,
      tagPool: updatedTagPool
    };
  }

  // Bulk tag operations
  bulkTagOperation(itemIds: string[], tagId: string, operation: 'add' | 'remove'): AppState {
    return operation === 'add' 
      ? this.addTagWithSync(itemIds, tagId)
      : this.removeTagWithSync(itemIds, tagId);
  }

  // Get tag usage statistics
  getTagUsageStats(tagId: string): { totalUsage: number; mainListUsage: number; inputListUsage: number } {
    if (!this.state.currentProject) return { totalUsage: 0, mainListUsage: 0, inputListUsage: 0 };

    let mainListUsage = 0;
    let inputListUsage = 0;

    // Count main list usage
    this.state.currentProject.mainList.forEach(item => {
      if (item.tags.includes(tagId)) mainListUsage++;
    });

    // Count input list usage
    this.state.currentProject.inputLists.forEach(list => {
      list.items.forEach(item => {
        if (item.tags.includes(tagId)) inputListUsage++;
      });
    });

    return {
      totalUsage: mainListUsage + inputListUsage,
      mainListUsage,
      inputListUsage
    };
  }

  // Validate tag synchronization integrity
  validateTagSync(): { isValid: boolean; errors: string[] } {
    if (!this.state.currentProject) return { isValid: true, errors: [] };

    const errors: string[] = [];

    // Check for items that exist in both contexts but have different tags
    for (const mainItem of this.state.currentProject.mainList) {
      for (const list of this.state.currentProject.inputLists) {
        const inputItem = list.items.find(item => item.id === mainItem.id);
        if (inputItem) {
          // Sort tags for comparison
          const mainTags = [...mainItem.tags].sort();
          const inputTags = [...inputItem.tags].sort();
          
          if (JSON.stringify(mainTags) !== JSON.stringify(inputTags)) {
            errors.push(`Tag mismatch for item ${mainItem.id}: main[${mainTags.join(',')}] vs input[${inputTags.join(',')}]`);
          }
        }
      }
    }

    // Validate tag usage counts
    for (const tag of this.state.tagPool) {
      const actualUsage = this.getTagUsageStats(tag.id).totalUsage;
      if (tag.usageCount !== actualUsage) {
        errors.push(`Usage count mismatch for tag ${tag.id}: expected ${actualUsage}, got ${tag.usageCount}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

describe('Tag Synchronization - Integration Tests', () => {
  let initialState: AppState;
  let tagSyncManager: TagSynchronizationManager;

  beforeEach(() => {
    const inputList1 = createInputList('list1', 'Todo Items', [
      createInputListItem('shared1', 'Shared task', false, ['tag1']),
      createInputListItem('input-only1', 'Input only task', false, ['tag2']),
      createInputListItem('shared2', 'Another shared', true, ['tag1', 'tag2']) // Used item
    ]);

    const inputList2 = createInputList('list2', 'Features', [
      createInputListItem('input-only2', 'Feature task', false),
      createInputListItem('shared3', 'Third shared', false, ['tag3'])
    ]);

    const project = createProject('project1', 'Test Project', [inputList1, inputList2], [
      createMainListItem('shared1', 'Shared task', 'list1', 1, ['tag1']), // Same as input item
      createMainListItem('shared2', 'Another shared', 'list1', 2, ['tag1', 'tag2']), // Same as input item
      createMainListItem('main-only1', 'Main only task', 'list2', 3, ['tag3'])
    ]);

    const tags = [
      createTag('tag1', 'High Priority', '#ef4444', 4), // shared1(input+main=2) + shared2(input+main=2) = 4
      createTag('tag2', 'Development', '#3b82f6', 3), // input-only1(1) + shared2(input+main=2) = 3  
      createTag('tag3', 'Design', '#8b5cf6', 2), // shared3(1) + main-only1(1) = 2
      createTag('tag4', 'Unused', '#10b981', 0) // Not used anywhere
    ];

    initialState = {
      currentProject: project,
      savedProjects: [],
      tagPool: tags,
      ui: {
        selectedItems: [],
        activeInputList: 'list1',
        anchorItem: null
      }
    };

    tagSyncManager = new TagSynchronizationManager(initialState);
  });

  describe('Bidirectional Tag Synchronization', () => {
    it('should add tag to shared item in both contexts', () => {
      const result = tagSyncManager.addTagWithSync(['shared1'], 'tag4');
      
      // Check main list item
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'shared1');
      expect(mainItem?.tags).toEqual(['tag1', 'tag4']);

      // Check input list item
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputItem = inputList?.items.find(item => item.id === 'shared1');
      expect(inputItem?.tags).toEqual(['tag1', 'tag4']);

      // Check usage count increased by 2 (both contexts)
      const tag = result.tagPool.find(t => t.id === 'tag4');
      expect(tag?.usageCount).toBe(2);
    });

    it('should remove tag from shared item in both contexts', () => {
      const result = tagSyncManager.removeTagWithSync(['shared2'], 'tag1');
      
      // Check main list item
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'shared2');
      expect(mainItem?.tags).toEqual(['tag2']);

      // Check input list item
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputItem = inputList?.items.find(item => item.id === 'shared2');
      expect(inputItem?.tags).toEqual(['tag2']);

      // Check usage count decreased by 2 (both contexts)
      const tag = result.tagPool.find(t => t.id === 'tag1');
      expect(tag?.usageCount).toBe(2); // Was 4, now 2
    });

    it('should handle mixed operations on shared and non-shared items', () => {
      const result = tagSyncManager.addTagWithSync(['shared1', 'input-only1', 'main-only1'], 'tag4');
      
      // Verify all items got the tag
      const mainShared = result.currentProject?.mainList.find(item => item.id === 'shared1');
      const mainOnly = result.currentProject?.mainList.find(item => item.id === 'main-only1');
      expect(mainShared?.tags).toContain('tag4');
      expect(mainOnly?.tags).toContain('tag4');

      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputShared = inputList?.items.find(item => item.id === 'shared1');
      const inputOnly = inputList?.items.find(item => item.id === 'input-only1');
      expect(inputShared?.tags).toContain('tag4');
      expect(inputOnly?.tags).toContain('tag4');

      // Usage count should be 4: shared1(2) + input-only1(1) + main-only1(1)
      const tag = result.tagPool.find(t => t.id === 'tag4');
      expect(tag?.usageCount).toBe(4);
    });

    it('should prevent duplicate tags in synchronization', () => {
      // Try to add tag1 to shared1 which already has it
      const result = tagSyncManager.addTagWithSync(['shared1'], 'tag1');
      
      // Items should be unchanged
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'shared1');
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputItem = inputList?.items.find(item => item.id === 'shared1');
      
      expect(mainItem?.tags).toEqual(['tag1']); // No duplicate
      expect(inputItem?.tags).toEqual(['tag1']); // No duplicate

      // Usage count should remain unchanged
      const tag = result.tagPool.find(t => t.id === 'tag1');
      expect(tag?.usageCount).toBe(4); // Same as initial
    });
  });

  describe('Item Movement with Tag Preservation', () => {
    it('should preserve tags when moving item to main list', () => {
      const result = tagSyncManager.moveItemWithTags('list2', 'input-only2');
      
      // Item should be marked as used in input list
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list2');
      const inputItem = inputList?.items.find(item => item.id === 'input-only2');
      expect(inputItem?.isUsed).toBe(true);

      // New main list item should preserve tags (none in this case)
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'input-only2');
      expect(mainItem).toBeDefined();
      expect(mainItem?.tags).toEqual([]);
      expect(mainItem?.sourceListId).toBe('list2');
    });

    it('should preserve complex tag setup when moving tagged item', () => {
      const result = tagSyncManager.moveItemWithTags('list2', 'shared3');
      
      // Input item should be marked as used
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list2');
      const inputItem = inputList?.items.find(item => item.id === 'shared3');
      expect(inputItem?.isUsed).toBe(true);
      expect(inputItem?.tags).toEqual(['tag3']); // Tags preserved in input

      // Main list should have new item with same tags
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'shared3');
      expect(mainItem?.tags).toEqual(['tag3']);
      expect(mainItem?.order).toBe(4); // After existing 3 items
    });

    it('should not move already used items', () => {
      const result = tagSyncManager.moveItemWithTags('list1', 'shared2'); // Already used
      
      expect(result).toBe(initialState); // No change
    });
  });

  describe('Tag Deletion with Cascading Removal', () => {
    it('should remove tag from all items when deleting tag', () => {
      const result = tagSyncManager.deleteTagWithCascade('tag1');
      
      // Check all items that had tag1 no longer have it
      const mainShared1 = result.currentProject?.mainList.find(item => item.id === 'shared1');
      const mainShared2 = result.currentProject?.mainList.find(item => item.id === 'shared2');
      expect(mainShared1?.tags).toEqual([]);
      expect(mainShared2?.tags).toEqual(['tag2']);

      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputShared1 = inputList?.items.find(item => item.id === 'shared1');
      const inputShared2 = inputList?.items.find(item => item.id === 'shared2');
      expect(inputShared1?.tags).toEqual([]);
      expect(inputShared2?.tags).toEqual(['tag2']);

      // Tag should be removed from tag pool
      const tag = result.tagPool.find(t => t.id === 'tag1');
      expect(tag).toBeUndefined();
      expect(result.tagPool).toHaveLength(3); // Was 4, now 3
    });

    it('should handle deletion of unused tag', () => {
      const result = tagSyncManager.deleteTagWithCascade('tag4');
      
      // Tag pool should be reduced
      expect(result.tagPool).toHaveLength(3);
      const tag = result.tagPool.find(t => t.id === 'tag4');
      expect(tag).toBeUndefined();

      // All other items should remain unchanged
      const validation = new TagSynchronizationManager(result).validateTagSync();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Bulk Tag Operations', () => {
    it('should perform bulk add operation correctly', () => {
      const itemIds = ['shared1', 'input-only1', 'main-only1'];
      const result = tagSyncManager.bulkTagOperation(itemIds, 'tag4', 'add');
      
      // All specified items should have the tag
      itemIds.forEach(itemId => {
        const item = new TagSynchronizationManager(result).findItem(itemId);
        expect(item?.tags).toContain('tag4');
      });

      // Usage count should reflect actual additions
      const tag = result.tagPool.find(t => t.id === 'tag4');
      expect(tag?.usageCount).toBe(4); // shared1(2) + input-only1(1) + main-only1(1)
    });

    it('should perform bulk remove operation correctly', () => {
      const itemIds = ['shared1', 'shared2'];
      const result = tagSyncManager.bulkTagOperation(itemIds, 'tag1', 'remove');
      
      // Items should no longer have the tag
      itemIds.forEach(itemId => {
        const item = new TagSynchronizationManager(result).findItem(itemId);
        expect(item?.tags).not.toContain('tag1');
      });

      // Usage count should be 0 (all instances removed)
      const tag = result.tagPool.find(t => t.id === 'tag1');
      expect(tag?.usageCount).toBe(0); // Was 3, removed 4 instances (2 shared items × 2 contexts each)
    });

    it('should handle partial bulk operations gracefully', () => {
      // Try to add tag2 to items that already have it and some that don't
      const itemIds = ['shared2', 'shared1', 'main-only1']; // shared2 already has tag2
      const result = tagSyncManager.bulkTagOperation(itemIds, 'tag2', 'add');
      
      // shared2 should still have tag2 (no duplicate)
      const shared2Main = result.currentProject?.mainList.find(item => item.id === 'shared2');
      expect(shared2Main?.tags.filter(t => t === 'tag2')).toHaveLength(1);

      // Other items should now have tag2
      const shared1Main = result.currentProject?.mainList.find(item => item.id === 'shared1');
      const mainOnly1 = result.currentProject?.mainList.find(item => item.id === 'main-only1');
      expect(shared1Main?.tags).toContain('tag2');
      expect(mainOnly1?.tags).toContain('tag2');

      // Usage count should increase by 3: shared1(2) + main-only1(1)
      const tag = result.tagPool.find(t => t.id === 'tag2');
      expect(tag?.usageCount).toBe(6); // Was 3, now 6
    });
  });

  describe('Tag Usage Statistics', () => {
    it('should calculate correct usage statistics', () => {
      const tag1Stats = tagSyncManager.getTagUsageStats('tag1');
      expect(tag1Stats).toEqual({
        totalUsage: 4,
        mainListUsage: 2, // shared1, shared2
        inputListUsage: 2 // shared1, shared2 (both exist in input list too)
      });

      const tag2Stats = tagSyncManager.getTagUsageStats('tag2');
      expect(tag2Stats).toEqual({
        totalUsage: 3,
        mainListUsage: 1, // shared2
        inputListUsage: 2 // input-only1, shared2
      });

      const tag4Stats = tagSyncManager.getTagUsageStats('tag4');
      expect(tag4Stats).toEqual({
        totalUsage: 0,
        mainListUsage: 0,
        inputListUsage: 0
      });
    });

    it('should track usage changes correctly after operations', () => {
      let result = tagSyncManager.addTagWithSync(['input-only1'], 'tag3');
      let manager = new TagSynchronizationManager(result);
      
      const statsAfterAdd = manager.getTagUsageStats('tag3');
      expect(statsAfterAdd.totalUsage).toBe(3); // Was 2, now 3

      result = manager.removeTagWithSync(['shared3'], 'tag3');
      manager = new TagSynchronizationManager(result);
      
      const statsAfterRemove = manager.getTagUsageStats('tag3');
      expect(statsAfterRemove.totalUsage).toBe(2); // Was 3, now 2 (removed from shared3)
    });
  });

  describe('Synchronization Integrity Validation', () => {
    it('should validate correct synchronization state', () => {
      const validation = tagSyncManager.validateTagSync();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect tag synchronization mismatches', () => {
      // Manually create a state with mismatched tags
      const corruptedState = {
        ...initialState,
        currentProject: {
          ...initialState.currentProject!,
          // Modify main list item tags without updating input list
          mainList: initialState.currentProject!.mainList.map(item =>
            item.id === 'shared1' ? { ...item, tags: ['tag1', 'tag999'] } : item
          )
        }
      };

      const corruptedManager = new TagSynchronizationManager(corruptedState);
      const validation = corruptedManager.validateTagSync();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('Tag mismatch for item shared1');
    });

    it('should detect usage count discrepancies', () => {
      // Manually create state with incorrect usage count
      const corruptedState = {
        ...initialState,
        tagPool: initialState.tagPool.map(tag =>
          tag.id === 'tag1' ? { ...tag, usageCount: 999 } : tag
        )
      };

      const corruptedManager = new TagSynchronizationManager(corruptedState);
      const validation = corruptedManager.validateTagSync();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('Usage count mismatch for tag tag1');
    });

    it('should validate after complex sequence of operations', () => {
      // Perform a series of operations
      let result = tagSyncManager.addTagWithSync(['input-only1', 'main-only1'], 'tag4');
      let manager = new TagSynchronizationManager(result);
      
      result = manager.removeTagWithSync(['shared2'], 'tag1');
      manager = new TagSynchronizationManager(result);
      
      result = manager.moveItemWithTags('list2', 'input-only2');
      manager = new TagSynchronizationManager(result);
      
      // State should still be valid
      const validation = manager.validateTagSync();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle operations with non-existent items', () => {
      const result = tagSyncManager.addTagWithSync(['nonexistent'], 'tag1');
      
      // Should not crash and state should remain unchanged
      expect(result).toEqual(initialState);
    });

    it('should handle operations with non-existent tags', () => {
      const result = tagSyncManager.addTagWithSync(['shared1'], 'nonexistent-tag');
      
      // Items should get the tag even if it's not in tag pool
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'shared1');
      expect(mainItem?.tags).toContain('nonexistent-tag');

      // Tag pool should remain unchanged (tag doesn't exist there)
      expect(result.tagPool).toEqual(initialState.tagPool);
    });

    it('should handle operations when project is null', () => {
      const nullProjectState = { ...initialState, currentProject: null };
      const nullManager = new TagSynchronizationManager(nullProjectState);
      
      const result1 = nullManager.addTagWithSync(['item1'], 'tag1');
      const result2 = nullManager.removeTagWithSync(['item1'], 'tag1');
      const result3 = nullManager.moveItemWithTags('list1', 'item1');
      
      expect(result1).toBe(nullProjectState);
      expect(result2).toBe(nullProjectState);
      expect(result3).toBe(nullProjectState);
    });

    it('should handle empty item arrays in bulk operations', () => {
      const result = tagSyncManager.bulkTagOperation([], 'tag1', 'add');
      
      expect(result).toEqual(initialState); // No change
    });

    it('should maintain consistency with concurrent-like operations', () => {
      // Simulate rapid sequential operations that might happen in UI
      let result = tagSyncManager.addTagWithSync(['shared1'], 'tag4');
      let manager = new TagSynchronizationManager(result);
      
      result = manager.removeTagWithSync(['shared1'], 'tag1');
      manager = new TagSynchronizationManager(result);
      
      result = manager.addTagWithSync(['shared1'], 'tag2');
      manager = new TagSynchronizationManager(result);
      
      // Final state should be consistent
      const validation = manager.validateTagSync();
      expect(validation.isValid).toBe(true);
      
      // shared1 should have tags: [tag4, tag2] (removed tag1, added tag4 and tag2)
      const finalItem = manager.findItem('shared1');
      expect(finalItem?.tags.sort()).toEqual(['tag2', 'tag4']);
    });
  });
});