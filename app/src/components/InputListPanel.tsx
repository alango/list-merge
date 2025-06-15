import React from 'react';
import type { InputList } from '../types/index';

interface InputListPanelProps {
  inputLists: InputList[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onAddList: () => void;
  onImportList: (listId: string) => void;
}

export const InputListPanel: React.FC<InputListPanelProps> = ({
  inputLists,
  activeListId,
  onSelectList,
  onAddList,
  onImportList
}) => {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Input Lists</h2>
          <button 
            onClick={onAddList}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
          >
            + Add List
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* Tabs for input lists */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {inputLists.map((list) => (
            <button
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
                activeListId === list.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {list.name} ({list.items.length})
            </button>
          ))}
        </div>
        
        {/* Active list content */}
        <div className="flex-1 panel-content">
          {activeListId ? (
            <InputListContent 
              list={inputLists.find(l => l.id === activeListId)!}
              onImport={() => onImportList(activeListId)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {inputLists.length === 0 
                ? "No input lists yet. Click 'Add List' to get started."
                : "Select a list tab to view its contents."
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface InputListContentProps {
  list: InputList;
  onImport: () => void;
}

const InputListContent: React.FC<InputListContentProps> = ({ list, onImport }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">{list.name}</h3>
        <button 
          onClick={onImport}
          className="text-sm btn-secondary"
        >
          Import
        </button>
      </div>
      
      <div className="flex-1 space-y-2 overflow-y-auto">
        {list.items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No items in this list yet.
          </div>
        ) : (
          list.items.map((item) => (
            <div
              key={item.id}
              className={`p-3 border border-gray-200 rounded-md cursor-move ${
                item.isUsed 
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              {item.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
};