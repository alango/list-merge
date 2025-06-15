import React from 'react';
import type { MainListItem } from '../types/index';

interface MainListPanelProps {
  items: MainListItem[];
  selectedItems: string[];
  onSelectItem: (itemId: string, isMultiSelect: boolean) => void;
  onReorderItems: (startIndex: number, endIndex: number) => void;
}

export const MainListPanel: React.FC<MainListPanelProps> = ({
  items,
  selectedItems,
  onSelectItem,
  onReorderItems
}) => {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Main Ranked List</h2>
          <div className="text-sm text-gray-500">
            {items.length} items
          </div>
        </div>
      </div>
      
      <div className="flex-1 panel-content">
        {/* Drop zone indicator */}
        <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
          Drop items here to add them to your ranked list
        </div>
        
        {/* Main list items */}
        <div className="space-y-2 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Your ranked list is empty. Drag items from the input lists to get started.
            </div>
          ) : (
            items
              .sort((a, b) => a.order - b.order)
              .map((item, index) => (
                <MainListItemComponent
                  key={item.id}
                  item={item}
                  index={index + 1}
                  isSelected={selectedItems.includes(item.id)}
                  onSelect={(isMultiSelect) => onSelectItem(item.id, isMultiSelect)}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
};

interface MainListItemProps {
  item: MainListItem;
  index: number;
  isSelected: boolean;
  onSelect: (isMultiSelect: boolean) => void;
}

const MainListItemComponent: React.FC<MainListItemProps> = ({
  item,
  index,
  isSelected,
  onSelect
}) => {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(e.ctrlKey || e.metaKey);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 border rounded-md cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {item.content}
          </div>
          {item.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.tags.map((tagId) => (
                <span
                  key={tagId}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tagId} {/* This will be replaced with actual tag names */}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="w-4 h-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};