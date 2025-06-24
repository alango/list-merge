import React from 'react';

interface AddTagButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
}

export const AddTagButton: React.FC<AddTagButtonProps> = ({
  onClick,
  title = "Add tag",
  className = ""
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 border border-dashed border-gray-300 rounded-full text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors ${className}`}
      title={title}
    >
      + Add tag
    </button>
  );
};