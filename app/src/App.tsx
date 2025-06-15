import React, { useState } from 'react';
import { ProjectManager } from './components/ProjectManager';
import { Workspace } from './components/Workspace';
import type { AppState, Project, InputList, MainListItem, Tag } from './types/index';
import './App.css';

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
        { id: 'item1', content: 'Write project proposal', isUsed: false },
        { id: 'item2', content: 'Review budget documents', isUsed: false },
        { id: 'item3', content: 'Schedule team meeting', isUsed: true },
        { id: 'item4', content: 'Update website content', isUsed: false },
      ]
    },
    {
      id: 'list2', 
      name: 'Feature Ideas',
      items: [
        { id: 'item5', content: 'Dark mode toggle', isUsed: false },
        { id: 'item6', content: 'User authentication', isUsed: true },
        { id: 'item7', content: 'Export to PDF', isUsed: false },
        { id: 'item8', content: 'Mobile app version', isUsed: false },
      ]
    }
  ],
  mainList: [
    {
      id: 'main1',
      content: 'Schedule team meeting',
      sourceListId: 'list1',
      tags: ['tag1'],
      order: 1
    },
    {
      id: 'main2', 
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
      activeInputList: 'list1'
    }
  });

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

  const handleImportToList = (listId: string) => {
    // TODO: Implement file import functionality
    console.log('Importing to list:', listId);
  };

  // Input list item management
  const handleAddItemToList = (listId: string, content: string) => {
    if (!appState.currentProject) return;

    const newItem: InputListItem = {
      id: Date.now().toString(),
      content,
      isUsed: false
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
      id: Date.now().toString(),
      content: sourceItem.content,
      sourceListId: listId,
      tags: [listId], // Add source list as a tag
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

  // Main list management
  const handleSelectMainItem = (itemId: string, isMultiSelect: boolean) => {
    setAppState(prev => {
      let newSelectedItems: string[];
      
      if (isMultiSelect) {
        // Toggle selection in multi-select mode
        if (prev.ui.selectedItems.includes(itemId)) {
          newSelectedItems = prev.ui.selectedItems.filter(id => id !== itemId);
        } else {
          newSelectedItems = [...prev.ui.selectedItems, itemId];
        }
      } else {
        // Single selection
        newSelectedItems = [itemId];
      }

      return {
        ...prev,
        ui: { ...prev.ui, selectedItems: newSelectedItems }
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

  // Tag management
  const handleCreateTag = (name: string, color: string) => {
    const newTag: Tag = {
      id: Date.now().toString(),
      name,
      color,
      createdAt: new Date(),
      usageCount: 0
    };

    setAppState(prev => ({
      ...prev,
      tagPool: [...prev.tagPool, newTag]
    }));
  };

  const handleEditTag = (tagId: string, name: string, color: string) => {
    setAppState(prev => ({
      ...prev,
      tagPool: prev.tagPool.map(tag =>
        tag.id === tagId ? { ...tag, name, color } : tag
      )
    }));
  };

  const handleDeleteTag = (tagId: string) => {
    setAppState(prev => ({
      ...prev,
      tagPool: prev.tagPool.filter(tag => tag.id !== tagId),
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: prev.currentProject.mainList.map(item => ({
          ...item,
          tags: item.tags.filter(id => id !== tagId)
        }))
      } : null
    }));
  };

  const handleAddTag = (itemIds: string[], tagId: string) => {
    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: prev.currentProject.mainList.map(item =>
          itemIds.includes(item.id) ? {
            ...item,
            tags: [...new Set([...item.tags, tagId])]
          } : item
        )
      } : null,
      tagPool: prev.tagPool.map(tag =>
        tag.id === tagId ? { ...tag, usageCount: tag.usageCount + itemIds.length } : tag
      )
    }));
  };

  const handleRemoveTag = (itemIds: string[], tagId: string) => {
    setAppState(prev => ({
      ...prev,
      currentProject: prev.currentProject ? {
        ...prev.currentProject,
        mainList: prev.currentProject.mainList.map(item =>
          itemIds.includes(item.id) ? {
            ...item,
            tags: item.tags.filter(id => id !== tagId)
          } : item
        )
      } : null,
      tagPool: prev.tagPool.map(tag =>
        tag.id === tagId ? { ...tag, usageCount: Math.max(0, tag.usageCount - itemIds.length) } : tag
      )
    }));
  };

  const handleApplyTagToSelected = (tagId: string) => {
    if (appState.ui.selectedItems.length > 0) {
      handleAddTag(appState.ui.selectedItems, tagId);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectManager
        onNewProject={handleNewProject}
        onLoadProject={handleLoadProject}
        onSaveProject={handleSaveProject}
      />
      
      <Workspace
        appState={appState}
        onSelectInputList={handleSelectInputList}
        onAddInputList={handleAddInputList}
        onImportToList={handleImportToList}
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
      />
    </div>
  );
}

export default App;