import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { InputList, InputListItem } from '../types/index';

// Drag data interface
interface DragData {
  type: 'input-item';
  itemId: string;
  sourceListId: string;
  content: string;
}

// Draggable item component
interface DraggableInputItemProps {
  item: InputListItem;
  listId: string;
  isEditing: boolean;
  editingContent: string;
  onStartEdit: (item: InputListItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  onKeyPress: (e: React.KeyboardEvent, action: () => void) => void;
  onMoveToMain: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

const DraggableInputItem: React.FC<DraggableInputItemProps> = ({
  item,
  listId,
  isEditing,
  editingContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditContentChange,
  onKeyPress,
  onMoveToMain,
  onDeleteItem
}) => {
  const dragData: DragData = {
    type: 'input-item',
    itemId: item.id,
    sourceListId: listId,
    content: item.content
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform
  } = useDraggable({
    id: item.id,
    data: dragData,
    disabled: item.isUsed || isEditing
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative p-3 border border-gray-200 rounded-md ${
        item.isUsed 
          ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
          : isDragging
          ? 'bg-blue-50 border-blue-300'
          : 'bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing'
      }`}
      {...(item.isUsed || isEditing ? {} : { ...attributes, ...listeners })}
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
        <div className="flex items-center justify-between">
          <span className="flex-1 select-none">{item.content}</span>
          <div className="opacity-0 group-hover:opacity-100 flex space-x-1 ml-2">
            {!item.isUsed && (
              <button
                onClick={() => onMoveToMain(item.id)}
                className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded"
                title="Move to main list"
              >
                →
              </button>
            )}
            <button
              onClick={() => onStartEdit(item)}
              className="text-xs text-gray-600 hover:text-gray-700 px-2 py-1 rounded"
              title="Edit item"
            >
              ✏️
            </button>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded"
              title="Delete item"
            >
              🗑️
            </button>
          </div>
        </div>
      )}
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
  onSelectList: (listId: string) => void;
  onAddList: () => void;
  onImportList: (listId: string) => void;
  onAddItem: (listId: string, content: string) => void;
  onEditItem: (listId: string, itemId: string, content: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onRenameList: (listId: string, newName: string) => void;
  onDeleteList: (listId: string) => void;
  onMoveToMain: (listId: string, itemId: string) => void;
}

export const InputListPanel: React.FC<InputListPanelProps> = ({
  inputLists,
  activeListId,
  onSelectList,
  onAddList,
  onImportList,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onRenameList,
  onDeleteList,
  onMoveToMain
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
              onImport={() => onImportList(activeListId)}
              onAddItem={(content) => onAddItem(activeListId, content)}
              onEditItem={(itemId, content) => onEditItem(activeListId, itemId, content)}
              onDeleteItem={(itemId) => onDeleteItem(activeListId, itemId)}
              onRenameList={(newName) => onRenameList(activeListId, newName)}
              onDeleteList={() => onDeleteList(activeListId)}
              onMoveToMain={(itemId) => onMoveToMain(activeListId, itemId)}
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
  onImport: () => void;
  onAddItem: (content: string) => void;
  onEditItem: (itemId: string, content: string) => void;
  onDeleteItem: (itemId: string) => void;
  onRenameList: (newName: string) => void;
  onDeleteList: () => void;
  onMoveToMain: (itemId: string) => void;
}

const InputListContent: React.FC<InputListContentProps> = ({ 
  list, 
  onImport, 
  onAddItem, 
  onEditItem, 
  onDeleteItem, 
  onRenameList, 
  onDeleteList, 
  onMoveToMain 
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
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onEditContentChange={setEditingContent}
              onKeyPress={handleKeyPress}
              onMoveToMain={onMoveToMain}
              onDeleteItem={onDeleteItem}
            />
          ))
        )}
      </div>
    </div>
  );
};