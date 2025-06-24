import React from 'react';
import type { Tag } from '../../types/index';

interface TagDisplayProps {
  tagIds: string[];
  tagPool: Tag[];
  onRemoveTag: (tagId: string) => void;
  showRemoveButton?: boolean;
}

export const TagDisplay: React.FC<TagDisplayProps> = ({
  tagIds,
  tagPool,
  onRemoveTag,
  showRemoveButton = true
}) => {
  return (
    <>
      {tagIds.map((tagId) => {
        const tag = tagPool.find(t => t.id === tagId);
        if (!tag) return null;
        
        return (
          <span
            key={tagId}
            className="group/tag inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white relative"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            {showRemoveButton && (
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
            )}
          </span>
        );
      })}
    </>
  );
};