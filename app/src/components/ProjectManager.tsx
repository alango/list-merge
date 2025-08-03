import React, { useState } from 'react';
import type { Project, Tag } from '../types/index';
import { ProjectImportExportModal } from './ProjectImportExportModal';

interface ProjectManagerProps {
  currentProject: Project | null;
  tagPool: Tag[];
  onNewProject: () => void;
  onImportProject: (project: Project) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  currentProject,
  tagPool,
  onNewProject,
  onImportProject
}) => {
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-gray-900">List Merge</h1>
        <button 
          onClick={onNewProject}
          className="btn-primary"
        >
          New Project
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setIsImportExportModalOpen(true)}
          className="btn-secondary"
        >
          Import/Export
        </button>
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