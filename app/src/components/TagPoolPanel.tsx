import React, { useState } from 'react';
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
  onReplaceAllTags: (tagId: string) => void;
}

export const TagPoolPanel: React.FC<TagPoolPanelProps> = ({
  tags,
  selectedItemCount,
  onCreateTag,
  onEditTag,
  onDeleteTag,
  onApplyTagToSelected,
  onRemoveAllTags,
  onClearSelection,
  onReplaceAllTags
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
                  onRightClick={() => selectedItemCount > 0 && onReplaceAllTags(tag.id)}
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
              <div className="text-xs text-gray-600">
                Right-click any tag to replace all tags with that tag
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
  onRightClick: () => void;
}

const TagChip: React.FC<TagChipProps> = ({ tag, isClickable, onClick, onEdit, onDelete, onRightClick }) => {
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
    data: dragData
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isClickable) {
      onRightClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={chipStyle}
      onClick={isClickable ? onClick : undefined}
      onContextMenu={handleContextMenu}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
        isClickable 
          ? 'cursor-pointer hover:opacity-80' 
          : isDragging
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="truncate max-w-24 select-none">{tag.name}</span>
      {tag.usageCount > 0 && (
        <span className="ml-1 text-xs opacity-60 select-none">({tag.usageCount})</span>
      )}
      {/* Edit/delete buttons would be shown on hover or in edit mode */}
    </div>
  );
};