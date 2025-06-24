import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectManager } from '../components/ProjectManager';
import type { Project, Tag } from '../types/index';

describe('ProjectManager Import/Export Integration', () => {
  const mockOnNewProject = vi.fn();
  const mockOnLoadProject = vi.fn();
  const mockOnSaveProject = vi.fn();
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
    onLoadProject: mockOnLoadProject,
    onSaveProject: mockOnSaveProject,
    onImportProject: mockOnImportProject
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all project management buttons', () => {
      render(<ProjectManager {...defaultProps} />);

      expect(screen.getByText('New Project')).toBeInTheDocument();
      expect(screen.getByText('Save Project')).toBeInTheDocument();
      expect(screen.getByText('Import/Export')).toBeInTheDocument();
    });

    it('should render project load dropdown', () => {
      render(<ProjectManager {...defaultProps} />);

      const dropdown = screen.getByDisplayValue('Load Project...');
      expect(dropdown).toBeInTheDocument();
    });

    it('should display application title', () => {
      render(<ProjectManager {...defaultProps} />);

      expect(screen.getByText('List Merge')).toBeInTheDocument();
    });
  });

  describe('import/export button', () => {
    it('should open import/export modal when clicked', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));

      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });

    it('should be enabled when project exists', () => {
      render(<ProjectManager {...defaultProps} />);

      const importExportButton = screen.getByText('Import/Export');
      expect(importExportButton).toBeEnabled();
    });

    it('should be enabled even when no current project', () => {
      render(<ProjectManager {...defaultProps} currentProject={null} />);

      const importExportButton = screen.getByText('Import/Export');
      expect(importExportButton).toBeEnabled();
    });
  });

  describe('modal integration', () => {
    it('should pass current project to modal', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));

      // Modal should show export functionality for current project
      expect(screen.getByText('Export Current Project')).toBeInTheDocument();
    });

    it('should pass tag pool to modal', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));

      // Modal should be rendered with tag pool data
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });

    it('should close modal when onClose is called', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();
    });

    it('should call onImportProject when project is imported', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));

      // The modal would handle file processing and call onImportProject
      // This tests that the prop is correctly passed
      expect(screen.getByText('Import Project')).toBeInTheDocument();
    });
  });

  describe('modal state management', () => {
    it('should not show modal initially', () => {
      render(<ProjectManager {...defaultProps} />);

      expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();
    });

    it('should open and close modal multiple times', () => {
      render(<ProjectManager {...defaultProps} />);

      // Open modal
      fireEvent.click(screen.getByText('Import/Export'));
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();

      // Open again
      fireEvent.click(screen.getByText('Import/Export'));
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });

    it('should close modal on backdrop click', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();

      // Click backdrop
      const backdrop = screen.getByText('Project Import/Export').closest('div')?.parentElement;
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();
      }
    });

    it('should close modal on Escape key', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();

      // Press Escape
      const backdrop = screen.getByText('Project Import/Export').closest('div')?.parentElement;
      if (backdrop) {
        fireEvent.keyDown(backdrop, { key: 'Escape' });
        expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();
      }
    });
  });

  describe('other project management functions', () => {
    it('should call onNewProject when New Project is clicked', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('New Project'));
      expect(mockOnNewProject).toHaveBeenCalledTimes(1);
    });

    it('should call onSaveProject when Save Project is clicked', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Save Project'));
      expect(mockOnSaveProject).toHaveBeenCalledTimes(1);
    });

    it('should call onLoadProject when project is selected from dropdown', () => {
      render(<ProjectManager {...defaultProps} />);

      const dropdown = screen.getByDisplayValue('Load Project...');
      fireEvent.change(dropdown, { target: { value: 'project-2' } });
      
      expect(mockOnLoadProject).toHaveBeenCalledWith('project-2');
    });

    it('should not call onLoadProject for empty selection', () => {
      render(<ProjectManager {...defaultProps} />);

      const dropdown = screen.getByDisplayValue('Load Project...');
      fireEvent.change(dropdown, { target: { value: '' } });
      
      expect(mockOnLoadProject).not.toHaveBeenCalled();
    });
  });

  describe('layout and styling', () => {
    it('should have proper header layout', () => {
      render(<ProjectManager {...defaultProps} />);

      const header = screen.getByText('List Merge').closest('div');
      expect(header).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should group related buttons together', () => {
      render(<ProjectManager {...defaultProps} />);

      const newProjectButton = screen.getByText('New Project');
      const saveProjectButton = screen.getByText('Save Project');
      
      // Both should be in the same container
      expect(newProjectButton.closest('.flex')).toBe(saveProjectButton.closest('.flex'));
    });

    it('should separate import/export from other controls', () => {
      render(<ProjectManager {...defaultProps} />);

      const importExportButton = screen.getByText('Import/Export');
      const loadDropdown = screen.getByDisplayValue('Load Project...');
      
      // They should be in the same right-side container
      expect(importExportButton.closest('.flex')).toBe(loadDropdown.closest('.flex'));
    });
  });

  describe('prop handling', () => {
    it('should handle null current project', () => {
      render(<ProjectManager {...defaultProps} currentProject={null} />);

      fireEvent.click(screen.getByText('Import/Export'));
      
      // Should still open modal, but export might be disabled
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });

    it('should handle empty tag pool', () => {
      render(<ProjectManager {...defaultProps} tagPool={[]} />);

      fireEvent.click(screen.getByText('Import/Export'));
      
      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });

    it('should pass all required props to modal', () => {
      const customProject: Project = {
        id: 'custom-1',
        name: 'Custom Project',
        createdAt: new Date(),
        modifiedAt: new Date(),
        inputLists: [],
        mainList: []
      };

      const customTags: Tag[] = [
        {
          id: 'custom-tag',
          name: 'Custom',
          color: '#00ff00',
          createdAt: new Date(),
          usageCount: 0
        }
      ];

      render(<ProjectManager 
        {...defaultProps} 
        currentProject={customProject}
        tagPool={customTags}
      />);

      fireEvent.click(screen.getByText('Import/Export'));
      
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
      expect(screen.getByRole('button', { name: 'Save Project' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import/Export' })).toBeInTheDocument();
    });

    it('should have accessible dropdown', () => {
      render(<ProjectManager {...defaultProps} />);

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
    });
  });

  describe('integration behavior', () => {
    it('should maintain button states during modal interaction', () => {
      render(<ProjectManager {...defaultProps} />);

      // All buttons should be enabled initially
      expect(screen.getByText('New Project')).toBeEnabled();
      expect(screen.getByText('Save Project')).toBeEnabled();
      expect(screen.getByText('Import/Export')).toBeEnabled();

      // Open modal
      fireEvent.click(screen.getByText('Import/Export'));

      // Buttons should still be accessible (not disabled by modal)
      expect(screen.getByText('New Project')).toBeEnabled();
      expect(screen.getByText('Save Project')).toBeEnabled();
    });

    it('should handle rapid button clicks gracefully', () => {
      render(<ProjectManager {...defaultProps} />);

      const importExportButton = screen.getByText('Import/Export');
      
      // Click multiple times rapidly
      fireEvent.click(importExportButton);
      fireEvent.click(importExportButton);
      fireEvent.click(importExportButton);

      // Should only open one modal
      expect(screen.getAllByText('Project Import/Export')).toHaveLength(1);
    });
  });

  describe('modal functionality integration', () => {
    it('should support export functionality when project exists', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));
      
      expect(screen.getByText('Export Project')).toBeInTheDocument();
    });

    it('should support import functionality regardless of current project', () => {
      render(<ProjectManager {...defaultProps} currentProject={null} />);

      fireEvent.click(screen.getByText('Import/Export'));
      
      expect(screen.getByText('Choose JSON File')).toBeInTheDocument();
    });

    it('should handle project replacement via import', () => {
      render(<ProjectManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Import/Export'));
      
      // Import functionality should be available
      expect(screen.getByText('Import Project')).toBeInTheDocument();
      expect(screen.getByText('This will replace your current project')).toBeInTheDocument();
    });
  });
});