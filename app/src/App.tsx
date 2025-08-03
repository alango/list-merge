import { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { ProjectManager } from './components/ProjectManager';
import { Workspace } from './components/Workspace';
import type { AppState, Project, InputList, MainListItem, Tag, InputListItem } from './types/index';
import { validateTag, validateTagForEdit } from './utils/tagValidation';
import './App.css';

// Drag and drop data interfaces
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

// Mock data for initial development
const createMockProject = (): Project => ({
  id: '1',
  name: 'Sample Project',
  createdAt: new Date(),
  modifiedAt: new Date(),
  inputLists: [
    {
      id: 'list1',
      name: 'To-Do Items',
      items: [
        { id: 'item1', content: 'Write project proposal', isUsed: false, tags: [] },
        { id: 'item2', content: 'Review budget documents', isUsed: false, tags: [] },
        { id: 'item3', content: 'Schedule team meeting', isUsed: true, tags: ['tag1'] },
        { id: 'item4', content: 'Update website content', isUsed: false, tags: [] },
      ]
    },
    {
      id: 'list2', 
      name: 'Feature Ideas',
      items: [
        { id: 'item5', content: 'Dark mode toggle', isUsed: false, tags: [] },
        { id: 'item6', content: 'User authentication', isUsed: true, tags: ['tag2'] },
        { id: 'item7', content: 'Export to PDF', isUsed: false, tags: [] },
        { id: 'item8', content: 'Mobile app version', isUsed: false, tags: [] },
      ]
    }
  ],
  mainList: [
    {
      id: 'item3',
      content: 'Schedule team meeting',
      sourceListId: 'list1',
      tags: ['tag1'],
      order: 1
    },
    {
      id: 'item6', 
      content: 'User authentication',
      sourceListId: 'list2',
      tags: ['tag2'],
      order: 2
    }
  ]
});

const createMockTags = (): Tag[] => [
  {
    id: 'tag1',
    name: 'High Priority',
    color: '#ef4444',
    createdAt: new Date(),
    usageCount: 1
  },
  {
    id: 'tag2',
    name: 'Development',
    color: '#3b82f6', 
    createdAt: new Date(),
    usageCount: 1
  },
  {
    id: 'tag3',
    name: 'Design',
    color: '#8b5cf6',
    createdAt: new Date(),
    usageCount: 0
  }
];

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentProject: createMockProject(),
    savedProjects: [],
    tagPool: createMockTags(),
    ui: {
      selectedItems: [],
      activeInputList: 'list1',
      anchorItem: null
    }
  });

  // Drag overlay state
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);

  // Project management handlers
  const handleNewProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: 'New Project',
      createdAt: new Date(),
      modifiedAt: new Date(),
      inputLists: [],
      mainList: []
    };
    
    setAppState(prev => ({
      ...prev,
      currentProject: newProject,
      ui: { ...prev.ui, selectedItems: [], activeInputList: null }
    }));
  };

  const handleSaveProject = () => {
    // TODO: Implement project saving to localStorage
    console.log('Saving project:', appState.currentProject);
  };

  const handleLoadProject = (projectId: string) => {
    // TODO: Implement project loading from localStorage
    console.log('Loading project:', projectId);
  };

  const handleImportProject = (projectData: Project) => {
    // Validate the imported project data structure
    if (!projectData || typeof projectData !== 'object') {
      console.error('Invalid project data');
      return;
    }

    // Ensure required fields exist with defaults
    const importedProject: Project = {
      ...projectData,
      id: projectData.id || Date.now().toString(),
      name: projectData.name || 'Imported Project',
      createdAt: projectData.createdAt ? new Date(projectData.createdAt) : new Date(),
      modifiedAt: new Date(), // Always update modified time on import
      inputLists: projectData.inputLists || [],
      mainList: projectData.mainList || []
    };

    // Set the imported project as current and clear UI state
    setAppState(prev => ({
      ...prev,
      currentProject: importedProject,
      ui: { 
        ...prev.ui, 
        selectedItems: [], 
        activeInputList: importedProject.inputLists.length > 0 ? importedProject.inputLists[0].id : null 
      }
    }));
    
    console.log('Project imported successfully:', importedProject);
  };

  // Input list management
  const handleSelectInputList = (listId: string) => {
    setAppState(prev => ({
      ...prev,
      ui: { ...prev.ui, activeInputList: listId }
    }));
  };

  const handleAddInputList = () => {
    if (!appState.currentProject) return;
    
    const newList: InputList = {
      id: Date.now().toString(),
      name: `List ${appState.currentProject.inputLists.length + 1}`,
      items: []
    };

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: [...prev.currentProject.inputLists, newList],
        modifiedAt: new Date()
      } : null,
      ui: { ...prev.ui, activeInputList: newList.id }
    }));
  };

  const handleImportListItems = (listId: string, items: string[]) => {
    if (!appState.currentProject) return;

    // Convert string items to InputListItem objects
    const newItems = items.map(content => ({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      content: content.trim(),
      isUsed: false,
      tags: []
    }));

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === listId ? {
            ...list,
            items: [...list.items, ...newItems]
          } : list
        ),
        modifiedAt: new Date()
      } : null
    }));
  };

  // Input list item management
  const handleAddItemToList = (listId: string, content: string) => {
    if (!appState.currentProject) return;

    const newItem: InputListItem = {
      id: Date.now().toString(),
      content,
      isUsed: false,
      tags: []
    };

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === listId ? {
            ...list,
            items: [...list.items, newItem]
          } : list
        ),
        modifiedAt: new Date()
      } : null
    }));
  };

  const handleEditListItem = (listId: string, itemId: string, content: string) => {
    if (!appState.currentProject) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === listId ? {
            ...list,
            items: list.items.map(item =>
              item.id === itemId ? { ...item, content } : item
            )
          } : list
        ),
        // Also update the corresponding item in main list if it exists
        mainList: prev.currentProject.mainList.map(item =>
          item.id === itemId ? { ...item, content } : item
        ),
        modifiedAt: new Date()
      } : null
    }));
  };

  const handleDeleteListItem = (listId: string, itemId: string) => {
    if (!appState.currentProject) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === listId ? {
            ...list,
            items: list.items.filter(item => item.id !== itemId)
          } : list
        ),
        // Also remove the corresponding item from main list if it exists
        mainList: prev.currentProject.mainList.filter(item => item.id !== itemId),
        modifiedAt: new Date()
      } : null
    }));
  };

  const handleRenameList = (listId: string, newName: string) => {
    if (!appState.currentProject) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === listId ? { ...list, name: newName } : list
        ),
        modifiedAt: new Date()
      } : null
    }));
  };

  const handleDeleteList = (listId: string) => {
    if (!appState.currentProject) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.filter(list => list.id !== listId),
        modifiedAt: new Date()
      } : null,
      ui: {
        ...prev.ui,
        activeInputList: prev.ui.activeInputList === listId ? null : prev.ui.activeInputList
      }
    }));
  };


  const handleMoveToMainList = (listId: string, itemId: string) => {
    if (!appState.currentProject) return;

    const sourceList = appState.currentProject.inputLists.find(list => list.id === listId);
    const sourceItem = sourceList?.items.find(item => item.id === itemId);
    
    if (!sourceItem || sourceItem.isUsed) return;

    const newMainItem: MainListItem = {
      id: sourceItem.id, // Preserve original item ID for tag synchronization
      content: sourceItem.content,
      sourceListId: listId,
      tags: [...sourceItem.tags], // Copy tags from input item
      order: appState.currentProject.mainList.length + 1
    };

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === listId ? {
            ...list,
            items: list.items.map(item =>
              item.id === itemId ? { ...item, isUsed: true } : item
            )
          } : list
        ),
        mainList: [...prev.currentProject.mainList, newMainItem],
        modifiedAt: new Date()
      } : null
    }));
  };

  // Helper function to find item in both input lists and main lists with context
  const findItemWithContext = (itemId: string, currentProject: Project) => {
    if (!currentProject) return null;
    
    // Check main list first
    const mainItemIndex = currentProject.mainList.findIndex((item: MainListItem) => item.id === itemId);
    if (mainItemIndex !== -1) {
      return {
        type: 'main-list' as const,
        list: currentProject.mainList,
        index: mainItemIndex,
        item: currentProject.mainList[mainItemIndex]
      };
    }
    
    // Check input lists
    for (const inputList of currentProject.inputLists) {
      const itemIndex = inputList.items.findIndex((item: InputListItem) => item.id === itemId);
      if (itemIndex !== -1) {
        return {
          type: 'input-list' as const,
          list: inputList.items,
          index: itemIndex,
          item: inputList.items[itemIndex],
          listId: inputList.id
        };
      }
    }
    
    return null;
  };

  // Main list management (now supports both main list and input list items)
  const handleSelectMainItem = (itemId: string, isMultiSelect: boolean, isShiftSelect: boolean = false) => {
    setAppState(prev => {
      if (!prev.currentProject) return prev;
      
      let newSelectedItems: string[];
      let newAnchorItem: string | null = prev.ui.anchorItem;
      
      if (isShiftSelect && prev.ui.anchorItem) {
        // Range selection: find both anchor and clicked items
        const anchorContext = findItemWithContext(prev.ui.anchorItem, prev.currentProject);
        const clickedContext = findItemWithContext(itemId, prev.currentProject);
        
        // Only allow range selection within the same list type and list
        if (anchorContext && clickedContext && 
            anchorContext.type === clickedContext.type &&
            (anchorContext.type === 'main-list' || 
             (anchorContext.type === 'input-list' && anchorContext.listId === clickedContext.listId))) {
          
          const startIndex = Math.min(anchorContext.index, clickedContext.index);
          const endIndex = Math.max(anchorContext.index, clickedContext.index);
          const rangeItems = anchorContext.list.slice(startIndex, endIndex + 1).map(item => item.id);
          
          // Combine existing selection with range selection
          const existingSelection = new Set(prev.ui.selectedItems);
          rangeItems.forEach(id => existingSelection.add(id));
          newSelectedItems = Array.from(existingSelection);
        } else {
          // Fallback to regular selection if contexts don't match or not found
          newSelectedItems = [itemId];
          newAnchorItem = itemId;
        }
      } else if (isMultiSelect) {
        // Toggle selection in multi-select mode
        if (prev.ui.selectedItems.includes(itemId)) {
          newSelectedItems = prev.ui.selectedItems.filter(id => id !== itemId);
          // Keep anchor if removing non-anchor item, otherwise clear anchor
          if (prev.ui.anchorItem === itemId) {
            newAnchorItem = null;
          }
        } else {
          newSelectedItems = [...prev.ui.selectedItems, itemId];
          // Set as anchor if no anchor exists
          if (!prev.ui.anchorItem) {
            newAnchorItem = itemId;
          }
        }
      } else {
        // Single selection
        newSelectedItems = [itemId];
        newAnchorItem = itemId;
      }

      return {
        ...prev,
        ui: { 
          ...prev.ui, 
          selectedItems: newSelectedItems,
          anchorItem: newAnchorItem
        }
      };
    });
  };

  const handleRemoveFromMainList = (itemId: string) => {
    if (!appState.currentProject) return;

    const itemToRemove = appState.currentProject.mainList.find(item => item.id === itemId);
    if (!itemToRemove) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: prev.currentProject.mainList.filter(item => item.id !== itemId),
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === itemToRemove.sourceListId ? {
            ...list,
            items: list.items.map(item =>
              item.content === itemToRemove.content ? { ...item, isUsed: false } : item
            )
          } : list
        ),
        modifiedAt: new Date()
      } : null,
      ui: {
        ...prev.ui,
        selectedItems: prev.ui.selectedItems.filter(id => id !== itemId)
      }
    }));
  };

  const handleReorderMainItems = (fromOrder: number, toOrder: number) => {
    if (!appState.currentProject || fromOrder === toOrder) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: prev.currentProject.mainList.map(item => {
          if (item.order === fromOrder) {
            return { ...item, order: toOrder };
          } else if (fromOrder < toOrder && item.order > fromOrder && item.order <= toOrder) {
            return { ...item, order: item.order - 1 };
          } else if (fromOrder > toOrder && item.order >= toOrder && item.order < fromOrder) {
            return { ...item, order: item.order + 1 };
          }
          return item;
        }),
        modifiedAt: new Date()
      } : null
    }));
  };

  // Tag validation wrapper
  const validateTagName = (name: string) => {
    return validateTag(
      name, 
      appState.tagPool, 
      appState.currentProject?.inputLists || []
    );
  };

  // Tag management
  const handleCreateTag = (name: string, color: string): string | null => {
    const validation = validateTagName(name);
    if (!validation.isValid) {
      console.error('Tag validation failed:', validation.error);
      // TODO: Show user-friendly error message
      return null;
    }

    const newTag: Tag = {
      id: Date.now().toString(),
      name: name.trim(),
      color,
      createdAt: new Date(),
      usageCount: 0
    };

    setAppState(prev => ({
      ...prev,
      tagPool: [...prev.tagPool, newTag]
    }));
    
    return newTag.id;
  };

  const handleEditTag = (tagId: string, name: string, color: string) => {
    // For editing, we need to exclude the current tag from duplicate check
    const validation = validateTagForEditName(name, tagId);
    if (!validation.isValid) {
      console.error('Tag validation failed:', validation.error);
      return;
    }

    setAppState(prev => ({
      ...prev,
      tagPool: prev.tagPool.map(tag =>
        tag.id === tagId ? { ...tag, name: name.trim(), color } : tag
      )
    }));
  };

  // Tag validation wrapper for editing
  const validateTagForEditName = (name: string, tagId: string) => {
    return validateTagForEdit(
      name, 
      tagId,
      appState.tagPool, 
      appState.currentProject?.inputLists || []
    );
  };

  const handleDeleteTag = (tagId: string) => {
    setAppState(prev => ({
      ...prev,
      tagPool: prev.tagPool.filter(tag => tag.id !== tagId),
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        // Remove tag from main list items
        mainList: prev.currentProject.mainList.map(item => ({
          ...item,
          tags: item.tags.filter(id => id !== tagId)
        })),
        // Remove tag from input list items
        inputLists: prev.currentProject.inputLists.map(list => ({
          ...list,
          items: list.items.map(item => ({
            ...item,
            tags: item.tags.filter(id => id !== tagId)
          }))
        }))
      } : null
    }));
  };

  const handleAddTag = (itemIds: string[], tagId: string) => {
    // Helper function to find item in both input lists and main list
    const findItem = (itemId: string) => {
      if (!appState.currentProject) return null;
      
      // Check main list first
      const mainItem = appState.currentProject.mainList.find(i => i.id === itemId);
      if (mainItem) return mainItem;
      
      // Check input lists
      for (const list of appState.currentProject.inputLists) {
        const inputItem = list.items.find(i => i.id === itemId);
        if (inputItem) return inputItem;
      }
      return null;
    };

    // Count how many items don't already have this tag
    const newUsageCount = itemIds.filter(itemId => {
      const item = findItem(itemId);
      return item && !item.tags.includes(tagId);
    }).length;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        // Update main list items
        mainList: prev.currentProject.mainList.map(item =>
          itemIds.includes(item.id) ? {
            ...item,
            tags: [...new Set([...item.tags, tagId])]
          } : item
        ),
        // Update input list items
        inputLists: prev.currentProject.inputLists.map(list => ({
          ...list,
          items: list.items.map(item =>
            itemIds.includes(item.id) ? {
              ...item,
              tags: [...new Set([...item.tags, tagId])]
            } : item
          )
        }))
      } : null,
      tagPool: prev.tagPool.map(tag =>
        tag.id === tagId ? { ...tag, usageCount: tag.usageCount + newUsageCount } : tag
      )
    }));
  };

  const handleRemoveTag = (itemIds: string[], tagId: string) => {
    // Helper function to find item in both input lists and main list
    const findItem = (itemId: string) => {
      if (!appState.currentProject) return null;
      
      // Check main list first
      const mainItem = appState.currentProject.mainList.find(i => i.id === itemId);
      if (mainItem) return mainItem;
      
      // Check input lists
      for (const list of appState.currentProject.inputLists) {
        const inputItem = list.items.find(i => i.id === itemId);
        if (inputItem) return inputItem;
      }
      return null;
    };

    // Count how many items actually have this tag
    const actualRemovalCount = itemIds.filter(itemId => {
      const item = findItem(itemId);
      return item && item.tags.includes(tagId);
    }).length;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        // Update main list items
        mainList: prev.currentProject.mainList.map(item =>
          itemIds.includes(item.id) ? {
            ...item,
            tags: item.tags.filter(id => id !== tagId)
          } : item
        ),
        // Update input list items
        inputLists: prev.currentProject.inputLists.map(list => ({
          ...list,
          items: list.items.map(item =>
            itemIds.includes(item.id) ? {
              ...item,
              tags: item.tags.filter(id => id !== tagId)
            } : item
          )
        }))
      } : null,
      tagPool: prev.tagPool.map(tag =>
        tag.id === tagId ? { ...tag, usageCount: Math.max(0, tag.usageCount - actualRemovalCount) } : tag
      )
    }));
  };

  const handleApplyTagToSelected = (tagId: string) => {
    if (appState.ui.selectedItems.length > 0) {
      handleAddTag(appState.ui.selectedItems, tagId);
    }
  };

  // Bulk tag operations
  const handleRemoveAllTags = () => {
    if (appState.ui.selectedItems.length === 0) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: prev.currentProject.mainList.map(item =>
          prev.ui.selectedItems.includes(item.id) ? {
            ...item,
            tags: []
          } : item
        ),
        modifiedAt: new Date()
      } : null
    }));
  };

  const handleClearSelection = () => {
    setAppState(prev => ({
      ...prev,
      ui: { ...prev.ui, selectedItems: [] }
    }));
  };


  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current as DragData;
    
    setActiveDragData(dragData);
    console.log('Drag started:', dragData);
    
    // If dragging a selected item and there are multiple selected items,
    // prepare for multi-select drag
    if (dragData.type === 'main-item' && dragData.itemId && appState.ui.selectedItems.includes(dragData.itemId)) {
      // Multi-select drag will be handled in drag end
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle visual feedback during drag over
    console.log('Drag over:', event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragData(null);
    
    if (!over) {
      console.log('Drag cancelled - no drop target');
      return;
    }

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropData;

    console.log('Drag ended:', { dragData, dropData });

    // Handle different drag operations
    if (dragData.type === 'input-item' && dropData.type === 'main-list') {
      // Moving from input list to main list
      handleMoveToMainList(dragData.sourceListId!, dragData.itemId!);
    } else if (dragData.type === 'input-item' && dropData.type === 'main-list-position') {
      // Moving from input list to specific position in main list
      handleMoveToMainListAtPosition(dragData.sourceListId!, dragData.itemId!, dropData.position!);
    } else if (dragData.type === 'main-item' && dropData.type === 'main-list-position') {
      // Reordering within main list
      if (appState.ui.selectedItems.includes(dragData.itemId!) && appState.ui.selectedItems.length > 1) {
        // Multi-select reorder
        handleReorderMultipleItems(appState.ui.selectedItems, dropData.position!);
      } else {
        // Single item reorder
        handleReorderMainItemToPosition(dragData.itemId!, dropData.position!);
      }
    } else if (dragData.type === 'tag' && dropData.type === 'main-list-item') {
      // Dropping tag on main list item
      const targetItemIds = appState.ui.selectedItems.includes(dropData.itemId!) && appState.ui.selectedItems.length > 1
        ? appState.ui.selectedItems // Apply to all selected items
        : [dropData.itemId!]; // Apply to just the dropped-on item
      
      handleAddTag(targetItemIds, dragData.tagId!);
    } else if (dragData.type === 'tag' && dropData.type === 'input-list-item') {
      // Dropping tag on input list item
      const targetItemIds = appState.ui.selectedItems.includes(dropData.itemId!) && appState.ui.selectedItems.length > 1
        ? appState.ui.selectedItems // Apply to all selected items
        : [dropData.itemId!]; // Apply to just the dropped-on item
      
      handleAddTag(targetItemIds, dragData.tagId!);
    }
  };

  // Helper function to move item to specific position in main list
  const handleMoveToMainListAtPosition = (sourceListId: string, itemId: string, position: number) => {
    if (!appState.currentProject) return;

    const sourceList = appState.currentProject.inputLists.find(list => list.id === sourceListId);
    const sourceItem = sourceList?.items.find(item => item.id === itemId);
    
    if (!sourceItem || sourceItem.isUsed) return;

    const newMainItem: MainListItem = {
      id: sourceItem.id, // Preserve original item ID for tag synchronization
      content: sourceItem.content,
      sourceListId: sourceListId,
      tags: [...sourceItem.tags], // Copy tags from input item
      order: position
    };

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        inputLists: prev.currentProject.inputLists.map(list =>
          list.id === sourceListId ? {
            ...list,
            items: list.items.map(item =>
              item.id === itemId ? { ...item, isUsed: true } : item
            )
          } : list
        ),
        mainList: [
          ...prev.currentProject.mainList.filter(item => item.order < position),
          newMainItem,
          ...prev.currentProject.mainList.filter(item => item.order >= position).map(item => ({
            ...item,
            order: item.order + 1
          }))
        ],
        modifiedAt: new Date()
      } : null
    }));
  };

  // Helper function to reorder single item to specific position
  const handleReorderMainItemToPosition = (itemId: string, newPosition: number) => {
    if (!appState.currentProject) return;

    const item = appState.currentProject.mainList.find(item => item.id === itemId);
    if (!item) return;

    const oldPosition = item.order;
    if (oldPosition === newPosition) return;

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: prev.currentProject.mainList.map(listItem => {
          if (listItem.id === itemId) {
            return { ...listItem, order: newPosition };
          }
          
          // Adjust other items' positions
          if (oldPosition < newPosition) {
            // Moving down - shift items up
            if (listItem.order > oldPosition && listItem.order <= newPosition) {
              return { ...listItem, order: listItem.order - 1 };
            }
          } else {
            // Moving up - shift items down
            if (listItem.order >= newPosition && listItem.order < oldPosition) {
              return { ...listItem, order: listItem.order + 1 };
            }
          }
          
          return listItem;
        }),
        modifiedAt: new Date()
      } : null
    }));
  };

  // Helper function to reorder multiple selected items
  const handleReorderMultipleItems = (selectedItemIds: string[], newPosition: number) => {
    if (!appState.currentProject) return;

    const selectedItems = appState.currentProject.mainList.filter(item => 
      selectedItemIds.includes(item.id)
    ).sort((a, b) => a.order - b.order);

    if (selectedItems.length === 0) return;

    // Remove selected items and adjust remaining items' positions
    const remainingItems = appState.currentProject.mainList.filter(item => 
      !selectedItemIds.includes(item.id)
    );

    // Insert selected items at new position
    const newMainList: MainListItem[] = [];
    let currentOrder = 1;

    for (const item of remainingItems) {
      if (currentOrder === newPosition) {
        // Insert selected items here
        for (const selectedItem of selectedItems) {
          newMainList.push({ ...selectedItem, order: currentOrder++ });
        }
      }
      newMainList.push({ ...item, order: currentOrder++ });
    }

    // If position is at the end, add selected items at the end
    if (newPosition > remainingItems.length) {
      for (const selectedItem of selectedItems) {
        newMainList.push({ ...selectedItem, order: currentOrder++ });
      }
    }

    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: newMainList,
        modifiedAt: new Date()
      } : null
    }));
  };

  // Drag overlay component
  const DragOverlayComponent = () => {
    if (!activeDragData) return null;

    if (activeDragData.type === 'tag') {
      return (
        <div className="bg-white border border-gray-300 rounded-md shadow-lg p-3 cursor-grabbing">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: activeDragData.tagColor }}
            />
            <span className="text-sm font-medium text-gray-900">
              {activeDragData.tagName}
            </span>
          </div>
        </div>
      );
    }

    const isMultiSelect = activeDragData.type === 'main-item' && 
      appState.ui.selectedItems.includes(activeDragData.itemId!) && 
      appState.ui.selectedItems.length > 1;

    return (
      <div className="bg-white border border-gray-300 rounded-md shadow-lg p-3 cursor-grabbing">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {activeDragData.content}
          </span>
          {isMultiSelect && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              +{appState.ui.selectedItems.length - 1} more
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectManager
        currentProject={appState.currentProject}
        tagPool={appState.tagPool}
        onNewProject={handleNewProject}
        onLoadProject={handleLoadProject}
        onSaveProject={handleSaveProject}
        onImportProject={handleImportProject}
      />
      
      <DndContext
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Workspace
          appState={appState}
          onSelectInputList={handleSelectInputList}
          onAddInputList={handleAddInputList}
          onImportListItems={handleImportListItems}
          onAddItemToList={handleAddItemToList}
          onEditListItem={handleEditListItem}
          onDeleteListItem={handleDeleteListItem}
          onRenameList={handleRenameList}
          onDeleteList={handleDeleteList}
          onMoveToMainList={handleMoveToMainList}
          onSelectMainItem={handleSelectMainItem}
          onRemoveFromMainList={handleRemoveFromMainList}
          onReorderMainItems={handleReorderMainItems}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onCreateTag={handleCreateTag}
          onEditTag={handleEditTag}
          onDeleteTag={handleDeleteTag}
          onApplyTagToSelected={handleApplyTagToSelected}
          onRemoveAllTags={handleRemoveAllTags}
          onClearSelection={handleClearSelection}
        />
        <DragOverlay>
          <DragOverlayComponent />
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default App;