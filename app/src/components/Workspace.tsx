import React from 'react';
import { InputListPanel } from './InputListPanel';
import { MainListPanel } from './MainListPanel';
import { TagPoolPanel } from './TagPoolPanel';
import type { AppState } from '../types/index';

interface WorkspaceProps {
  appState: AppState;
  onSelectInputList: (listId: string) => void;
  onAddInputList: () => void;
  onImportToList: (listId: string) => void;
  onAddItemToList: (listId: string, content: string) => void;
  onEditListItem: (listId: string, itemId: string, content: string) => void;
  onDeleteListItem: (listId: string, itemId: string) => void;
  onRenameList: (listId: string, newName: string) => void;
  onDeleteList: (listId: string) => void;
  onMoveToMainList: (listId: string, itemId: string) => void;
  onSelectMainItem: (itemId: string, isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  onRemoveFromMainList: (itemId: string) => void;
  onReorderMainItems: (startIndex: number, endIndex: number) => void;
  onAddTag: (itemIds: string[], tagId: string) => void;
  onRemoveTag: (itemIds: string[], tagId: string) => void;
  onCreateTag: (name: string, color: string) => string | null;
  onEditTag: (tagId: string, name: string, color: string) => void;
  onDeleteTag: (tagId: string) => void;
  onApplyTagToSelected: (tagId: string) => void;
  onRemoveAllTags: () => void;
  onClearSelection: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  appState,
  onSelectInputList,
  onAddInputList,
  onImportToList,
  onAddItemToList,
  onEditListItem,
  onDeleteListItem,
  onRenameList,
  onDeleteList,
  onMoveToMainList,
  onSelectMainItem,
  onRemoveFromMainList,
  onReorderMainItems,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  onEditTag,
  onDeleteTag,
  onApplyTagToSelected,
  onRemoveAllTags,
  onClearSelection
}) => {
  const currentProject = appState.currentProject;
  const selectedMainItems = currentProject?.mainList.filter(item => 
    appState.ui.selectedItems.includes(item.id)
  ) || [];

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-600 mb-4">Create a new project or load an existing one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-[300px_1fr_300px] gap-4 p-4 bg-gray-50 min-h-0">
      {/* Input Lists Panel - Left */}
      <div>
        <InputListPanel
          inputLists={currentProject.inputLists}
          activeListId={appState.ui.activeInputList}
          onSelectList={onSelectInputList}
          onAddList={onAddInputList}
          onImportList={onImportToList}
          onAddItem={onAddItemToList}
          onEditItem={onEditListItem}
          onDeleteItem={onDeleteListItem}
          onRenameList={onRenameList}
          onDeleteList={onDeleteList}
          onMoveToMain={onMoveToMainList}
        />
      </div>

      {/* Main List Panel - Center */}
      <div>
        <MainListPanel
          items={currentProject.mainList}
          selectedItems={appState.ui.selectedItems}
          tagPool={appState.tagPool}
          onSelectItem={onSelectMainItem}
          onRemoveItem={onRemoveFromMainList}
          onReorderItems={onReorderMainItems}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onCreateTag={onCreateTag}
          onMoveUp={(itemId) => {
            const item = currentProject.mainList.find(i => i.id === itemId);
            if (item && item.order > 1) {
              onReorderMainItems(item.order - 1, item.order);
            }
          }}
          onMoveDown={(itemId) => {
            const item = currentProject.mainList.find(i => i.id === itemId);
            if (item && item.order < currentProject.mainList.length) {
              onReorderMainItems(item.order + 1, item.order);
            }
          }}
        />
      </div>

      {/* Tag Pool Panel - Right */}
      <div>
        <TagPoolPanel
          tags={appState.tagPool}
          selectedItemCount={appState.ui.selectedItems.length}
          onCreateTag={onCreateTag}
          onEditTag={onEditTag}
          onDeleteTag={onDeleteTag}
          onApplyTagToSelected={onApplyTagToSelected}
          onRemoveAllTags={onRemoveAllTags}
          onClearSelection={onClearSelection}
        />
      </div>
    </div>
  );
};