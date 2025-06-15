import React, { useState } from 'react';
import type { Tag } from '../types/index';

interface TagPoolPanelProps {
  tags: Tag[];
  selectedItemCount: number;
  onCreateTag: (name: string, color: string) => void;
  onEditTag: (tagId: string, name: string, color: string) => void;
  onDeleteTag: (tagId: string) => void;
  onApplyTagToSelected: (tagId: string) => void;
}

export const TagPoolPanel: React.FC<TagPoolPanelProps> = ({
  tags,
  selectedItemCount,
  onCreateTag,
  onEditTag,
  onDeleteTag,
  onApplyTagToSelected
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName('');
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
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-6 h-6 rounded border border-gray-300"
                  />
                  <span className="text-xs text-gray-600">Color</span>
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
            <div className="flex space-x-2">
              <button className="text-xs btn-secondary">
                Remove All Tags
              </button>
              <button className="text-xs btn-secondary">
                Clear Selection
              </button>
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
  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
        isClickable 
          ? 'cursor-pointer hover:opacity-80' 
          : 'cursor-default'
      }`}
      style={{ 
        backgroundColor: tag.color + '20', 
        color: tag.color,
        borderColor: tag.color + '40'
      }}
    >
      <span className="truncate max-w-24">{tag.name}</span>
      {tag.usageCount > 0 && (
        <span className="ml-1 text-xs opacity-60">({tag.usageCount})</span>
      )}
      {/* Edit/delete buttons would be shown on hover or in edit mode */}
    </div>
  );
};