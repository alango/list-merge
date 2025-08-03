import React, { useState, useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { InputList, InputListItem, Tag } from '../types/index';
import { TagInput, TagDisplay, AddTagButton } from './shared';
import { useItemSelection } from './shared/hooks';
import { ImportPreviewModal } from './ImportPreviewModal';
import { FileProcessor, type ImportResult } from '../utils/fileProcessing';


// Drag data interface
interface DragData {
  type: 'input-item';
  itemId: string;
  sourceListId: string;
  content: string;
}

// Drop data interface
interface DropData {
  type: 'input-list-item';
  itemId: string;
  listId: string;
}

// Draggable item component
interface DraggableInputItemProps {
  item: InputListItem;
  listId: string;
  isEditing: boolean;
  editingContent: string;
  isSelected: boolean;
  isMultiSelectActive: boolean;
  tagPool: Tag[];
  onStartEdit: (item: InputListItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  onKeyPress: (e: React.KeyboardEvent, action: () => void) => void;
  onMoveToMain: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onSelect: (isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateAndAddTag: (name: string, color: string) => void;
}

const DraggableInputItem: React.FC<DraggableInputItemProps> = ({
  item,
  listId,
  isEditing,
  editingContent,
  isSelected,
  isMultiSelectActive,
  tagPool,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditContentChange,
  onKeyPress,
  onMoveToMain,
  onDeleteItem,
  onSelect,
  onAddTag,
  onRemoveTag,
  onCreateAndAddTag
}) => {
  const [showTagInput, setShowTagInput] = useState(false);

  const dragData: DragData = {
    type: 'input-item',
    itemId: item.id,
    sourceListId: listId,
    content: item.content
  };

  const dropData: DropData = {
    type: 'input-list-item',
    itemId: item.id,
    listId: listId
  };

  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging,
    transform
  } = useDraggable({
    id: item.id,
    data: dragData,
    disabled: item.isUsed || isEditing
  });

  const { isOver: isTagDropOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: `input-item-drop-${item.id}`,
    data: dropData,
    disabled: isEditing // Disable drops while editing
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const { handleClick } = useItemSelection({
    onSelect,
    excludeSelectors: ['button', 'input', '.tag-input']
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDropNodeRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={`group relative p-3 border rounded-md cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : item.isUsed 
          ? 'border-gray-200 bg-gray-50 text-gray-400' 
          : isDragging
          ? 'border-blue-300 bg-blue-50'
          : isTagDropOver
          ? 'border-green-400 bg-green-50'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      {isEditing ? (
        <div className="flex space-x-2">
          <input
            type="text"
            value={editingContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, onSaveEdit)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button onClick={onSaveEdit} className="text-xs text-green-600">Save</button>
          <button onClick={onCancelEdit} className="text-xs text-gray-500">Cancel</button>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 select-none break-words">
            {item.content}
          </div>
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            <TagDisplay
              tagIds={item.tags}
              tagPool={tagPool}
              onRemoveTag={onRemoveTag}
            />
            {!isMultiSelectActive && (
              showTagInput ? (
                <TagInput
                  availableTags={tagPool}
                  onAddTag={onAddTag}
                  onCreateAndAddTag={onCreateAndAddTag}
                  onClose={() => setShowTagInput(false)}
                />
              ) : (
                <AddTagButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTagInput(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )
            )}
          </div>
        </div>
      )}
      
      {/* Action buttons - positioned absolutely at top without taking space */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center space-x-1">
        {!item.isUsed && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToMain(item.id); }}
            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer px-1 py-0.5 rounded transition-colors"
            title="Move to main list"
          >
            →
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onStartEdit(item); }}
          className="text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100 cursor-pointer px-1 py-0.5 rounded transition-colors"
          title="Edit item"
        >
          ✏️
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer px-1 py-0.5 rounded transition-colors"
          title="Delete item"
        >
          🗑️
        </button>
        
        {/* Drag handle */}
        {!item.isUsed && !isEditing && (
          <div 
            ref={setDragNodeRef}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
            {...attributes}
            {...listeners}
            title="Drag to move to main list"
          >
            <div className="w-4 h-4 text-gray-400 hover:text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {item.isUsed && (
        <div className="absolute top-1 left-1 text-xs text-gray-400 bg-gray-100 px-1 rounded">
          Used
        </div>
      )}
    </div>
  );
};

interface InputListPanelProps {
  inputLists: InputList[];
  activeListId: string | null;
  selectedItems: string[];
  tagPool: Tag[];
  onSelectList: (listId: string) => void;
  onAddList: () => void;
  onImportListItems: (listId: string, items: string[]) => void;
  onAddItem: (listId: string, content: string) => void;
  onEditItem: (listId: string, itemId: string, content: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onRenameList: (listId: string, newName: string) => void;
  onDeleteList: (listId: string) => void;
  onMoveToMain: (listId: string, itemId: string) => void;
  onSelectItem: (itemId: string, isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  onAddTag: (itemIds: string[], tagId: string) => void;
  onRemoveTag: (itemIds: string[], tagId: string) => void;
  onCreateTag: (name: string, color: string) => string | null;
}

export const InputListPanel: React.FC<InputListPanelProps> = ({
  inputLists,
  activeListId,
  selectedItems,
  tagPool,
  onSelectList,
  onAddList,
  onImportListItems,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onRenameList,
  onDeleteList,
  onMoveToMain,
  onSelectItem,
  onAddTag,
  onRemoveTag,
  onCreateTag
}) => {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Input Lists</h2>
          <button 
            onClick={onAddList}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
          >
            + Add List
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* Tabs for input lists */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {inputLists.map((list) => (
            <button
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
                activeListId === list.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {list.name} ({list.items.length})
            </button>
          ))}
        </div>
        
        {/* Active list content */}
        <div className="flex-1 panel-content">
          {activeListId ? (
            <InputListContent 
              list={inputLists.find(l => l.id === activeListId)!}
              selectedItems={selectedItems}
              tagPool={tagPool}
              onImport={(items) => onImportListItems(activeListId, items)}
              onAddItem={(content) => onAddItem(activeListId, content)}
              onEditItem={(itemId, content) => onEditItem(activeListId, itemId, content)}
              onDeleteItem={(itemId) => onDeleteItem(activeListId, itemId)}
              onRenameList={(newName) => onRenameList(activeListId, newName)}
              onDeleteList={() => onDeleteList(activeListId)}
              onMoveToMain={(itemId) => onMoveToMain(activeListId, itemId)}
              onSelectItem={onSelectItem}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              onCreateTag={onCreateTag}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {inputLists.length === 0 
                ? "No input lists yet. Click 'Add List' to get started."
                : "Select a list tab to view its contents."
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface InputListContentProps {
  list: InputList;
  selectedItems: string[];
  tagPool: Tag[];
  onImport: (items: string[]) => void;
  onAddItem: (content: string) => void;
  onEditItem: (itemId: string, content: string) => void;
  onDeleteItem: (itemId: string) => void;
  onRenameList: (newName: string) => void;
  onDeleteList: () => void;
  onMoveToMain: (itemId: string) => void;
  onSelectItem: (itemId: string, isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  onAddTag: (itemIds: string[], tagId: string) => void;
  onRemoveTag: (itemIds: string[], tagId: string) => void;
  onCreateTag: (name: string, color: string) => string | null;
}

const InputListContent: React.FC<InputListContentProps> = ({ 
  list, 
  selectedItems,
  tagPool,
  onImport,
  onAddItem, 
  onEditItem, 
  onDeleteItem, 
  onRenameList, 
  onDeleteList, 
  onMoveToMain,
  onSelectItem,
  onAddTag,
  onRemoveTag,
  onCreateTag
}) => {
  const [newItemContent, setNewItemContent] = React.useState('');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState('');
  const [isRenamingList, setIsRenamingList] = React.useState(false);
  const [listNameInput, setListNameInput] = React.useState(list.name);
  
  // Import-related state
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportResult<string[]> | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = () => {
    if (newItemContent.trim()) {
      onAddItem(newItemContent.trim());
      setNewItemContent('');
    }
  };

  const handleStartEdit = (item: InputListItem) => {
    setEditingItemId(item.id);
    setEditingContent(item.content);
  };

  const handleSaveEdit = () => {
    if (editingItemId && editingContent.trim()) {
      onEditItem(editingItemId, editingContent.trim());
      setEditingItemId(null);
      setEditingContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingContent('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      if (action === handleSaveEdit) {
        handleCancelEdit();
      }
    }
  };

  const handleRenameList = () => {
    if (listNameInput.trim() && listNameInput.trim() !== list.name) {
      onRenameList(listNameInput.trim());
    }
    setIsRenamingList(false);
  };

  // Import functionality handlers
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setImportResult({ success: false, error: 'Could not read file content' });
        setIsImportModalOpen(true);
        return;
      }

      // Process the file content
      const result = FileProcessor.importListContent(content);
      setImportResult(result);
      setIsImportModalOpen(true);
    };

    reader.onerror = () => {
      setImportResult({ success: false, error: 'Error reading file' });
      setIsImportModalOpen(true);
    };

    reader.readAsText(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (importResult?.success && importResult.data) {
      onImport(importResult.data);
      setIsImportModalOpen(false);
      setImportResult(null);
      setSelectedFileName('');
    }
  };

  const handleCancelImport = () => {
    setIsImportModalOpen(false);
    setImportResult(null);
    setSelectedFileName('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with list name and actions */}
      <div className="flex items-center justify-between mb-4">
        {isRenamingList ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={listNameInput}
              onChange={(e) => setListNameInput(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, handleRenameList)}
              className="text-sm font-medium px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button onClick={handleRenameList} className="text-xs text-blue-600">Save</button>
            <button onClick={() => setIsRenamingList(false)} className="text-xs text-gray-500">Cancel</button>
          </div>
        ) : (
          <h3 
            className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
            onClick={() => setIsRenamingList(true)}
            title="Click to rename"
          >
            {list.name}
          </h3>
        )}
        
        <div className="flex space-x-2">
          <button 
            onClick={handleImportClick}
            className="text-sm btn-secondary"
          >
            Import
          </button>
          <button 
            onClick={onDeleteList}
            className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded"
            title="Delete list"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Add new item input */}
      <div className="mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, handleAddItem)}
            placeholder="Add new item..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button 
            onClick={handleAddItem}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>
      
      {/* Items list */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {list.items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No items in this list yet. Add some above!
          </div>
        ) : (
          list.items.map((item) => (
            <DraggableInputItem
              key={item.id}
              item={item}
              listId={list.id}
              isEditing={editingItemId === item.id}
              editingContent={editingContent}
              isSelected={selectedItems.includes(item.id)}
              isMultiSelectActive={selectedItems.length > 1}
              tagPool={tagPool}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onEditContentChange={setEditingContent}
              onKeyPress={handleKeyPress}
              onMoveToMain={onMoveToMain}
              onDeleteItem={onDeleteItem}
              onSelect={(isMultiSelect, isShiftSelect) => onSelectItem(item.id, isMultiSelect, isShiftSelect)}
              onAddTag={(tagId) => onAddTag([item.id], tagId)}
              onRemoveTag={(tagId) => onRemoveTag([item.id], tagId)}
              onCreateAndAddTag={(name, color) => {
                const newTagId = onCreateTag(name, color);
                if (newTagId) {
                  onAddTag([item.id], newTagId);
                }
              }}
            />
          ))
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.csv,.json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import preview modal */}
      <ImportPreviewModal
        isOpen={isImportModalOpen}
        result={importResult}
        fileName={selectedFileName}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />
    </div>
  );
};