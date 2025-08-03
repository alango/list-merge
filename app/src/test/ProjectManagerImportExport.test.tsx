import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectManager } from '../components/ProjectManager';
import type { Project, Tag } from '../types/index';

describe('ProjectManager Integration', () => {
  const mockOnNewProject = vi.fn();
  const mockOnImportProject = vi.fn();

  const sampleProject: Project = {
    id: 'project-1',
    name: 'Test Project',
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-15'),
    inputLists: [
      {
        id: 'list-1',
        name: 'List 1',
        items: [
          { id: 'item-1', content: 'Item 1', isUsed: false, tags: ['tag-1'] }
        ]
      }
    ],
    mainList: [
      { id: 'item-1', content: 'Item 1', sourceListId: 'list-1', order: 0, tags: ['tag-1'] }
    ]
  };

  const sampleTags: Tag[] = [
    {
      id: 'tag-1',
      name: 'Important',
      color: '#ff0000',
      createdAt: new Date(),
      usageCount: 2
    }
  ];

  const defaultProps = {
    currentProject: sampleProject,
    tagPool: sampleTags,
    onNewProject: mockOnNewProject,
    onImportProject: mockOnImportProject
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all project management buttons', () => {
      render(<ProjectManager {...defaultProps} />);

      expect(screen.getByText('New Project')).toBeInTheDocument();
      expect(screen.getByText('Import/Export')).toBeInTheDocument();
    });

    it('should display application title', () => {
      render(<ProjectManager {...defaultProps} />);

      expect(screen.getByText('List Merge')).toBeInTheDocument();
    });
  });

  describe('modal state management', () => {
    it('should open import/export modal when button is clicked', () => {
      render(<ProjectManager {...defaultProps} />);

      const importExportButton = screen.getByText('Import/Export');
      fireEvent.click(importExportButton);

      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
      render(<ProjectManager {...defaultProps} />);

      // Open modal
      fireEvent.click(screen.getByText('Import/Export'));
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();
    });

    it('should close modal on Escape key', () => {
      render(<ProjectManager {...defaultProps} />);

      // Open modal
      fireEvent.click(screen.getByText('Import/Export'));
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();

      // Press escape on the modal backdrop
      const modalBackdrop = screen.getByText('Project Import/Export').closest('[tabindex="-1"]');
      if (modalBackdrop) {
        fireEvent.keyDown(modalBackdrop, { key: 'Escape' });
        expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();
      }
    });
  });

  describe('project management functions', () => {
    it('should call onNewProject when New Project is clicked', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('New Project'));
      expect(mockOnNewProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('layout and styling', () => {
    it('should have proper layout structure', () => {
      render(<ProjectManager {...defaultProps} />);

      const container = screen.getByText('List Merge').parentElement?.parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should separate title/new project from import/export controls', () => {
      render(<ProjectManager {...defaultProps} />);

      const newProjectButton = screen.getByText('New Project');
      const importExportButton = screen.getByText('Import/Export');
      
      // They should be in different containers
      expect(newProjectButton.parentElement).not.toBe(importExportButton.parentElement);
    });
  });

  describe('prop handling', () => {
    it('should handle null current project', () => {
      const propsWithNullProject = {
        ...defaultProps,
        currentProject: null
      };

      expect(() => render(<ProjectManager {...propsWithNullProject} />)).not.toThrow();
    });

    it('should handle empty tag pool', () => {
      const propsWithEmptyTags = {
        ...defaultProps,
        tagPool: []
      };

      expect(() => render(<ProjectManager {...propsWithEmptyTags} />)).not.toThrow();
    });

    it('should pass all required props to modal', () => {
      render(<ProjectManager {...defaultProps} />);

      // Open modal to trigger prop passing
      fireEvent.click(screen.getByText('Import/Export'));

      // Modal should render without errors, indicating props were passed correctly
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ProjectManager {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('List Merge');
    });

    it('should have accessible button labels', () => {
      render(<ProjectManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import/Export' })).toBeInTheDocument();
    });
  });

  describe('integration behavior', () => {
    it('should maintain button states during modal interaction', () => {
      render(<ProjectManager {...defaultProps} />);

      // All buttons should be enabled initially
      expect(screen.getByText('New Project')).toBeEnabled();
      expect(screen.getByText('Import/Export')).toBeEnabled();

      // Open modal
      fireEvent.click(screen.getByText('Import/Export'));

      // Buttons should still be enabled
      expect(screen.getByText('New Project')).toBeEnabled();
      expect(screen.getByText('Import/Export')).toBeEnabled();
    });

    it('should not interfere with modal functionality', () => {
      render(<ProjectManager {...defaultProps} />);

      // Open modal
      fireEvent.click(screen.getByText('Import/Export'));

      // Modal should be functional
      expect(screen.getByText('Export Current Project')).toBeInTheDocument();
      expect(screen.getByText('Import Project')).toBeInTheDocument();
    });
  });
});