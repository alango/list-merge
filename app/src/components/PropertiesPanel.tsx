import React from 'react';
import type { MainListItem, Tag } from '../types/index';

interface PropertiesPanelProps {
  selectedItems: MainListItem[];
  availableTags: Tag[];
  onAddTag: (itemIds: string[], tagId: string) => void;
  onRemoveTag: (itemIds: string[], tagId: string) => void;
  onCreateTag: (name: string, color: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedItems,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateTag
}) => {
  const isMultiSelect = selectedItems.length > 1;
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <h2 className="text-lg font-medium text-gray-900">Properties</h2>
      </div>
      
      <div className="flex-1 panel-content overflow-y-auto">
        {selectedItems.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Select items from the main list to view their properties
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selection info */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {isMultiSelect ? `${selectedItems.length} items selected` : 'Item Details'}
              </h3>
              {selectedItem && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Content</label>
                    <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                      {selectedItem.content}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Source List</label>
                    <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                      {selectedItem.sourceListId}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tag management */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
              
              {/* Current tags */}
              <div className="mb-3">
                {isMultiSelect ? (
                  <div className="text-xs text-gray-500 mb-2">
                    Showing tags applied to all selected items
                  </div>
                ) : null}
                
                <div className="flex flex-wrap gap-1">
                  {getCommonTags(selectedItems).map((tagId) => {
                    const tag = availableTags.find(t => t.id === tagId);
                    return (
                      <span
                        key={tagId}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag?.name || tagId}
                        <button
                          onClick={() => onRemoveTag(selectedItems.map(i => i.id), tagId)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Add tags */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Add Tags
                </label>
                <input
                  type="text"
                  placeholder="Type to search or create tags..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Notes section (for single item) */}
            {selectedItem && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  placeholder="Add notes about this item..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get tags common to all selected items
const getCommonTags = (items: MainListItem[]): string[] => {
  if (items.length === 0) return [];
  if (items.length === 1) return items[0].tags;
  
  return items[0].tags.filter(tag => 
    items.every(item => item.tags.includes(tag))
  );
};