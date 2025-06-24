import React, { useState, useRef, useEffect } from 'react';
import type { Tag } from '../../types/index';
import { fuzzyMatch } from '../../utils/fuzzyMatch';

interface TagInputProps {
  availableTags: Tag[];
  onAddTag: (tagId: string) => void;
  onCreateAndAddTag: (name: string, color: string) => void;
  onClose: () => void;
}

export const TagInput: React.FC<TagInputProps> = ({
  availableTags,
  onAddTag,
  onCreateAndAddTag,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [isOpen] = useState(true);
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