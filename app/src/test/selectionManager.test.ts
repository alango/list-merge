import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState, Project, InputList, MainListItem, InputListItem } from '../types/index';

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

const createProject = (id: string, name: string, inputLists: InputList[] = [], mainList: MainListItem[] = []): Project => ({
  id,
  name,
  createdAt: new Date(),
  modifiedAt: new Date(),
  inputLists,
  mainList
});

// Selection Manager class based on App.tsx patterns
class SelectionManager {
  private state: AppState;
  
  constructor(state: AppState) {
    this.state = state;
  }

  // Core selection logic from handleSelectMainItem
  selectItem(itemId: string, isMultiSelect: boolean, isShiftSelect = false): AppState {
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

  // Select all items in main list
  selectAll(): AppState {
    if (!this.state.currentProject) return this.state;

    const allMainItemIds = this.state.currentProject.mainList.map(item => item.id);
    
    return {
      ...this.state,
      ui: {
        ...this.state.ui,
        selectedItems: allMainItemIds,
        anchorItem: allMainItemIds[0] || null
      }
    };
  }

  // Clear all selections
  clearSelection(): AppState {
    return {
      ...this.state,
      ui: {
        ...this.state.ui,
        selectedItems: [],
        anchorItem: null
      }
    };
  }

  // Helper: Find item context (main list vs input list)
  findItemWithContext(itemId: string) {
    if (!this.state.currentProject) return null;

    // Check main list first
    const mainListIndex = this.state.currentProject.mainList.findIndex(item => item.id === itemId);
    if (mainListIndex !== -1) {
      return {
        type: 'main-list' as const,
        list: this.state.currentProject.mainList,
        index: mainListIndex,
        item: this.state.currentProject.mainList[mainListIndex],
        listId: null
      };
    }

    // Check input lists
    for (const inputList of this.state.currentProject.inputLists) {
      const inputItemIndex = inputList.items.findIndex(item => item.id === itemId);
      if (inputItemIndex !== -1) {
        return {
          type: 'input-list' as const,
          list: inputList.items,
          index: inputItemIndex,
          item: inputList.items[inputItemIndex],
          listId: inputList.id
        };
      }
    }

    return null;
  }

  // Helper: Get range selection between two items
  private getRangeSelection(anchorItemId: string, targetItemId: string): string[] {
    if (!this.state.currentProject) return [];

    const anchorContext = this.findItemWithContext(anchorItemId);
    const targetContext = this.findItemWithContext(targetItemId);

    // Both items must be in the same context (main list or same input list)
    if (!anchorContext || !targetContext) return [];
    
    if (anchorContext.type !== targetContext.type) return [];
    
    if (anchorContext.type === 'input-list' && anchorContext.listId !== targetContext.listId) {
      return []; // Different input lists
    }

    // Get range of items
    const startIndex = Math.min(anchorContext.index, targetContext.index);
    const endIndex = Math.max(anchorContext.index, targetContext.index);

    return anchorContext.list.slice(startIndex, endIndex + 1).map((item: { id: string }) => item.id);
  }

  // Bulk selection operations
  selectMultiple(itemIds: string[]): AppState {
    const validItemIds = itemIds.filter(id => this.findItemWithContext(id) !== null);
    
    return {
      ...this.state,
      ui: {
        ...this.state.ui,
        selectedItems: validItemIds,
        anchorItem: validItemIds[0] || null
      }
    };
  }

  // Toggle multiple items
  toggleMultiple(itemIds: string[]): AppState {
    const currentSelection = this.state.ui.selectedItems;
    const validItemIds = itemIds.filter(id => this.findItemWithContext(id) !== null);
    
    const newSelection = [...currentSelection];
    
    for (const itemId of validItemIds) {
      const isSelected = currentSelection.includes(itemId);
      if (isSelected) {
        const index = newSelection.indexOf(itemId);
        if (index > -1) newSelection.splice(index, 1);
      } else {
        newSelection.push(itemId);
      }
    }

    // Update anchor based on selection changes
    let newAnchor = this.state.ui.anchorItem;
    if (newAnchor && !newSelection.includes(newAnchor)) {
      newAnchor = newSelection[0] || null;
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

  // Advanced range selection with validation
  selectRange(startItemId: string, endItemId: string): AppState {
    const rangeItems = this.getRangeSelection(startItemId, endItemId);
    
    if (rangeItems.length === 0) return this.state;

    return {
      ...this.state,
      ui: {
        ...this.state.ui,
        selectedItems: rangeItems,
        anchorItem: startItemId
      }
    };
  }

  // Selection validation utilities
  isSelected(itemId: string): boolean {
    return this.state.ui.selectedItems.includes(itemId);
  }

  getSelectionCount(): number {
    return this.state.ui.selectedItems.length;
  }

  getSelectedItems(): string[] {
    return [...this.state.ui.selectedItems];
  }

  hasSelection(): boolean {
    return this.state.ui.selectedItems.length > 0;
  }

  isMultiSelection(): boolean {
    return this.state.ui.selectedItems.length > 1;
  }

  getAnchorItem(): string | null {
    return this.state.ui.anchorItem;
  }
}

describe('Selection Manager - Multi-Select Functionality', () => {
  let initialState: AppState;
  let selectionManager: SelectionManager;

  beforeEach(() => {
    const inputList1 = createInputList('list1', 'Todo Items', [
      createInputListItem('input1', 'Task 1'),
      createInputListItem('input2', 'Task 2'),
      createInputListItem('input3', 'Task 3')
    ]);

    const inputList2 = createInputList('list2', 'Features', [
      createInputListItem('input4', 'Feature A'),
      createInputListItem('input5', 'Feature B')
    ]);

    const project = createProject('project1', 'Test Project', [inputList1, inputList2], [
      createMainListItem('main1', 'Priority 1', 'list1', 1),
      createMainListItem('main2', 'Priority 2', 'list1', 2),
      createMainListItem('main3', 'Priority 3', 'list2', 3),
      createMainListItem('main4', 'Priority 4', 'list2', 4),
      createMainListItem('main5', 'Priority 5', 'list1', 5)
    ]);

    initialState = {
      currentProject: project,
      savedProjects: [],
      tagPool: [],
      ui: {
        selectedItems: [],
        activeInputList: 'list1',
        anchorItem: null
      }
    };

    selectionManager = new SelectionManager(initialState);
  });

  describe('Single Item Selection', () => {
    it('should select single item and set anchor', () => {
      const result = selectionManager.selectItem('main1', false);
      
      expect(result.ui.selectedItems).toEqual(['main1']);
      expect(result.ui.anchorItem).toBe('main1');
    });

    it('should replace selection when selecting new item in single-select mode', () => {
      // First selection
      let result = selectionManager.selectItem('main1', false);
      expect(result.ui.selectedItems).toEqual(['main1']);

      // Replace with new selection
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main2', false);
      expect(result.ui.selectedItems).toEqual(['main2']);
      expect(result.ui.anchorItem).toBe('main2');
    });

    it('should handle selecting same item in single-select mode', () => {
      let result = selectionManager.selectItem('main1', false);
      
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main1', false);
      expect(result.ui.selectedItems).toEqual(['main1']);
      expect(result.ui.anchorItem).toBe('main1');
    });
  });

  describe('Multi-Select Mode (Ctrl+Click)', () => {
    it('should add item to selection in multi-select mode', () => {
      // First item
      let result = selectionManager.selectItem('main1', true);
      expect(result.ui.selectedItems).toEqual(['main1']);
      expect(result.ui.anchorItem).toBe('main1');

      // Add second item
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main2', true);
      expect(result.ui.selectedItems).toEqual(['main1', 'main2']);
      expect(result.ui.anchorItem).toBe('main2');
    });

    it('should toggle item off when already selected', () => {
      // Select two items
      let result = selectionManager.selectItem('main1', true);
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main2', true);
      expect(result.ui.selectedItems).toEqual(['main1', 'main2']);

      // Toggle first item off
      const manager3 = new SelectionManager(result);
      result = manager3.selectItem('main1', true);
      expect(result.ui.selectedItems).toEqual(['main2']);
      expect(result.ui.anchorItem).toBe('main2'); // Should remain
    });

    it('should clear anchor when removing anchor item', () => {
      let result = selectionManager.selectItem('main1', true);
      expect(result.ui.anchorItem).toBe('main1');

      // Remove anchor item
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main1', true);
      expect(result.ui.selectedItems).toEqual([]);
      expect(result.ui.anchorItem).toBe(null);
    });

    it('should maintain anchor when removing non-anchor item', () => {
      // Select anchor item
      let result = selectionManager.selectItem('main1', true);
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main2', true);
      expect(result.ui.anchorItem).toBe('main2');

      // Remove non-anchor item
      const manager3 = new SelectionManager(result);
      result = manager3.selectItem('main1', true);
      expect(result.ui.selectedItems).toEqual(['main2']);
      expect(result.ui.anchorItem).toBe('main2'); // Should remain
    });

    it('should handle selecting multiple non-adjacent items', () => {
      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      result = manager.selectItem('main3', true);
      manager = new SelectionManager(result);
      result = manager.selectItem('main5', true);

      expect(result.ui.selectedItems).toEqual(['main1', 'main3', 'main5']);
      expect(result.ui.anchorItem).toBe('main5');
    });
  });

  describe('Range Selection (Shift+Click)', () => {
    it('should select range from anchor to target', () => {
      // Set anchor
      let result = selectionManager.selectItem('main2', false);
      expect(result.ui.anchorItem).toBe('main2');

      // Shift-click to select range
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main4', false, true);
      expect(result.ui.selectedItems).toEqual(['main2', 'main3', 'main4']);
    });

    it('should select range in reverse direction', () => {
      // Set anchor at higher position
      let result = selectionManager.selectItem('main4', false);
      expect(result.ui.anchorItem).toBe('main4');

      // Shift-click to earlier position
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main2', false, true);
      expect(result.ui.selectedItems).toEqual(['main2', 'main3', 'main4']);
    });

    it('should handle range selection with same start and end', () => {
      let result = selectionManager.selectItem('main3', false);
      
      const manager2 = new SelectionManager(result);
      result = manager2.selectItem('main3', false, true);
      expect(result.ui.selectedItems).toEqual(['main3']);
    });

    it('should not select range if no anchor is set', () => {
      // No anchor set, shift-click should act as normal click
      const result = selectionManager.selectItem('main2', false, true);
      expect(result.ui.selectedItems).toEqual(['main2']);
      expect(result.ui.anchorItem).toBe('main2');
    });

    it('should not select range if anchor item is not found', () => {
      // Set anchor then simulate anchor being removed from project
      const result = selectionManager.selectItem('main1', false);
      
      // Create state where anchor item no longer exists
      const stateWithMissingAnchor = {
        ...result,
        ui: { ...result.ui, anchorItem: 'nonexistent' }
      };
      
      const manager2 = new SelectionManager(stateWithMissingAnchor);
      const finalResult = manager2.selectItem('main3', false, true);
      
      // Should fall back to single selection
      expect(finalResult.ui.selectedItems).toEqual(['main3']);
    });
  });

  describe('Cross-Context Selection Validation', () => {
    it('should not select range across different contexts (main list vs input list)', () => {
      // This test simulates the validation that would prevent range selection
      // across main list and input list items
      
      const anchorContext = selectionManager.findItemWithContext('main1');
      const targetContext = selectionManager.findItemWithContext('input1');
      
      expect(anchorContext?.type).toBe('main-list');
      expect(targetContext?.type).toBe('input-list');
      expect(anchorContext?.type).not.toBe(targetContext?.type);
    });

    it('should not select range across different input lists', () => {
      const context1 = selectionManager.findItemWithContext('input1'); // list1
      const context2 = selectionManager.findItemWithContext('input4'); // list2
      
      expect(context1?.listId).toBe('list1');
      expect(context2?.listId).toBe('list2');
      expect(context1?.listId).not.toBe(context2?.listId);
    });

    it('should find correct context for main list items', () => {
      const context = selectionManager.findItemWithContext('main1');
      
      expect(context).toEqual({
        type: 'main-list',
        list: initialState.currentProject!.mainList,
        index: 0,
        item: initialState.currentProject!.mainList[0],
        listId: null
      });
    });

    it('should find correct context for input list items', () => {
      const context = selectionManager.findItemWithContext('input1');
      
      expect(context).toEqual({
        type: 'input-list',
        list: initialState.currentProject!.inputLists[0].items,
        index: 0,
        item: initialState.currentProject!.inputLists[0].items[0],
        listId: 'list1'
      });
    });

    it('should return null for non-existent items', () => {
      const context = selectionManager.findItemWithContext('nonexistent');
      expect(context).toBe(null);
    });
  });

  describe('Bulk Selection Operations', () => {
    it('should select all items in main list', () => {
      const result = selectionManager.selectAll();
      
      expect(result.ui.selectedItems).toEqual(['main1', 'main2', 'main3', 'main4', 'main5']);
      expect(result.ui.anchorItem).toBe('main1');
    });

    it('should clear all selections', () => {
      // First select some items
      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      result = manager.selectItem('main2', true);
      expect(result.ui.selectedItems).toHaveLength(2);

      // Clear selection
      manager = new SelectionManager(result);
      result = manager.clearSelection();
      expect(result.ui.selectedItems).toEqual([]);
      expect(result.ui.anchorItem).toBe(null);
    });

    it('should select multiple specific items', () => {
      const result = selectionManager.selectMultiple(['main1', 'main3', 'main5']);
      
      expect(result.ui.selectedItems).toEqual(['main1', 'main3', 'main5']);
      expect(result.ui.anchorItem).toBe('main1');
    });

    it('should filter out invalid items in bulk selection', () => {
      const result = selectionManager.selectMultiple(['main1', 'nonexistent', 'main3']);
      
      expect(result.ui.selectedItems).toEqual(['main1', 'main3']);
    });

    it('should toggle multiple items', () => {
      // Start with some selections
      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      result = manager.selectItem('main2', true);
      expect(result.ui.selectedItems).toEqual(['main1', 'main2']);

      // Toggle multiple items (some selected, some not)
      manager = new SelectionManager(result);
      result = manager.toggleMultiple(['main1', 'main3', 'main4']); // main1 off, main3/main4 on
      expect(result.ui.selectedItems).toEqual(['main2', 'main3', 'main4']);
    });
  });

  describe('Selection State Queries', () => {
    it('should correctly report if item is selected', () => {
      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      result = manager.selectItem('main3', true);
      manager = new SelectionManager(result);

      expect(manager.isSelected('main1')).toBe(true);
      expect(manager.isSelected('main2')).toBe(false);
      expect(manager.isSelected('main3')).toBe(true);
    });

    it('should report correct selection count', () => {
      expect(selectionManager.getSelectionCount()).toBe(0);

      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      expect(manager.getSelectionCount()).toBe(1);

      result = manager.selectItem('main2', true);
      manager = new SelectionManager(result);
      expect(manager.getSelectionCount()).toBe(2);
    });

    it('should return correct selected items array', () => {
      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      result = manager.selectItem('main3', true);
      manager = new SelectionManager(result);

      const selected = manager.getSelectedItems();
      expect(selected).toEqual(['main1', 'main3']);
      
      // Should return a copy, not the original array
      selected.push('main2');
      expect(manager.getSelectedItems()).toEqual(['main1', 'main3']);
    });

    it('should correctly report if any selection exists', () => {
      expect(selectionManager.hasSelection()).toBe(false);

      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      expect(manager.hasSelection()).toBe(true);

      result = manager.clearSelection();
      manager = new SelectionManager(result);
      expect(manager.hasSelection()).toBe(false);
    });

    it('should correctly report if multi-selection exists', () => {
      expect(selectionManager.isMultiSelection()).toBe(false);

      let result = selectionManager.selectItem('main1', true);
      let manager = new SelectionManager(result);
      expect(manager.isMultiSelection()).toBe(false);

      result = manager.selectItem('main2', true);
      manager = new SelectionManager(result);
      expect(manager.isMultiSelection()).toBe(true);
    });

    it('should return correct anchor item', () => {
      expect(selectionManager.getAnchorItem()).toBe(null);

      let result = selectionManager.selectItem('main1', false);
      let manager = new SelectionManager(result);
      expect(manager.getAnchorItem()).toBe('main1');

      result = manager.clearSelection();
      manager = new SelectionManager(result);
      expect(manager.getAnchorItem()).toBe(null);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle operations when no current project exists', () => {
      const stateWithoutProject = {
        ...initialState,
        currentProject: null
      };
      const manager = new SelectionManager(stateWithoutProject);

      const result = manager.selectAll();
      expect(result).toBe(stateWithoutProject);

      const context = manager.findItemWithContext('main1');
      expect(context).toBe(null);
    });

    it('should handle empty main list for select all', () => {
      const emptyProject = createProject('empty', 'Empty Project', [], []);
      const stateWithEmptyProject = {
        ...initialState,
        currentProject: emptyProject
      };
      const manager = new SelectionManager(stateWithEmptyProject);

      const result = manager.selectAll();
      expect(result.ui.selectedItems).toEqual([]);
      expect(result.ui.anchorItem).toBe(null);
    });

    it('should handle range selection with invalid anchor', () => {
      // Set up state with invalid anchor
      const stateWithInvalidAnchor = {
        ...initialState,
        ui: { ...initialState.ui, anchorItem: 'invalid' }
      };
      const manager = new SelectionManager(stateWithInvalidAnchor);

      const result = manager.selectItem('main1', false, true);
      // Should fall back to normal selection since anchor is invalid
      expect(result.ui.selectedItems).toEqual(['main1']);
      expect(result.ui.anchorItem).toBe('main1');
    });

    it('should handle selection persistence after item removal', () => {
      // Select items
      const result = selectionManager.selectMultiple(['main1', 'main3', 'main5']);
      expect(result.ui.selectedItems).toEqual(['main1', 'main3', 'main5']);

      // Simulate removing main3 from project and verify selection handling
      const modifiedProject = createProject('project1', 'Test Project', 
        initialState.currentProject!.inputLists,
        initialState.currentProject!.mainList.filter(item => item.id !== 'main3')
      );
      
      const stateAfterRemoval = {
        ...result,
        currentProject: modifiedProject
      };
      
      const manager = new SelectionManager(stateAfterRemoval);
      
      // main3 should still be in selectedItems (cleanup would happen separately)
      expect(manager.isSelected('main1')).toBe(true);
      expect(manager.isSelected('main3')).toBe(true); // Still selected but item doesn't exist
      expect(manager.isSelected('main5')).toBe(true);
      
      // findItemWithContext should return null for removed item
      expect(manager.findItemWithContext('main3')).toBe(null);
    });
  });
});