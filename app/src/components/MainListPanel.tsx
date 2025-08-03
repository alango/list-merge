import React, { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { MainListItem, Tag } from '../types/index';
import { TagInput, TagDisplay, AddTagButton } from './shared';
import { useItemSelection } from './shared/hooks';


// Drop data interface
interface DropData {
  type: 'main-list-position' | 'main-list-item';
  position?: number;
  itemId?: string;
}

// Drag data interface  
interface DragData {
  type: 'main-item';
  itemId: string;
  content: string;
}

// Drop zone component for positioning
interface DropZoneProps {
  position: number;
  isFirst?: boolean;
  isLast?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ position, isFirst = false, isLast = false }) => {
  const dropData: DropData = {
    type: 'main-list-position',
    position
  };

  const { isOver, setNodeRef } = useDroppable({
    id: `drop-zone-${position}`,
    data: dropData
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 ${
        isOver 
          ? 'h-12 bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg'
          : isFirst || isLast
          ? 'h-6 border-2 border-dashed border-transparent hover:border-gray-300 rounded-lg'
          : 'h-3 border-2 border-dashed border-transparent hover:border-gray-300 rounded-lg'
      }`}
    >
      {isOver && (
        <div className="h-full flex items-center justify-center">
          <span className="text-sm text-blue-600 font-medium">Drop here</span>
        </div>
      )}
    </div>
  );
};

interface MainListPanelProps {
  items: MainListItem[];
  selectedItems: string[];
  tagPool: Tag[];
  onSelectItem: (itemId: string, isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  onMoveUp: (itemId: string) => void;
  onMoveDown: (itemId: string) => void;
  onAddTag: (itemIds: string[], tagId: string) => void;
  onRemoveTag: (itemIds: string[], tagId: string) => void;
  onCreateTag: (name: string, color: string) => string | null;
}

export const MainListPanel: React.FC<MainListPanelProps> = ({
  items,
  selectedItems,
  tagPool,
  onSelectItem,
  onRemoveItem,
  onMoveUp,
  onMoveDown,
  onAddTag,
  onRemoveTag,
  onCreateTag
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
        {/* General drop zone for empty list */}
        {items.length === 0 && (
          <DropZone position={1} isFirst={true} />
        )}
        
        {/* Main list items with drop zones */}
        <div className="overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Your ranked list is empty. Drag items from the input lists to get started.
            </div>
          ) : (
            <div className="space-y-1">
              {/* Drop zone at the beginning */}
              <DropZone position={1} isFirst={true} />
              
              {items
                .sort((a, b) => a.order - b.order)
                .map((item, index) => (
                  <React.Fragment key={item.id}>
                    <DraggableMainListItem
                      item={item}
                      index={index + 1}
                      tagPool={tagPool}
                      isSelected={selectedItems.includes(item.id)}
                      isMultiSelectActive={selectedItems.length > 1}
                      onSelect={(isMultiSelect, isShiftSelect) => onSelectItem(item.id, isMultiSelect, isShiftSelect)}
                      onRemove={() => onRemoveItem(item.id)}
                      onMoveUp={() => onMoveUp(item.id)}
                      onMoveDown={() => onMoveDown(item.id)}
                      onAddTag={(tagId) => onAddTag([item.id], tagId)}
                      onRemoveTag={(tagId) => onRemoveTag([item.id], tagId)}
                      onCreateAndAddTag={(name, color) => {
                        const newTagId = onCreateTag(name, color);
                        if (newTagId) {
                          onAddTag([item.id], newTagId);
                        }
                      }}
                      canMoveUp={index > 0}
                      canMoveDown={index < items.length - 1}
                    />
                    {/* Drop zone after each item */}
                    <DropZone 
                      position={index + 2} 
                      isLast={index === items.length - 1}
                    />
                  </React.Fragment>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MainListItemProps {
  item: MainListItem;
  index: number;
  tagPool: Tag[];
  isSelected: boolean;
  isMultiSelectActive: boolean;
  onSelect: (isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateAndAddTag: (name: string, color: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const DraggableMainListItem: React.FC<MainListItemProps> = ({
  item,
  index,
  tagPool,
  isSelected,
  isMultiSelectActive,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddTag,
  onRemoveTag,
  onCreateAndAddTag,
  canMoveUp,
  canMoveDown
}) => {
  const [showTagInput, setShowTagInput] = useState(false);
  
  const dragData: DragData = {
    type: 'main-item',
    itemId: item.id,
    content: item.content
  };

  const dropData: DropData = {
    type: 'main-list-item',
    itemId: item.id
  };

  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging,
    transform
  } = useDraggable({
    id: `main-item-${item.id}`,
    data: dragData
  });

  const { isOver: isTagDropOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: `main-item-drop-${item.id}`,
    data: dropData
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const { handleClick } = useItemSelection({
    onSelect
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
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
          : isDragging
          ? 'border-blue-300 bg-blue-50'
          : isTagDropOver
          ? 'border-green-400 bg-green-50'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate select-none">
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
        
        {/* Action buttons */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 flex items-center space-x-1">
          <div className="flex flex-col space-y-1">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={!canMoveUp}
              className={`w-6 h-4 flex items-center justify-center text-xs ${
                canMoveUp 
                  ? 'text-gray-600 hover:text-blue-600' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Move up"
            >
              ↑
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={!canMoveDown}
              className={`w-6 h-4 flex items-center justify-center text-xs ${
                canMoveDown 
                  ? 'text-gray-600 hover:text-blue-600' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Move down"
            >
              ↓
            </button>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-6 h-6 flex items-center justify-center text-xs text-red-600 hover:text-red-700"
            title="Remove from list"
          >
            🗑️
          </button>
        </div>
        
        {/* Drag handle */}
        <div 
          className="flex-shrink-0 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <div className="w-4 h-4 text-gray-400 hover:text-gray-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};