import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { InputListPanel } from '../components/InputListPanel';
import type { InputList, Tag, InputListItem } from '../types/index';

// Mock DnD Kit
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
    transform: null
  }),
  useDroppable: () => ({
    isOver: false,
    setNodeRef: vi.fn()
  })
}));

describe('InputListPanel File Import Integration', () => {
  const mockOnSelectList = vi.fn();
  const mockOnAddList = vi.fn();
  const mockOnImportListItems = vi.fn();
  const mockOnAddItem = vi.fn();
  const mockOnEditItem = vi.fn();
  const mockOnDeleteItem = vi.fn();
  const mockOnRenameList = vi.fn();
  const mockOnDeleteList = vi.fn();
  const mockOnMoveToMain = vi.fn();
  const mockOnSelectItem = vi.fn();
  const mockOnAddTag = vi.fn();
  const mockOnRemoveTag = vi.fn();
  const mockOnCreateTag = vi.fn();

  const sampleInputList: InputList = {
    id: 'list-1',
    name: 'Test List',
    items: [
      { id: 'item-1', content: 'Existing Item', isUsed: false, tags: [] }
    ]
  };

  const sampleTags: Tag[] = [
    {
      id: 'tag-1',
      name: 'Important',
      color: '#ff0000',
      createdAt: new Date(),
      usageCount: 1
    }
  ];

  const defaultProps = {
    inputLists: [sampleInputList],
    activeListId: 'list-1',
    selectedItems: [],
    tagPool: sampleTags,
    onSelectList: mockOnSelectList,
    onAddList: mockOnAddList,
    onImportListItems: mockOnImportListItems,
    onAddItem: mockOnAddItem,
    onEditItem: mockOnEditItem,
    onDeleteItem: mockOnDeleteItem,
    onRenameList: mockOnRenameList,
    onDeleteList: mockOnDeleteList,
    onMoveToMain: mockOnMoveToMain,
    onSelectItem: mockOnSelectItem,
    onAddTag: mockOnAddTag,
    onRemoveTag: mockOnRemoveTag,
    onCreateTag: mockOnCreateTag
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('import button rendering', () => {
    it('should render import button in active list', () => {
      render(<InputListPanel {...defaultProps} />);
      
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    it('should render file input with correct attributes', () => {
      render(<InputListPanel {...defaultProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      expect(fileInput).toHaveAttribute('accept', '.txt,.csv,.json');
      expect(fileInput).toHaveClass('hidden');
    });
  });

  describe('import button interaction', () => {
    it('should be clickable when active list exists', () => {
      render(<InputListPanel {...defaultProps} />);
      
      const importButton = screen.getByText('Import');
      expect(importButton).toBeInTheDocument();
      
      // Should be able to click without error
      fireEvent.click(importButton);
    });

    it('should not show import functionality when no active list', () => {
      render(<InputListPanel {...defaultProps} activeListId={null} />);
      
      expect(screen.queryByText('Import')).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('should show placeholder message when no active list', () => {
      render(<InputListPanel {...defaultProps} activeListId={null} />);
      
      expect(screen.getByText('Select a list tab to view its contents.')).toBeInTheDocument();
    });

    it('should show appropriate message when no input lists exist', () => {
      render(<InputListPanel {...defaultProps} inputLists={[]} activeListId={null} />);
      
      expect(screen.getByText("No input lists yet. Click 'Add List' to get started.")).toBeInTheDocument();
    });
  });

  describe('list display', () => {
    it('should display the active list content', () => {
      render(<InputListPanel {...defaultProps} />);
      
      expect(screen.getByText('Test List')).toBeInTheDocument();
      expect(screen.getByText('Existing Item')).toBeInTheDocument();
    });

    it('should show list tab with item count', () => {
      render(<InputListPanel {...defaultProps} />);
      
      expect(screen.getByText('Test List (1)')).toBeInTheDocument();
    });
  });

  describe('multiple lists handling', () => {
    it('should handle multiple lists correctly', () => {
      const multipleListsProps = {
        ...defaultProps,
        inputLists: [
          sampleInputList,
          { id: 'list-2', name: 'Second List', items: [] }
        ],
        activeListId: 'list-2'
      };

      render(<InputListPanel {...multipleListsProps} />);
      
      // Should show both list tabs
      expect(screen.getByText('Test List (1)')).toBeInTheDocument();
      expect(screen.getByText('Second List (0)')).toBeInTheDocument();
      
      // Should show the import button for active list
      expect(screen.getByText('Import')).toBeInTheDocument();
    });
  });

  describe('component integration', () => {
    it('should render all required UI elements', () => {
      render(<InputListPanel {...defaultProps} />);
      
      // Header elements
      expect(screen.getByText('Input Lists')).toBeInTheDocument();
      expect(screen.getByText('+ Add List')).toBeInTheDocument();
      
      // List content elements
      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getAllByText('🗑️')).toHaveLength(2); // Delete list and item buttons
      
      // Add item input
      expect(screen.getByPlaceholderText('Add new item...')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should maintain proper component structure', () => {
      render(<InputListPanel {...defaultProps} />);
      
      // Should have the main panel structure
      const panel = document.querySelector('.panel');
      expect(panel).toBeTruthy();
      
      // Should have hidden file input
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
    });
  });

  describe('callback function props', () => {
    it('should accept all required callback props', () => {
      // This test ensures that the component can be rendered with all props
      // without TypeScript errors, which validates the prop interface
      expect(() => {
        render(<InputListPanel {...defaultProps} />);
      }).not.toThrow();
    });

    it('should call onAddList when Add List button is clicked', () => {
      render(<InputListPanel {...defaultProps} />);
      
      fireEvent.click(screen.getByText('+ Add List'));
      expect(mockOnAddList).toHaveBeenCalledTimes(1);
    });

    it('should call onDeleteList when delete button is clicked', () => {
      render(<InputListPanel {...defaultProps} />);
      
      // Find and click the delete button (trash icon)
      const deleteButton = screen.getByTitle('Delete list');
      fireEvent.click(deleteButton);
      expect(mockOnDeleteList).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<InputListPanel {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Input Lists');
    });

    it('should have accessible buttons', () => {
      render(<InputListPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: '+ Add List' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });
  });
});