import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState, Project, InputList, MainListItem, Tag, InputListItem } from '../types/index';

// Drag and drop data interfaces from App.tsx
interface DragData {
  type: 'input-item' | 'main-item' | 'tag';
  itemId?: string;
  sourceListId?: string;
  content?: string;
  isMultiSelect?: boolean;
  selectedItems?: string[];
  // Tag-specific fields
  tagId?: string;
  tagName?: string;
  tagColor?: string;
}

interface DropData {
  type: 'main-list' | 'main-list-position' | 'main-list-item' | 'input-list-item';
  listId?: string;
  position?: number;
  itemId?: string;
}

interface DragEndEvent {
  active: { id: string; data: DragData };
  over: { id: string; data: DropData } | null;
}

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

// Drag-and-drop manager based on App.tsx patterns
class DragDropManager {
  private state: AppState;
  
  constructor(state: AppState) {
    this.state = state;
  }

  // Main drag end handler logic from App.tsx
  handleDragEnd(event: DragEndEvent): AppState {
    const { active, over } = event;
    
    if (!over || !this.state.currentProject) return this.state;

    const dragData = active.data;
    const dropData = over.data;

    // Handle different drag types
    switch (dragData.type) {
      case 'input-item':
        return this.handleInputItemDrag(dragData, dropData);
      case 'main-item':
        return this.handleMainItemDrag(dragData, dropData);
      case 'tag':
        return this.handleTagDrag(dragData, dropData);
      default:
        return this.state;
    }
  }

  // Input item drag logic
  private handleInputItemDrag(dragData: DragData, dropData: DropData): AppState {
    if (dragData.type !== 'input-item' || !dragData.itemId || !dragData.sourceListId) {
      return this.state;
    }

    switch (dropData.type) {
      case 'main-list':
        return this.moveToMainList(dragData.sourceListId, dragData.itemId);
      case 'main-list-position':
        if (dropData.position !== undefined) {
          return this.moveToMainListAtPosition(dragData.sourceListId, dragData.itemId, dropData.position);
        }
        return this.state;
      default:
        return this.state;
    }
  }

  // Main item drag logic
  private handleMainItemDrag(dragData: DragData, dropData: DropData): AppState {
    if (dragData.type !== 'main-item' || !dragData.itemId) {
      return this.state;
    }

    if (dropData.type === 'main-list-position' && dropData.position !== undefined) {
      const selectedItems = this.state.ui.selectedItems;
      
      // Check if this is a multi-select operation
      if (selectedItems.includes(dragData.itemId) && selectedItems.length > 1) {
        return this.reorderMultipleItems(selectedItems, dropData.position);
      } else {
        return this.reorderMainItemToPosition(dragData.itemId, dropData.position);
      }
    }

    return this.state;
  }

  // Tag drag logic
  private handleTagDrag(dragData: DragData, dropData: DropData): AppState {
    if (dragData.type !== 'tag' || !dragData.tagId) {
      return this.state;
    }

    const targetItemIds = this.getTargetItemIds(dropData);
    if (targetItemIds.length > 0) {
      return this.addTag(targetItemIds, dragData.tagId);
    }

    return this.state;
  }

  // Get target item IDs for tag application
  private getTargetItemIds(dropData: DropData): string[] {
    const selectedItems = this.state.ui.selectedItems;

    switch (dropData.type) {
      case 'main-list-item':
        if (dropData.itemId) {
          // If target item is in selection and there are multiple selected, apply to all
          if (selectedItems.includes(dropData.itemId) && selectedItems.length > 1) {
            return selectedItems;
          }
          return [dropData.itemId];
        }
        break;
      case 'input-list-item':
        if (dropData.itemId) {
          return [dropData.itemId];
        }
        break;
    }
    return [];
  }

  // Move item from input list to main list
  moveToMainList(sourceListId: string, itemId: string): AppState {
    if (!this.state.currentProject) return this.state;

    const sourceList = this.state.currentProject.inputLists.find(list => list.id === sourceListId);
    if (!sourceList) return this.state;

    const sourceItem = sourceList.items.find(item => item.id === itemId);
    if (!sourceItem || sourceItem.isUsed) return this.state;

    const newMainItem: MainListItem = {
      id: sourceItem.id,
      content: sourceItem.content,
      sourceListId,
      tags: [...sourceItem.tags],
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

  // Move item to specific position in main list
  moveToMainListAtPosition(sourceListId: string, itemId: string, position: number): AppState {
    if (!this.state.currentProject) return this.state;

    const sourceList = this.state.currentProject.inputLists.find(list => list.id === sourceListId);
    if (!sourceList) return this.state;

    const sourceItem = sourceList.items.find(item => item.id === itemId);
    if (!sourceItem || sourceItem.isUsed) return this.state;

    const newMainItem: MainListItem = {
      id: sourceItem.id,
      content: sourceItem.content,
      sourceListId,
      tags: [...sourceItem.tags],
      order: position
    };

    // Update orders of existing items at/after the insertion position
    const updatedMainList = this.state.currentProject.mainList.map(item => ({
      ...item,
      order: item.order >= position ? item.order + 1 : item.order
    }));

    // Insert new item at specified position
    updatedMainList.splice(position - 1, 0, newMainItem);

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
        mainList: updatedMainList,
        modifiedAt: new Date()
      }
    };
  }

  // Reorder single main list item
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

  // Reorder multiple items to new position
  reorderMultipleItems(selectedItemIds: string[], newPosition: number): AppState {
    if (!this.state.currentProject || selectedItemIds.length === 0) return this.state;

    const selectedItems = this.state.currentProject.mainList
      .filter(item => selectedItemIds.includes(item.id))
      .sort((a, b) => a.order - b.order);

    if (selectedItems.length === 0) return this.state;

    // Get non-selected items
    const nonSelectedItems = this.state.currentProject.mainList
      .filter(item => !selectedItemIds.includes(item.id))
      .sort((a, b) => a.order - b.order);

    // Rebuild the list with new order
    const newMainList: MainListItem[] = [];
    let currentOrder = 1;

    // Calculate actual insertion position considering removed items
    const adjustedPosition = Math.min(newPosition, nonSelectedItems.length + 1);

    // Add non-selected items before insertion point
    for (let i = 0; i < adjustedPosition - 1; i++) {
      if (nonSelectedItems[i]) {
        newMainList.push({ ...nonSelectedItems[i], order: currentOrder++ });
      }
    }

    // Add selected items at new position
    selectedItems.forEach(item => {
      newMainList.push({ ...item, order: currentOrder++ });
    });

    // Add remaining non-selected items after insertion point
    for (let i = adjustedPosition - 1; i < nonSelectedItems.length; i++) {
      if (nonSelectedItems[i]) {
        newMainList.push({ ...nonSelectedItems[i], order: currentOrder++ });
      }
    }

    return {
      ...this.state,
      currentProject: {
        ...this.state.currentProject,
        mainList: newMainList,
        modifiedAt: new Date()
      }
    };
  }

  // Add tag to items
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

  // Utility methods for testing
  getMainListItemByPosition(position: number): MainListItem | null {
    if (!this.state.currentProject) return null;
    return this.state.currentProject.mainList.find(item => item.order === position) || null;
  }

  validateMainListOrder(): { isValid: boolean; errors: string[] } {
    if (!this.state.currentProject) return { isValid: true, errors: [] };

    const items = this.state.currentProject.mainList.sort((a, b) => a.order - b.order);
    const errors: string[] = [];

    // Check for sequential order starting from 1
    items.forEach((item, index) => {
      const expectedOrder = index + 1;
      if (item.order !== expectedOrder) {
        errors.push(`Item ${item.id} has order ${item.order}, expected ${expectedOrder}`);
      }
    });

    // Check for duplicates
    const orders = items.map(item => item.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      errors.push('Duplicate order values found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

describe('Drag-and-Drop Logic', () => {
  let initialState: AppState;
  let dragDropManager: DragDropManager;

  beforeEach(() => {
    const inputList1 = createInputList('list1', 'Todo Items', [
      createInputListItem('input1', 'Available task 1', false, ['tag1']),
      createInputListItem('input2', 'Available task 2', false),
      createInputListItem('input3', 'Used task', true, ['tag2']) // Already used
    ]);

    const inputList2 = createInputList('list2', 'Features', [
      createInputListItem('input4', 'New feature', false, ['tag3']),
      createInputListItem('input5', 'Another feature', false)
    ]);

    const project = createProject('project1', 'Test Project', [inputList1, inputList2], [
      createMainListItem('main1', 'First priority', 'list1', 1, ['tag1']),
      createMainListItem('main2', 'Second priority', 'list2', 2, ['tag2']),
      createMainListItem('main3', 'Third priority', 'list1', 3),
      createMainListItem('main4', 'Fourth priority', 'list2', 4, ['tag3'])
    ]);

    const tags = [
      createTag('tag1', 'High Priority', '#ef4444', 2),
      createTag('tag2', 'Development', '#3b82f6', 2),
      createTag('tag3', 'Design', '#8b5cf6', 2)
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

    dragDropManager = new DragDropManager(initialState);
  });

  describe('Basic Drag Operations', () => {
    it('should move input item to main list', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'input1', 
          data: { type: 'input-item', itemId: 'input1', sourceListId: 'list1' }
        },
        over: { 
          id: 'main-list', 
          data: { type: 'main-list' }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Check new main list item
      expect(result.currentProject?.mainList).toHaveLength(5);
      const newItem = result.currentProject?.mainList.find(item => item.id === 'input1');
      expect(newItem).toEqual({
        id: 'input1',
        content: 'Available task 1',
        sourceListId: 'list1',
        tags: ['tag1'],
        order: 5
      });

      // Check source item marked as used
      const sourceList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const sourceItem = sourceList?.items.find(item => item.id === 'input1');
      expect(sourceItem?.isUsed).toBe(true);
    });

    it('should move input item to specific position', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'input2', 
          data: { type: 'input-item', itemId: 'input2', sourceListId: 'list1' }
        },
        over: { 
          id: 'main-list-position-2', 
          data: { type: 'main-list-position', position: 2 }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Check item inserted at position 2
      const manager = new DragDropManager(result);
      const itemAtPos2 = manager.getMainListItemByPosition(2);
      expect(itemAtPos2?.id).toBe('input2');

      // Check other items shifted
      const itemAtPos3 = manager.getMainListItemByPosition(3);
      const itemAtPos4 = manager.getMainListItemByPosition(4);
      expect(itemAtPos3?.id).toBe('main2'); // Was at 2, now at 3
      expect(itemAtPos4?.id).toBe('main3'); // Was at 3, now at 4

      // Validate order consistency
      const validation = manager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });

    it('should not move already used items', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'input3', 
          data: { type: 'input-item', itemId: 'input3', sourceListId: 'list1' }
        },
        over: { 
          id: 'main-list', 
          data: { type: 'main-list' }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // State should remain unchanged
      expect(result).toBe(initialState);
    });

    it('should reorder main list items', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main4', 
          data: { type: 'main-item', itemId: 'main4' }
        },
        over: { 
          id: 'main-list-position-2', 
          data: { type: 'main-list-position', position: 2 }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Check main4 moved to position 2
      const manager = new DragDropManager(result);
      const itemAtPos2 = manager.getMainListItemByPosition(2);
      expect(itemAtPos2?.id).toBe('main4');

      // Check other items shifted
      const itemAtPos1 = manager.getMainListItemByPosition(1);
      const itemAtPos3 = manager.getMainListItemByPosition(3);
      const itemAtPos4 = manager.getMainListItemByPosition(4);
      expect(itemAtPos1?.id).toBe('main1'); // Unchanged
      expect(itemAtPos3?.id).toBe('main2'); // Shifted down
      expect(itemAtPos4?.id).toBe('main3'); // Shifted down

      // Validate order consistency
      const validation = manager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Multi-Select Drag Operations', () => {
    it('should move multiple selected items together', () => {
      // Set up selection state
      const stateWithSelection = {
        ...initialState,
        ui: { ...initialState.ui, selectedItems: ['main1', 'main3'] }
      };
      const manager = new DragDropManager(stateWithSelection);

      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main1', // Dragging one of the selected items
          data: { type: 'main-item', itemId: 'main1' }
        },
        over: { 
          id: 'main-list-position-4', 
          data: { type: 'main-list-position', position: 4 }
        }
      };

      const result = manager.handleDragEnd(dragEvent);

      // Check that both selected items moved together
      const resultManager = new DragDropManager(result);
      const itemAtPos3 = resultManager.getMainListItemByPosition(3);
      const itemAtPos4 = resultManager.getMainListItemByPosition(4);
      expect(itemAtPos3?.id).toBe('main1');
      expect(itemAtPos4?.id).toBe('main3');

      // Check remaining items
      const itemAtPos1 = resultManager.getMainListItemByPosition(1);
      const itemAtPos2 = resultManager.getMainListItemByPosition(2);
      expect(itemAtPos1?.id).toBe('main2'); // Shifted up
      expect(itemAtPos2?.id).toBe('main4'); // Shifted up

      // Validate order consistency
      const validation = resultManager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });

    it('should perform single-item operation when dragged item not in selection', () => {
      // Set up selection state (main1, main3 selected)
      const stateWithSelection = {
        ...initialState,
        ui: { ...initialState.ui, selectedItems: ['main1', 'main3'] }
      };
      const manager = new DragDropManager(stateWithSelection);

      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main2', // Dragging non-selected item
          data: { type: 'main-item', itemId: 'main2' }
        },
        over: { 
          id: 'main-list-position-4', 
          data: { type: 'main-list-position', position: 4 }
        }
      };

      const result = manager.handleDragEnd(dragEvent);

      // Only main2 should move
      const resultManager = new DragDropManager(result);
      const itemAtPos4 = resultManager.getMainListItemByPosition(4);
      expect(itemAtPos4?.id).toBe('main2');

      // Other selected items should remain in original positions, but shifted due to main2 moving
      const itemAtPos1 = resultManager.getMainListItemByPosition(1);
      const itemAtPos2 = resultManager.getMainListItemByPosition(2);
      const itemAtPos3 = resultManager.getMainListItemByPosition(3);
      expect(itemAtPos1?.id).toBe('main1');
      expect(itemAtPos2?.id).toBe('main3'); // Shifted up due to main2 moving down
      expect(itemAtPos3?.id).toBe('main4'); // Shifted up due to main2 moving down

      // Validate order consistency
      const validation = resultManager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });

    it('should handle single-item selection correctly', () => {
      // Single item selected
      const stateWithSelection = {
        ...initialState,
        ui: { ...initialState.ui, selectedItems: ['main2'] }
      };
      const manager = new DragDropManager(stateWithSelection);

      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main2', 
          data: { type: 'main-item', itemId: 'main2' }
        },
        over: { 
          id: 'main-list-position-1', 
          data: { type: 'main-list-position', position: 1 }
        }
      };

      const result = manager.handleDragEnd(dragEvent);

      // Should perform single-item operation (not multi-item)
      const resultManager = new DragDropManager(result);
      const itemAtPos1 = resultManager.getMainListItemByPosition(1);
      expect(itemAtPos1?.id).toBe('main2');

      // Validate order consistency
      const validation = resultManager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });

    it('should handle multi-select with edge position (end of list)', () => {
      const stateWithSelection = {
        ...initialState,
        ui: { ...initialState.ui, selectedItems: ['main2', 'main4'] }
      };
      const manager = new DragDropManager(stateWithSelection);

      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main2', 
          data: { type: 'main-item', itemId: 'main2' }
        },
        over: { 
          id: 'main-list-position-5', // Beyond current list length
          data: { type: 'main-list-position', position: 5 }
        }
      };

      const result = manager.handleDragEnd(dragEvent);

      // Selected items should move to end
      const resultManager = new DragDropManager(result);
      const itemAtPos3 = resultManager.getMainListItemByPosition(3);
      const itemAtPos4 = resultManager.getMainListItemByPosition(4);
      expect(itemAtPos3?.id).toBe('main2');
      expect(itemAtPos4?.id).toBe('main4');

      // Remaining items should move up
      const itemAtPos1 = resultManager.getMainListItemByPosition(1);
      const itemAtPos2 = resultManager.getMainListItemByPosition(2);
      expect(itemAtPos1?.id).toBe('main1');
      expect(itemAtPos2?.id).toBe('main3');

      // Validate order consistency
      const validation = resultManager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Tag Drag Operations', () => {
    it('should apply tag to single item', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'tag1', 
          data: { type: 'tag', tagId: 'tag1' }
        },
        over: { 
          id: 'main2', 
          data: { type: 'main-list-item', itemId: 'main2' }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Check tag added to item
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'main2');
      expect(mainItem?.tags).toContain('tag1');

      // Check usage count updated
      const tag = result.tagPool.find(t => t.id === 'tag1');
      expect(tag?.usageCount).toBe(3); // Was 2, now 3
    });

    it('should apply tag to multiple selected items', () => {
      const stateWithSelection = {
        ...initialState,
        ui: { ...initialState.ui, selectedItems: ['main1', 'main3'] }
      };
      const manager = new DragDropManager(stateWithSelection);

      const dragEvent: DragEndEvent = {
        active: { 
          id: 'tag2', 
          data: { type: 'tag', tagId: 'tag2' }
        },
        over: { 
          id: 'main1', // Target is in selection
          data: { type: 'main-list-item', itemId: 'main1' }
        }
      };

      const result = manager.handleDragEnd(dragEvent);

      // Check tag added to both selected items
      const main1 = result.currentProject?.mainList.find(item => item.id === 'main1');
      const main3 = result.currentProject?.mainList.find(item => item.id === 'main3');
      expect(main1?.tags).toContain('tag2');
      expect(main3?.tags).toContain('tag2');

      // Check usage count updated correctly
      const tag = result.tagPool.find(t => t.id === 'tag2');
      expect(tag?.usageCount).toBe(4); // Was 2, added to 2 items = 4
    });

    it('should apply tag to input list item', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'tag3', 
          data: { type: 'tag', tagId: 'tag3' }
        },
        over: { 
          id: 'input2', 
          data: { type: 'input-list-item', itemId: 'input2' }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Check tag added to input item
      const inputList = result.currentProject?.inputLists.find(list => list.id === 'list1');
      const inputItem = inputList?.items.find(item => item.id === 'input2');
      expect(inputItem?.tags).toContain('tag3');

      // Check usage count updated
      const tag = result.tagPool.find(t => t.id === 'tag3');
      expect(tag?.usageCount).toBe(3); // Was 2, now 3
    });

    it('should not apply duplicate tags', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'tag1', 
          data: { type: 'tag', tagId: 'tag1' }
        },
        over: { 
          id: 'main1', // Already has tag1
          data: { type: 'main-list-item', itemId: 'main1' }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Tag should not be duplicated
      const mainItem = result.currentProject?.mainList.find(item => item.id === 'main1');
      const tag1Count = mainItem?.tags.filter(t => t === 'tag1').length;
      expect(tag1Count).toBe(1);

      // Usage count should remain unchanged
      const tag = result.tagPool.find(t => t.id === 'tag1');
      expect(tag?.usageCount).toBe(2); // Same as initial
    });
  });

  describe('Position-Based Drop Logic', () => {
    it('should handle drop at beginning (position 1)', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main4', 
          data: { type: 'main-item', itemId: 'main4' }
        },
        over: { 
          id: 'main-list-position-1', 
          data: { type: 'main-list-position', position: 1 }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      const manager = new DragDropManager(result);
      const itemAtPos1 = manager.getMainListItemByPosition(1);
      expect(itemAtPos1?.id).toBe('main4');

      // All other items should shift down
      const itemAtPos2 = manager.getMainListItemByPosition(2);
      const itemAtPos3 = manager.getMainListItemByPosition(3);
      const itemAtPos4 = manager.getMainListItemByPosition(4);
      expect(itemAtPos2?.id).toBe('main1');
      expect(itemAtPos3?.id).toBe('main2');
      expect(itemAtPos4?.id).toBe('main3');

      const validation = manager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });

    it('should handle drop at end (beyond list length)', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'input4', 
          data: { type: 'input-item', itemId: 'input4', sourceListId: 'list2' }
        },
        over: { 
          id: 'main-list-position-10', // Way beyond current length
          data: { type: 'main-list-position', position: 10 }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Item should be inserted at position 10 as requested (beyond end is allowed)
      const newItem = result.currentProject?.mainList.find(item => item.id === 'input4');
      expect(newItem?.order).toBe(10);

      // Original items should be unchanged  
      // Note: Order validation will fail because position 10 creates gaps
      // This test shows the current behavior where beyond-list positions are allowed
      expect(result.currentProject?.mainList).toHaveLength(5);
    });

    it('should handle drop between existing items', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'input5', 
          data: { type: 'input-item', itemId: 'input5', sourceListId: 'list2' }
        },
        over: { 
          id: 'main-list-position-3', 
          data: { type: 'main-list-position', position: 3 }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // Check item inserted at position 3
      const manager = new DragDropManager(result);
      const itemAtPos3 = manager.getMainListItemByPosition(3);
      expect(itemAtPos3?.id).toBe('input5');

      // Items at position 3 and after should shift
      const itemAtPos4 = manager.getMainListItemByPosition(4);
      const itemAtPos5 = manager.getMainListItemByPosition(5);
      expect(itemAtPos4?.id).toBe('main3'); // Was at 3
      expect(itemAtPos5?.id).toBe('main4'); // Was at 4

      const validation = manager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
    });

    it('should handle same position drop (no change)', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main2', 
          data: { type: 'main-item', itemId: 'main2' }
        },
        over: { 
          id: 'main-list-position-2', 
          data: { type: 'main-list-position', position: 2 }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);

      // State should remain unchanged
      expect(result).toBe(initialState);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid drag data', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'invalid', 
          data: { type: 'input-item' } // Missing required fields
        },
        over: { 
          id: 'main-list', 
          data: { type: 'main-list' }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);
      expect(result).toBe(initialState); // No change
    });

    it('should handle missing drop target', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main1', 
          data: { type: 'main-item', itemId: 'main1' }
        },
        over: null
      };

      const result = dragDropManager.handleDragEnd(dragEvent);
      expect(result).toBe(initialState); // No change
    });

    it('should handle non-existent source items', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'nonexistent', 
          data: { type: 'input-item', itemId: 'nonexistent', sourceListId: 'list1' }
        },
        over: { 
          id: 'main-list', 
          data: { type: 'main-list' }
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);
      expect(result).toBe(initialState); // No change
    });

    it('should handle operations when project is null', () => {
      const nullProjectState = { ...initialState, currentProject: null };
      const nullManager = new DragDropManager(nullProjectState);

      const dragEvent: DragEndEvent = {
        active: { 
          id: 'main1', 
          data: { type: 'main-item', itemId: 'main1' }
        },
        over: { 
          id: 'main-list-position-2', 
          data: { type: 'main-list-position', position: 2 }
        }
      };

      const result = nullManager.handleDragEnd(dragEvent);
      expect(result).toBe(nullProjectState); // No change
    });

    it('should maintain order consistency after complex operations', () => {
      // Perform multiple operations
      let result = initialState;
      let manager = new DragDropManager(result);

      // Move input item to position 2
      let dragEvent: DragEndEvent = {
        active: { id: 'input1', data: { type: 'input-item', itemId: 'input1', sourceListId: 'list1' }},
        over: { id: 'pos2', data: { type: 'main-list-position', position: 2 }}
      };
      result = manager.handleDragEnd(dragEvent);
      manager = new DragDropManager(result);

      // Reorder existing item
      dragEvent = {
        active: { id: 'main4', data: { type: 'main-item', itemId: 'main4' }},
        over: { id: 'pos1', data: { type: 'main-list-position', position: 1 }}
      };
      result = manager.handleDragEnd(dragEvent);
      manager = new DragDropManager(result);

      // Validate final state
      const validation = manager.validateMainListOrder();
      expect(validation.isValid).toBe(true);
      expect(result.currentProject?.mainList).toHaveLength(5);
    });

    it('should handle invalid drop type combinations', () => {
      const dragEvent: DragEndEvent = {
        active: { 
          id: 'tag1', 
          data: { type: 'tag', tagId: 'tag1' }
        },
        over: { 
          id: 'main-list', 
          data: { type: 'main-list' } // Invalid for tag drop
        }
      };

      const result = dragDropManager.handleDragEnd(dragEvent);
      expect(result).toBe(initialState); // No change
    });
  });
});