import React, { useState, useRef } from 'react';
import type { Project, Tag } from '../types/index';
import { FileProcessor, type ImportResult } from '../utils/fileProcessing';

interface ProjectImportExportModalProps {
  isOpen: boolean;
  currentProject: Project | null;
  tagPool: Tag[];
  onClose: () => void;
  onImportProject: (project: Project) => void;
}

export const ProjectImportExportModal: React.FC<ProjectImportExportModalProps> = ({
  isOpen,
  currentProject,
  tagPool,
  onClose,
  onImportProject
}) => {
  const [importResult, setImportResult] = useState<ImportResult<Project> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleExport = () => {
    if (!currentProject) return;

    const result = FileProcessor.exportProjectJSON(currentProject, tagPool);
    
    if (result.success && result.data && result.filename) {
      // Create download
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onClose();
    } else {
      // Show error
      setImportResult({
        success: false,
        error: result.error || 'Export failed'
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const result = FileProcessor.importProjectJSON(content);
      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        error: `Failed to read file: ${(error as Error).message}`
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = () => {
    if (importResult?.success && importResult.data) {
      onImportProject(importResult.data);
      onClose();
      setImportResult(null);
    }
  };

  const handleCancelImport = () => {
    setImportResult(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Project Import/Export
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {importResult ? (
            /* Import result display */
            <div className="space-y-4">
              {importResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-green-400 text-xl">✓</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Project Ready to Import
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <div>Project: {importResult.data!.name}</div>
                        <div>Items: {importResult.itemCount}</div>
                        <div>Input Lists: {importResult.data!.inputLists.length}</div>
                        <div>Main List: {importResult.data!.mainList.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400 text-xl">✕</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Import Failed
                      </h3>
                      <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
                        {importResult.error}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Import/Export options */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Export Current Project</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Download your current project as a JSON file for backup or sharing.
                </p>
                <button
                  onClick={handleExport}
                  disabled={!currentProject}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export Project
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Import Project</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Import a project from a JSON file. This will replace your current project.
                </p>
                <button
                  onClick={handleImportClick}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Choose JSON File'}
                </button>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          {importResult ? (
            <>
              <button
                onClick={handleCancelImport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              {importResult.success && (
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Import Project
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};