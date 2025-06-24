import React from 'react';
import type { ImportResult } from '../utils/fileProcessing';

interface ImportPreviewModalProps {
  isOpen: boolean;
  result: ImportResult<string[]> | null;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  result,
  fileName,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !result) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && result.success) {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Import Preview: {fileName}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {result.success ? (
            <>
              {/* Items list */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  {result.data!.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-md bg-gray-50"
                    >
                      <div className="text-sm text-gray-900 break-words">
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status bar */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-green-600 font-medium">
                    ✓ {result.itemCount} items ready to import
                  </div>
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="text-amber-600">
                      ⚠ {result.warnings.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Error display */
            <div className="flex-1 px-6 py-4">
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
                      {result.error}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          {result.success && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Import {result.itemCount} Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
};