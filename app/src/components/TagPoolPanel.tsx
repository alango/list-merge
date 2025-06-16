import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Tag } from '../types/index';

// Drag data interface for tags
interface TagDragData {
  type: 'tag';
  tagId: string;
  tagName: string;
  tagColor: string;
}

interface TagPoolPanelProps {
  tags: Tag[];
  selectedItemCount: number;
  onCreateTag: (name: string, color: string) => void;
  onEditTag: (tagId: string, name: string, color: string) => void;
  onDeleteTag: (tagId: string) => void;
  onApplyTagToSelected: (tagId: string) => void;
  onRemoveAllTags: () => void;
  onClearSelection: () => void;
}

export const TagPoolPanel: React.FC<TagPoolPanelProps> = ({
  tags,
  selectedItemCount,
  onCreateTag,
  onEditTag,
  onDeleteTag,
  onApplyTagToSelected,
  onRemoveAllTags,
  onClearSelection
}) => {
  // Predefined color palette
  const defaultColors = [
    '#ef4444', // red
    '#f97316', // orange  
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
    '#059669', // emerald
    '#dc2626', // red-600
    '#7c3aed'  // violet-600
  ];

  const getNextColor = (): string => {
    // Find unused colors first
    const usedColors = tags.map(tag => tag.color);
    const unusedColors = defaultColors.filter(color => !usedColors.includes(color));
    
    if (unusedColors.length > 0) {
      return unusedColors[0];
    }
    
    // If all colors are used, return a random one
    return defaultColors[Math.floor(Math.random() * defaultColors.length)];
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(getNextColor());

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor(getNextColor());
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTagName('');
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Tag Pool</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
          >
            + New Tag
          </button>
        </div>
        {selectedItemCount > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            {selectedItemCount} item{selectedItemCount > 1 ? 's' : ''} selected • Click tags to apply
          </div>
        )}
      </div>
      
      <div className="flex-1 panel-content">
        {/* Tag creation form */}
        {isCreating && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Tag name..."
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-600 mb-2">Color</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded border-2 ${
                          newTagColor === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-full h-8 rounded border border-gray-300"
                    title="Custom color"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateTag}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tag list */}
        <div className="space-y-2 overflow-y-auto">
          {tags.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No tags created yet. Click "New Tag" to create your first tag.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  isClickable={selectedItemCount > 0}
                  onClick={() => selectedItemCount > 0 && onApplyTagToSelected(tag.id)}
                  onEdit={(name, color) => onEditTag(tag.id, name, color)}
                  onDelete={() => onDeleteTag(tag.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bulk actions */}
        {selectedItemCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Bulk Actions</h3>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <button 
                  onClick={onRemoveAllTags}
                  className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded"
                >
                  Remove All Tags
                </button>
                <button 
                  onClick={onClearSelection}
                  className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TagChipProps {
  tag: Tag;
  isClickable: boolean;
  onClick: () => void;
  onEdit: (name: string, color: string) => void;
  onDelete: () => void;
}

const TagChip: React.FC<TagChipProps> = ({ tag, isClickable, onClick, onEdit, onDelete }) => {
  // Predefined color palette (same as in TagPoolPanel)
  const defaultColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
    '#8b5cf6', '#ec4899', '#6b7280', '#059669', '#dc2626', '#7c3aed'
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color);
  const inputRef = useRef<HTMLInputElement>(null);

  const dragData: TagDragData = {
    type: 'tag',
    tagId: tag.id,
    tagName: tag.name,
    tagColor: tag.color
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform
  } = useDraggable({
    id: `tag-${tag.id}`,
    data: dragData,
    disabled: isEditing // Disable dragging while editing
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const chipStyle = {
    ...style,
    backgroundColor: tag.color + '20', 
    color: tag.color,
    borderColor: tag.color + '40'
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onEdit(editName.trim(), editColor);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  if (isEditing) {
    return (
      <>
        {/* Tag placeholder to maintain layout */}
        <div
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border opacity-50"
          style={chipStyle}
        >
          <span className="truncate max-w-24 select-none">{tag.name}</span>
          {tag.usageCount > 0 && (
            <span className="ml-1 text-xs opacity-60 select-none">({tag.usageCount})</span>
          )}
        </div>
        
        {/* Modal overlay */}
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Edit Tag</h3>
            
            {/* Name input */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tag name..."
              />
            </div>
            
            {/* Color picker */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      editColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-full h-8 rounded border border-gray-300"
                title="Custom color"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={!editName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={chipStyle}
      onClick={isClickable ? onClick : undefined}
      className={`group inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border relative ${
        isClickable 
          ? 'cursor-pointer hover:opacity-80' 
          : isDragging
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
      {...(isEditing ? {} : { ...attributes, ...listeners })}
    >
      <span className="truncate max-w-24 select-none">{tag.name}</span>
      {tag.usageCount > 0 && (
        <span className="ml-1 text-xs opacity-60 select-none">({tag.usageCount})</span>
      )}
      
      {/* Hover actions */}
      <div 
        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleStartEdit}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-blue-600 shadow-md hover:shadow-lg"
          title="Edit tag"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          onClick={handleDeleteClick}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-red-600 shadow-md hover:shadow-lg"
          title="Delete tag"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};