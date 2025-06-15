// Core data types from the design document

export interface InputListItem {
  id: string;
  content: string;
  isUsed: boolean; // For greying out used items
}

export interface InputList {
  id: string;
  name: string;
  items: InputListItem[];
}

export interface MainListItem {
  id: string;
  content: string;
  sourceListId: string;
  tags: string[];
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Required for visual organization
  createdAt: Date;
  usageCount: number; // For auto-suggestion ordering
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  itemCount: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  inputLists: InputList[];
  mainList: MainListItem[];
}

export interface AppState {
  currentProject: Project | null;
  savedProjects: ProjectSummary[];
  tagPool: Tag[];
  ui: {
    selectedItems: string[];
    activeInputList: string | null;
  };
}