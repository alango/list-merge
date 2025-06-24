import React, { useState } from 'react';
import type { Project, Tag } from '../types/index';
import { ProjectImportExportModal } from './ProjectImportExportModal';

interface ProjectManagerProps {
  currentProject: Project | null;
  tagPool: Tag[];
  onNewProject: () => void;
  onLoadProject: (projectId: string) => void;
  onSaveProject: () => void;
  onImportProject: (project: Project) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  currentProject,
  tagPool,
  onNewProject,
  onLoadProject,
  onSaveProject,
  onImportProject
}) => {
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-gray-900">List Merge</h1>
        <div className="flex space-x-2">
          <button 
            onClick={onNewProject}
            className="btn-primary"
          >
            New Project
          </button>
          <button 
            onClick={onSaveProject}
            className="btn-secondary"
          >
            Save Project
          </button>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <select 
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          onChange={(e) => e.target.value && onLoadProject(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Load Project...</option>
          {/* Project options will be populated from state */}
        </select>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsImportExportModalOpen(true)}
            className="btn-secondary"
          >
            Import/Export
          </button>
        </div>
      </div>
      
      {/* Project Import/Export Modal */}
      <ProjectImportExportModal
        isOpen={isImportExportModalOpen}
        currentProject={currentProject}
        tagPool={tagPool}
        onClose={() => setIsImportExportModalOpen(false)}
        onImportProject={onImportProject}
      />
    </div>
  );
};