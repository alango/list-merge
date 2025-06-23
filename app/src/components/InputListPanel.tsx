import React, { useState, useRef, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { InputList, InputListItem, Tag } from '../types/index';

// Fuzzy matching function
const fuzzyMatch = (query: string, text: string): number => {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower === queryLower) return 100;
  if (textLower.startsWith(queryLower)) return 90;
  if (textLower.includes(queryLower)) return 70;
  
  let queryIndex = 0;
  let score = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 10;
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length ? score : 0;
};

// Tag input component
interface TagInputProps {
  availableTags: Tag[];
  onAddTag: (tagId: string) => void;
  onCreateAndAddTag: (name: string, color: string) => void;
  onClose: () => void;
}

const TagInput: React.FC<TagInputProps> = ({
  availableTags,
  onAddTag,
  onCreateAndAddTag,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const suggestions = React.useMemo(() => {
    if (query.length < 1) return [];
    
    const filtered = availableTags
      .map(tag => ({
        tag,
        score: fuzzyMatch(query, tag.name)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.tag.usageCount - a.tag.usageCount)
      .slice(0, 6);

    return filtered.map(item => item.tag);
  }, [query, availableTags]);

  const canCreateNew = query.length >= 2 && 
    !availableTags.some(tag => tag.name.toLowerCase() === query.toLowerCase());

  const allOptions = canCreateNew 
    ? [...suggestions, { id: 'create-new', name: `Create "${query}"`, color: '#10b981' } as Tag]
    : suggestions;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (allOptions.length > 0) {
          setHighlightedIndex((prev) => 
            prev < allOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (allOptions.length > 0) {
          setHighlightedIndex((prev) => 
            prev > 0 ? prev - 1 : allOptions.length - 1
          );
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (allOptions.length > 0) {
          handleSelectOption(allOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const handleSelectOption = (option: Tag) => {
    if (option.id === 'create-new') {
      onCreateAndAddTag(query, '#10b981'); // Default color
    } else {
      onAddTag(option.id);
    }
    onClose();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search tags..."
        className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      
      {isOpen && allOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-48 max-h-48 overflow-y-auto bg-white rounded-md shadow-lg border border-gray-200">
          {allOptions.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option)}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center space-x-2 ${
                index === highlightedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: option.color }}
              />
              <span className="truncate">{option.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

  const handleClick = (e: React.MouseEvent) => {
    // Don't select if clicking on buttons, inputs, or interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
        target.closest('button') || target.closest('.tag-input')) {
      return;
    }
    
    const isMultiSelect = e.ctrlKey || e.metaKey;
    const isShiftSelect = e.shiftKey;
    onSelect(isMultiSelect, isShiftSelect);
  };

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
          <div className="text-sm font-medium text-gray-900 truncate select-none">
            {item.content}
          </div>
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            {item.tags.map((tagId) => {
              const tag = tagPool.find(t => t.id === tagId);
              if (!tag) return null;
              
              return (
                <span
                  key={tagId}
                  className="group/tag inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white relative"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTag(tagId);
                    }}
                    className="absolute -top-1 -right-1 opacity-0 group-hover/tag:opacity-100 hover:bg-black hover:bg-opacity-40 rounded-full w-4 h-4 flex items-center justify-center text-xs transition-opacity bg-gray-600"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {!isMultiSelectActive && (
              showTagInput ? (
                <TagInput
                  availableTags={tagPool}
                  onAddTag={onAddTag}
                  onCreateAndAddTag={onCreateAndAddTag}
                  onClose={() => setShowTagInput(false)}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTagInput(true);
                  }}
                  className="inline-flex items-center px-2 py-1 border border-dashed border-gray-300 rounded-full text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  title="Add tag"
                >
                  + Add tag
                </button>
              )
            )}
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1">
        {!item.isUsed && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToMain(item.id); }}
            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded"
            title="Move to main list"
          >
            →
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onStartEdit(item); }}
          className="text-xs text-gray-600 hover:text-gray-700 px-2 py-1 rounded"
          title="Edit item"
        >
          ✏️
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded"
          title="Delete item"
        >
          🗑️
        </button>
        
        {/* Drag handle - make it larger and more prominent */}
        {!item.isUsed && !isEditing && (
          <div 
            ref={setDragNodeRef}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing px-2 py-1 ml-1 rounded hover:bg-gray-100"
            {...attributes}
            {...listeners}
            title="Drag to move to main list"
          >
            <div className="w-5 h-5 text-gray-400 hover:text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {item.isUsed && (
        <div className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-100 px-1 rounded">
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
  onImportList: (listId: string) => void;
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
  onImportList,
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
              onImport={() => onImportList(activeListId)}
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
  onImport: () => void;
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

  const handleAddItem = () => {
    if (newItemContent.trim()) {
      onAddItem(newItemContent.trim());
      setNewItemContent('');
    }
  };

  const handleStartEdit = (item: any) => {
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
            onClick={onImport}
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
    </div>
  );
};