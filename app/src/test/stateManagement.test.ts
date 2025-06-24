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

// Mock state update functions based on App.tsx patterns
class StateManager {
  private state: AppState;
  
  constructor(state: AppState) {
    this.state = state;
  }

  // Item movement logic
  moveToMainList(listId: string, itemId: string): AppState {
    if (!this.state.currentProject) return this.state;

    const sourceList = this.state.currentProject.inputLists.find(list => list.id === listId);
    if (!sourceList) return this.state;

    const sourceItem = sourceList.items.find(item => item.id === itemId);
    if (!sourceItem || sourceItem.isUsed) return this.state;

    const newMainItem: MainListItem = {
      id: sourceItem.id,
      content: sourceItem.content,
      sourceListId: listId,
      tags: [...sourceItem.tags],
      order: this.state.currentProject.mainList.length + 1
    };

    return {
      ...this.state,
      currentProject: {
        ...this.state.currentProject,
        inputLists: this.state.currentProject.inputLists.map(list =>
          list.id === listId ? {
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

  // Selection management logic
  selectMainItem(itemId: string, isMultiSelect: boolean, isShiftSelect = false): AppState {
    const currentSelection = this.state.ui.selectedItems;
    const anchorItem = this.state.ui.anchorItem;

    if (isShiftSelect && anchorItem) {
      // Range selection logic
      const rangeItems = this.getRangeSelection(anchorItem, itemId);
      if (rangeItems.length > 0) {
        return {
          ...this.state,
          ui: {
            ...this.state.ui,
            selectedItems: rangeItems
          }
        };
      }
    }

    if (isMultiSelect) {
      // Multi-select toggle
      const isCurrentlySelected = currentSelection.includes(itemId);
      const newSelection = isCurrentlySelected
        ? currentSelection.filter(id => id !== itemId)
        : [...currentSelection, itemId];

      // Update anchor logic:
      // - If removing an item that's NOT the anchor, keep existing anchor
      // - If removing the anchor item, set anchor to one of remaining items (or null if none)
      // - If adding an item, set it as the new anchor
      let newAnchor: string | null;
      if (isCurrentlySelected) {
        // Removing an item
        if (anchorItem === itemId) {
          // Removing the anchor item - set anchor to first remaining item
          newAnchor = newSelection.length > 0 ? newSelection[0] : null;
        } else {
          // Removing non-anchor item - keep existing anchor
          newAnchor = anchorItem;
        }
      } else {
        // Adding an item - set it as new anchor
        newAnchor = itemId;
      }

      return {
        ...this.state,
        ui: {
          ...this.state.ui,
          selectedItems: newSelection,
          anchorItem: newAnchor
        }
      };
    }

    // Single selection
    return {
      ...this.state,
      ui: {
        ...this.state.ui,
        selectedItems: [itemId],
        anchorItem: itemId
      }
    };
  }

  // Tag synchronization logic
  addTag(itemIds: string[], tagId: string): AppState {
    if (!this.state.currentProject) return this.state;

    let usageIncrement = 0;

    const updatedProject = {
      ...this.state.currentProject,
      // Update main list items
      mainList: this.state.currentProject.mainList.map(item => {
        if (itemIds.includes(item.id) && !item.tags.includes(tagId)) {
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

  removeTag(itemIds: string[], tagId: string): AppState {
    if (!this.state.currentProject) return this.state;

    let usageDecrement = 0;

    const updatedProject = {
      ...this.state.currentProject,
      // Update main list items
      mainList: this.state.currentProject.mainList.map(item => {
        if (itemIds.includes(item.id) && item.tags.includes(tagId)) {
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
            usageDecrement++;
            return { ...item, tags: item.tags.filter(id => id !== tagId) };
          }
          return item;
        })
      }))
    };

    // Update tag usage count
    const updatedTagPool = this.state.tagPool.map(tag =>
      tag.id === tagId ? { ...tag, usageCount: Math.max(0, tag.usageCount - usageDecrement) } : tag
    );

    return {
      ...this.state,
      currentProject: updatedProject,
      tagPool: updatedTagPool
    };
  }

  // Reorder main list items
  reorderMainItemToPosition(itemId: string, newPosition: number): AppState {
    if (!this.state.currentProject) return this.state;

    const currentItem = this.state.currentProject.mainList.find(item => item.id === itemId);
    if (!currentItem || currentItem.order === newPosition) return this.state;

    const isMovingUp = newPosition < currentItem.order;

    const updatedMainList = this.state.currentProject.mainList.map(item => {
      if (item.id === itemId) {
        return { ...item, order: newPosition };
      }
      
      if (isMovingUp) {
        // Moving up: increment order of items at/after new position, before old position
        if (item.order >= newPosition && item.order < currentItem.order) {
          return { ...item, order: item.order + 1 };
        }
      } else {
        // Moving down: decrement order of items after old position, at/before new position
        if (item.order > currentItem.order && item.order <= newPosition) {
          return { ...item, order: item.order - 1 };
        }
      }
      
      return item;
    });

    return {
      ...this.state,
      currentProject: {
        ...this.state.currentProject,
        mainList: updatedMainList,
        modifiedAt: new Date()
      }
    };
  }

  // Helper method for range selection
  private getRangeSelection(anchorItemId: string, targetItemId: string): string[] {
    if (!this.state.currentProject) return [];

    const mainListItems = this.state.currentProject.mainList;
    const anchorIndex = mainListItems.findIndex(item => item.id === anchorItemId);
    const targetIndex = mainListItems.findIndex(item => item.id === targetItemId);

    if (anchorIndex === -1 || targetIndex === -1) return [];

    const startIndex = Math.min(anchorIndex, targetIndex);
    const endIndex = Math.max(anchorIndex, targetIndex);

    return mainListItems.slice(startIndex, endIndex + 1).map(item => item.id);
  }
}

describe('State Management - Core Business Logic', () => {
  let initialState: AppState;
  let stateManager: StateManager;

  beforeEach(() => {
    const inputList1 = createInputList('list1', 'Todo Items', [
      createInputListItem('item1', 'Write tests', false, ['tag1']),
      createInputListItem('item2', 'Review code', false),
      createInputListItem('item3', 'Deploy app', true, ['tag2']) // Already used
    ]);

    const inputList2 = createInputList('list2', 'Features', [
      createInputListItem('item4', 'Dark mode', false),
      createInputListItem('item5', 'Export feature', false, ['tag1'])
    ]);

    const project = createProject('project1', 'Test Project', [inputList1, inputList2], [
      createMainListItem('item3', 'Deploy app', 'list1', 1, ['tag2']),
      createMainListItem('item6', 'Authentication', 'list2', 2, ['tag1', 'tag2'])
    ]);

    const tags = [
      createTag('tag1', 'High Priority', '#ef4444', 3),
      createTag('tag2', 'Development', '#3b82f6', 2),
      createTag('tag3', 'Design', '#8b5cf6', 0)
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

    stateManager = new StateManager(initialState);
  });

  describe('Item Movement Logic', () => {
    it('should move unused item from input list to main list', () => {
      const result = stateManager.moveToMainList('list1', 'item1');
      
      expect(result.currentProject?.mainList).toHaveLength(3);
      
      const newMainItem = result.currentProject?.mainList.find(item => item.id === 'item1');
      expect(newMainItem).toEqual({
        id: 'item1',
        content: 'Write tests',
        sourceListId: 'list1',
        tags: ['tag1'],
        order: 3
      });

      // Source item should be marked as used
      const sourceList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const sourceItem = sourceList?.items.find(item => item.id === 'item1');
      expect(sourceItem?.isUsed).toBe(true);
    });

    it('should not move already used item', () => {
      const result = stateManager.moveToMainList('list1', 'item3');
      
      expect(result).toBe(initialState); // No change
    });

    it('should not move item from non-existent list', () => {
      const result = stateManager.moveToMainList('nonexistent', 'item1');
      
      expect(result).toBe(initialState); // No change
    });

    it('should preserve tags when moving item', () => {
      const result = stateManager.moveToMainList('list2', 'item5');
      
      const newMainItem = result.currentProject?.mainList.find(item => item.id === 'item5');
      expect(newMainItem?.tags).toEqual(['tag1']);
    });

    it('should assign correct order to new main list item', () => {
      const result = stateManager.moveToMainList('list1', 'item1');
      
      const newMainItem = result.currentProject?.mainList.find(item => item.id === 'item1');
      expect(newMainItem?.order).toBe(3); // After existing 2 items
    });
  });

  describe('Selection Management Logic', () => {
    it('should select single item', () => {
      const result = stateManager.selectMainItem('item3', false);
      
      expect(result.ui.selectedItems).toEqual(['item3']);
      expect(result.ui.anchorItem).toBe('item3');
    });

    it('should toggle item in multi-select mode', () => {
      // First selection
      let result = stateManager.selectMainItem('item3', true);
      expect(result.ui.selectedItems).toEqual(['item3']);
      expect(result.ui.anchorItem).toBe('item3');

      // Toggle on second item
      const stateManager2 = new StateManager(result);
      result = stateManager2.selectMainItem('item6', true);
      expect(result.ui.selectedItems).toEqual(['item3', 'item6']);
      expect(result.ui.anchorItem).toBe('item6');

      // Toggle off first item
      const stateManager3 = new StateManager(result);
      result = stateManager3.selectMainItem('item3', true);
      expect(result.ui.selectedItems).toEqual(['item6']);
      expect(result.ui.anchorItem).toBe('item6'); // Should remain
    });

    it('should clear anchor when removing anchor item from selection', () => {
      // Set up initial selection with anchor
      let result = stateManager.selectMainItem('item3', true);
      expect(result.ui.anchorItem).toBe('item3');

      // Remove anchor item from selection
      const stateManager2 = new StateManager(result);
      result = stateManager2.selectMainItem('item3', true);
      expect(result.ui.selectedItems).toEqual([]);
      expect(result.ui.anchorItem).toBe(null);
    });

    it('should handle range selection with shift-click', () => {
      // First set anchor
      let result = stateManager.selectMainItem('item3', false);
      expect(result.ui.anchorItem).toBe('item3');

      // Shift-click to select range
      const stateManager2 = new StateManager(result);
      result = stateManager2.selectMainItem('item6', false, true);
      expect(result.ui.selectedItems).toEqual(['item3', 'item6']);
    });

    it('should replace selection in single-select mode', () => {
      // Set up initial selection
      let result = stateManager.selectMainItem('item3', true);
      expect(result.ui.selectedItems).toEqual(['item3']);

      // Single-click should replace selection
      const stateManager2 = new StateManager(result);
      result = stateManager2.selectMainItem('item6', false);
      expect(result.ui.selectedItems).toEqual(['item6']);
      expect(result.ui.anchorItem).toBe('item6');
    });
  });

  describe('Tag Synchronization Logic', () => {
    it('should add tag to single item and update usage count', () => {
      const result = stateManager.addTag(['item3'], 'tag3');
      
      // Check main list item
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'item3');
      expect(mainItem?.tags).toEqual(['tag2', 'tag3']);

      // Check input list item (same ID, should also get the tag)
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputItem = inputList?.items.find(item => item.id === 'item3');
      expect(inputItem?.tags).toEqual(['tag2', 'tag3']);

      // Check tag usage count (incremented by 2 - both main and input item)
      const tag = result.tagPool.find(t => t.id === 'tag3');
      expect(tag?.usageCount).toBe(2);
    });

    it('should add tag to multiple items and update usage count correctly', () => {
      const result = stateManager.addTag(['item3', 'item6'], 'tag3');
      
      // Check both items have the tag
      const mainItem1 = result.currentProject?.mainList.find(item => item.id === 'item3');
      const mainItem2 = result.currentProject?.mainList.find(item => item.id === 'item6');
      expect(mainItem1?.tags).toContain('tag3');
      expect(mainItem2?.tags).toContain('tag3');

      // Check tag usage count (item3: +2 for main+input, item6: +1 for main only = +3 total)
      const tag = result.tagPool.find(t => t.id === 'tag3');
      expect(tag?.usageCount).toBe(3);
    });

    it('should not add duplicate tags', () => {
      const result = stateManager.addTag(['item3'], 'tag2'); // tag2 already exists on item3
      
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'item3');
      expect(mainItem?.tags).toEqual(['tag2']); // No duplicate

      // Usage count should not change
      const tag = result.tagPool.find(t => t.id === 'tag2');
      expect(tag?.usageCount).toBe(2); // Same as initial
    });

    it('should add tag to input list items and synchronize', () => {
      const result = stateManager.addTag(['item1'], 'tag3');
      
      // Check input list item
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputItem = inputList?.items.find(item => item.id === 'item1');
      expect(inputItem?.tags).toEqual(['tag1', 'tag3']);

      // Check tag usage count
      const tag = result.tagPool.find(t => t.id === 'tag3');
      expect(tag?.usageCount).toBe(1);
    });

    it('should remove tag from single item and update usage count', () => {
      const result = stateManager.removeTag(['item3'], 'tag2');
      
      // Check main list item
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'item3');
      expect(mainItem?.tags).toEqual([]);

      // Check input list item
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputItem = inputList?.items.find(item => item.id === 'item3');
      expect(inputItem?.tags).toEqual([]);

      // Check tag usage count decremented by 2 (main + input item)
      const tag = result.tagPool.find(t => t.id === 'tag2');
      expect(tag?.usageCount).toBe(0); // Was 2, now 0
    });

    it('should remove tag from multiple items and update usage count correctly', () => {
      const result = stateManager.removeTag(['item3', 'item6'], 'tag2');
      
      // Check both items have tag removed
      const mainItem1 = result.currentProject?.mainList.find(item => item.id === 'item3');
      const mainItem2 = result.currentProject?.mainList.find(item => item.id === 'item6');
      expect(mainItem1?.tags).toEqual([]);
      expect(mainItem2?.tags).toEqual(['tag1']);

      // Check tag usage count decremented by 2
      const tag = result.tagPool.find(t => t.id === 'tag2');
      expect(tag?.usageCount).toBe(0); // Was 2, now 0
    });

    it('should not allow negative usage counts', () => {
      // Try to remove tag that doesn't exist on item
      const result = stateManager.removeTag(['item3'], 'tag3');
      
      // Usage count should remain 0, not go negative
      const tag = result.tagPool.find(t => t.id === 'tag3');
      expect(tag?.usageCount).toBe(0);
    });
  });

  describe('Main List Reordering Logic', () => {
    it('should reorder item to higher position (moving up)', () => {
      const result = stateManager.reorderMainItemToPosition('item6', 1); // Move from order 2 to 1
      
      const reorderedItem = result.currentProject?.mainList.find(item => item.id === 'item6');
      expect(reorderedItem?.order).toBe(1);

      // Original item at position 1 should move to position 2
      const displacedItem = result.currentProject?.mainList.find(item => item.id === 'item3');
      expect(displacedItem?.order).toBe(2);
    });

    it('should reorder item to lower position (moving down)', () => {
      // Add a third item first
      const extendedState = {
        ...initialState,
        currentProject: {
          ...initialState.currentProject!,
          mainList: [
            ...initialState.currentProject!.mainList,
            createMainListItem('item7', 'New item', 'list1', 3)
          ]
        }
      };

      const stateManager2 = new StateManager(extendedState);
      const result = stateManager2.reorderMainItemToPosition('item3', 3); // Move from order 1 to 3
      
      const reorderedItem = result.currentProject?.mainList.find(item => item.id === 'item3');
      expect(reorderedItem?.order).toBe(3);

      // Items that were at positions 2 and 3 should shift up
      const shiftedItem1 = result.currentProject?.mainList.find(item => item.id === 'item6');
      const shiftedItem2 = result.currentProject?.mainList.find(item => item.id === 'item7');
      expect(shiftedItem1?.order).toBe(1);
      expect(shiftedItem2?.order).toBe(2);
    });

    it('should not change order if position is the same', () => {
      const result = stateManager.reorderMainItemToPosition('item3', 1); // Already at position 1
      
      expect(result).toBe(initialState); // No change
    });

    it('should handle non-existent item gracefully', () => {
      const result = stateManager.reorderMainItemToPosition('nonexistent', 1);
      
      expect(result).toBe(initialState); // No change
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle operations when no current project exists', () => {
      const stateWithoutProject = {
        ...initialState,
        currentProject: null
      };
      const stateManager2 = new StateManager(stateWithoutProject);

      const result1 = stateManager2.moveToMainList('list1', 'item1');
      const result2 = stateManager2.addTag(['item1'], 'tag1');
      const result3 = stateManager2.reorderMainItemToPosition('item1', 1);

      expect(result1).toBe(stateWithoutProject);
      expect(result2).toBe(stateWithoutProject);
      expect(result3).toBe(stateWithoutProject);
    });

    it('should handle operations with empty lists', () => {
      const emptyState = {
        ...initialState,
        currentProject: createProject('empty', 'Empty Project', [], [])
      };
      const stateManager2 = new StateManager(emptyState);

      const result = stateManager2.moveToMainList('nonexistent', 'item1');
      expect(result).toBe(emptyState);
    });

    it('should handle tag operations with non-existent tags', () => {
      const result = stateManager.addTag(['item3'], 'nonexistent-tag');
      
      // Should not crash, but tag pool should remain unchanged
      expect(result.tagPool).toEqual(initialState.tagPool);
    });
  });
});