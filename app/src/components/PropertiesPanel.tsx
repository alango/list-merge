import React, { useState, useRef, useEffect } from 'react';
import type { MainListItem, Tag } from '../types/index';

// Fuzzy matching function
const fuzzyMatch = (query: string, text: string): number => {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with gets high score
  if (textLower.startsWith(queryLower)) return 90;
  
  // Contains gets medium score
  if (textLower.includes(queryLower)) return 70;
  
  // Character-by-character fuzzy matching
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

// Tag autocomplete component
interface TagAutocompleteProps {
  availableTags: Tag[];
  selectedTags: string[];
  onAddTag: (tagId: string) => void;
  onCreateTag: (name: string) => void;
}

const TagAutocomplete: React.FC<TagAutocompleteProps> = ({
  availableTags,
  selectedTags,
  onAddTag,
  onCreateTag
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter and sort tags based on fuzzy matching
  const suggestions = React.useMemo(() => {
    if (query.length < 2) return [];
    
    const filtered = availableTags
      .filter(tag => !selectedTags.includes(tag.id))
      .map(tag => ({
        tag,
        score: fuzzyMatch(query, tag.name)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.tag.usageCount - a.tag.usageCount)
      .slice(0, 8); // Limit to 8 suggestions

    return filtered.map(item => item.tag);
  }, [query, availableTags, selectedTags]);

  // Check if query would create a new tag
  const canCreateNew = query.length >= 2 && 
    !availableTags.some(tag => tag.name.toLowerCase() === query.toLowerCase());

  const allOptions = canCreateNew 
    ? [...suggestions, { id: 'create-new', name: `Create "${query}"`, color: '#10b981' } as Tag]
    : suggestions;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(e.target.value.length >= 2);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < allOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : allOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        handleSelectOption(allOptions[highlightedIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  const handleSelectOption = (option: Tag) => {
    if (option.id === 'create-new') {
      onCreateTag(query);
    } else {
      onAddTag(option.id);
    }
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(query.length >= 2)}
        placeholder="Type to search or create tags..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {isOpen && allOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {allOptions.map((option, index) => (
            <div
              key={option.id}
              onClick={() => handleSelectOption(option)}
              className={`px-3 py-2 cursor-pointer flex items-center space-x-2 ${
                index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: option.color }}
              />
              <span className="text-sm flex-1">{option.name}</span>
              {option.id === 'create-new' && (
                <span className="text-xs text-gray-500">New</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  
  const handleAddTag = (tagId: string) => {
    const itemIds = selectedItems.map(item => item.id);
    onAddTag(itemIds, tagId);
  };

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
    const usedColors = availableTags.map(tag => tag.color);
    const unusedColors = defaultColors.filter(color => !usedColors.includes(color));
    
    if (unusedColors.length > 0) {
      return unusedColors[0];
    }
    
    // If all colors are used, return a random one
    return defaultColors[Math.floor(Math.random() * defaultColors.length)];
  };

  const handleCreateTag = (name: string) => {
    const defaultColor = getNextColor();
    onCreateTag(name, defaultColor);
  };

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
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: tag?.color || '#6b7280' }}
                      >
                        {tag?.name || tagId}
                        <button
                          onClick={() => onRemoveTag(selectedItems.map(i => i.id), tagId)}
                          className="ml-1 text-white hover:text-gray-200"
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
                <TagAutocomplete
                  availableTags={availableTags}
                  selectedTags={getCommonTags(selectedItems)}
                  onAddTag={handleAddTag}
                  onCreateTag={handleCreateTag}
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