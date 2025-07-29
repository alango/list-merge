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
            className="group/tag inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium text-white relative"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            {showRemoveButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag(tagId);
                }}
                className="absolute -top-0.5 -right-0.5 opacity-0 group-hover/tag:opacity-100 hover:bg-black hover:bg-opacity-40 rounded-full w-3 h-3 flex items-center justify-center text-[9px] transition-opacity bg-gray-600"
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