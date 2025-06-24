import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProjectImportExportModal } from '../components/ProjectImportExportModal';
import type { Project, Tag } from '../types/index';

describe('ProjectImportExportModal', () => {
  const mockOnClose = vi.fn();
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

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock URL.createObjectURL and related APIs for export functionality
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement and related DOM APIs
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {},
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      removeAttribute: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ProjectImportExportModal
          isOpen={false}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      expect(screen.queryByText('Project Import/Export')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      expect(screen.getByText('Project Import/Export')).toBeInTheDocument();
    });

    it('should show export and import options by default', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      expect(screen.getByText('Export Current Project')).toBeInTheDocument();
      expect(screen.getByText('Import Project')).toBeInTheDocument();
      expect(screen.getByText('Export Project')).toBeInTheDocument();
      expect(screen.getByText('Choose JSON File')).toBeInTheDocument();
    });

    it('should disable export button when no current project', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={null}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      const exportButton = screen.getByText('Export Project');
      expect(exportButton).toBeDisabled();
    });
  });

  describe('modal interactions', () => {
    it('should close when Close button is clicked', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      fireEvent.click(screen.getByText('Close'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close when backdrop is clicked', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      // Find the backdrop element
      const backdropElements = document.querySelectorAll('[class*="fixed inset-0"]');
      const backdrop = backdropElements[0] as HTMLElement;
      
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('file input', () => {
    it('should have file input for JSON files', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      expect(fileInput).toHaveAttribute('accept', '.json');
    });

    it('should be hidden from view', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveClass('hidden');
    });
  });

  describe('button functionality', () => {
    it('should trigger file dialog when Choose JSON File is clicked', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      const chooseFileButton = screen.getByText('Choose JSON File');
      expect(chooseFileButton).toBeInTheDocument();
      
      // Should be able to click without error
      fireEvent.click(chooseFileButton);
    });

    it('should be able to click export button when project exists', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      const exportButton = screen.getByText('Export Project');
      expect(exportButton).toBeEnabled();
      
      // Should be able to click without error (though it might fail due to missing mocks)
      fireEvent.click(exportButton);
    });
  });

  describe('content sections', () => {
    it('should display export description', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      expect(screen.getByText('Download your current project as a JSON file for backup or sharing.')).toBeInTheDocument();
    });

    it('should display import description', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      expect(screen.getByText('Import a project from a JSON file. This will replace your current project.')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Project Import/Export');
    });

    it('should have accessible buttons', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      expect(screen.getByRole('button', { name: 'Export Project' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Choose JSON File' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('prop handling', () => {
    it('should handle null current project gracefully', () => {
      expect(() => {
        render(
          <ProjectImportExportModal
            isOpen={true}
            currentProject={null}
            tagPool={sampleTags}
            onClose={mockOnClose}
            onImportProject={mockOnImportProject}
          />
        );
      }).not.toThrow();
    });

    it('should handle empty tag pool', () => {
      expect(() => {
        render(
          <ProjectImportExportModal
            isOpen={true}
            currentProject={sampleProject}
            tagPool={[]}
            onClose={mockOnClose}
            onImportProject={mockOnImportProject}
          />
        );
      }).not.toThrow();
    });
  });

  describe('modal structure', () => {
    it('should have proper modal structure', () => {
      render(
        <ProjectImportExportModal
          isOpen={true}
          currentProject={sampleProject}
          tagPool={sampleTags}
          onClose={mockOnClose}
          onImportProject={mockOnImportProject}
        />
      );

      // Should have modal backdrop
      const backdrop = document.querySelector('[class*="fixed inset-0"]');
      expect(backdrop).toBeTruthy();

      // Should have modal content
      const modalContent = screen.getByText('Project Import/Export').closest('div');
      expect(modalContent).toBeTruthy();
    });
  });
});