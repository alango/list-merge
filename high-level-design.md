# List Combiner - High Level Design Document

## 1. Architecture Overview

### 1.1 Technology Stack
- **Frontend Framework**: React 18+ with TypeScript for type safety and maintainability
- **Styling**: Tailwind CSS for rapid UI development and consistent design system
- **Drag and Drop**: @dnd-kit/core library for accessible, performant drag-and-drop functionality
- **State Management**: React Context API with useReducer for complex state management
- **File Processing**: Papaparse for CSV handling, native JSON parsing for JSON files
- **Storage**: Browser LocalStorage API with structured data serialization
- **Build Tool**: Vite for fast development and optimized production builds

### 1.2 Application Architecture
```
┌─────────────────────────────────────────┐
│                UI Layer                 │
│  ┌─────────────┬─────────────────────┐  │
│  │  Components │  Drag & Drop System │  │
│  └─────────────┴─────────────────────┘  │
├─────────────────────────────────────────┤
│            State Management             │
│  ┌─────────────┬─────────────────────┐  │
│  │   Context   │     Reducers        │  │
│  └─────────────┴─────────────────────┘  │
├─────────────────────────────────────────┤
│             Service Layer               │
│  ┌─────────────┬─────────────────────┐  │
│  │   Storage   │   File Processing   │  │
│  └─────────────┴─────────────────────┘  │
├─────────────────────────────────────────┤
│              Data Layer                 │
│  ┌─────────────────────────────────────┐ │
│  │        Browser LocalStorage         │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 2. Component Architecture

### 2.1 Core Components
- **App**: Root component managing global state and routing
- **ProjectManager**: Handles project creation, loading, and saving
- **Workspace**: Main four-panel layout component
- **InputListPanel**: Container for all input lists with tab interface
- **MainListPanel**: Drag-drop target for building the ranked list
- **PropertiesPanel**: Item details and tag management interface
- **TagPoolPanel**: Tag creation and management interface

### 2.2 Specialized Components
- **DraggableItem**: Reusable component for draggable list items with state management
- **SelectableItem**: Component supporting multi-select functionality with SelectionManager integration
- **DropZone**: Designated areas that accept dropped items
- **TagChip**: Individual tag display component with drag capability
- **TagEditor**: Interface for managing item tags
- **FileImporter**: Handles file selection and parsing for supported formats
- **ExportDialog**: Modal for export functionality
- **UndoRedoControls**: Toolbar component with undo/redo buttons and keyboard shortcut handling
- **BulkActionBar**: Context-sensitive toolbar for multi-select operations
- **SelectionIndicator**: Visual feedback component for selection state and count

### 2.3 Component Hierarchy
```
App
├── UndoRedoControls
├── ProjectManager
├── Workspace
│   ├── InputListPanel
│   │   ├── ListTabs
│   │   ├── InputList[]
│   │   │   └── DraggableItem[] (with greyed-out state)
│   │   └── AddListButton
│   ├── MainListPanel
│   │   ├── DropZone
│   │   ├── SelectableItem[] (with multi-select)
│   │   ├── SelectionIndicator
│   │   └── BulkActionBar
│   ├── PropertiesPanel
│   │   ├── ItemDetails
│   │   ├── TagEditor
│   │   └── SourceInfo
│   └── TagPoolPanel
│       ├── TagCreator
│       ├── TagChip[] (draggable)
│       └── BulkTagActions
└── ExportDialog
```

## 3. State Management

### 3.0 Undo/Redo System

#### 3.0.1 Action History Management
- **Command Pattern**: Each user action is encapsulated as a reversible command
- **History Stack**: Maintain separate undo and redo stacks with configurable size limits
- **Action Serialization**: Actions are serializable for potential persistence across sessions
- **Automatic Cleanup**: Old actions are removed when history exceeds maximum size

#### 3.0.2 Undoable Actions
```typescript
interface UndoableAction {
  execute(): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  merge(other: UndoableAction): UndoableAction | null; // For combining similar actions
}

// Examples of undoable actions:
// - AddItemToMainListAction
// - RemoveItemFromMainListAction
// - ReorderMainListAction
// - BulkTagOperationAction
// - CreateInputListAction
```

#### 3.0.3 History Integration
- **Keyboard Shortcuts**: Ctrl+Z (undo) and Ctrl+Y/Ctrl+Shift+Z (redo)
- **UI Controls**: Undo/redo buttons with disabled states when not available
- **Action Grouping**: Related actions can be grouped for single undo operation
- **History Persistence**: Optional persistence of action history in localStorage

### 3.1 Multi-Select System

#### 3.1.1 Selection Manager Service
```typescript
class SelectionManager {
  private state: SelectionManagerState;
  
  // Core selection methods
  selectItem(itemId: string, mode: 'single' | 'toggle' | 'range'): void;
  selectAll(listType: 'main-list' | 'input-list'): void;
  clearSelection(): void;
  
  // Selection queries
  getSelectedItems(): string[];
  isSelected(itemId: string): boolean;
  getSelectionCount(): number;
  
  // Bulk operations
  applyBulkOperation(operation: BulkOperation): void;
  canApplyBulkOperation(operation: BulkOperation): boolean;
}
```

#### 3.1.2 Selection Modes
- **Single Select**: Click to select single item
- **Multi-Select Toggle**: Ctrl+Click to toggle individual items
- **Range Select**: Shift+Click to select range from anchor to clicked item
- **Select All**: Ctrl+A to select all items in current context
- **Lasso Select**: Optional drag-to-select multiple items

#### 3.1.3 Visual Selection Feedback
- **Selected State**: Visual highlight for selected items
- **Selection Count**: Display count of selected items
- **Bulk Action Bar**: Context-sensitive toolbar for bulk operations
- **Multi-Select Indicators**: Visual cues when in multi-select mode

### 3.1 Global State Structure
```typescript
interface AppState {
  currentProject: Project | null;
  savedProjects: ProjectSummary[];
  tagPool: Tag[];
  actionHistory: ActionHistoryState;
  ui: {
    selectedItems: string[];
    activeInputList: string | null;
    dragState: DragState;
    selectionManager: SelectionManagerState;
  };
}

interface ActionHistoryState {
  undoStack: Action[];
  redoStack: Action[];
  maxHistorySize: number; // Default: 50
}

interface SelectionManagerState {
  selectedItems: string[];
  isMultiSelectMode: boolean;
  selectionType: 'main-list' | 'input-list' | null;
  lastSelectedItem: string | null;
  anchorItem: string | null; // For shift-click selection
}

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  inputLists: InputList[];
  mainList: MainListItem[];
}

interface InputList {
  id: string;
  name: string;
  items: InputListItem[];
}

interface InputListItem {
  id: string;
  content: string;
  isUsed: boolean; // For greying out used items
}

interface MainListItem {
  id: string;
  content: string;
  sourceListId: string;
  tags: string[];
  order: number;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface Action {
  id: string;
  type: ActionType;
  timestamp: Date;
  data: any;
  description: string;
}

type ActionType = 
  | 'ADD_ITEM_TO_MAIN_LIST'
  | 'REMOVE_ITEM_FROM_MAIN_LIST'
  | 'REORDER_MAIN_LIST'
  | 'ADD_TAG_TO_ITEM'
  | 'REMOVE_TAG_FROM_ITEM'
  | 'BULK_TAG_OPERATION'
  | 'CREATE_INPUT_LIST'
  | 'DELETE_INPUT_LIST'
  | 'RENAME_INPUT_LIST'
  | 'IMPORT_ITEMS';
```

### 3.2 State Management Pattern
- **Context Provider**: Single provider at app root for global state
- **Reducer Pattern**: Complex state updates handled by reducers
- **Local State**: Component-level state for UI-only concerns
- **Derived State**: Computed values using useMemo for performance
- **Action History**: Command pattern for undo/redo functionality
- **Selection Manager**: Centralized multi-select state management

## 4. Data Flow and Storage

### 4.1 Data Persistence Strategy
- **Automatic Saves**: Debounced saves after state changes
- **Storage Keys**: Structured key naming for easy data retrieval
- **Data Versioning**: Schema versioning for future compatibility
- **Storage Limits**: Monitoring and handling of localStorage quotas

### 4.2 File Import/Export Flow
```
Import Flow:
File Selection → File Parsing → Data Validation → State Update

Export Flow:
State Extraction → Format Conversion → File Generation → Download
```

### 4.3 Storage Schema
```typescript
// LocalStorage Keys
const STORAGE_KEYS = {
  PROJECTS: 'listCombiner_projects',
  CURRENT_PROJECT: 'listCombiner_currentProject',
  APP_SETTINGS: 'listCombiner_settings'
};

// Storage Structure
interface StoredData {
  version: string;
  projects: Record<string, Project>;
  settings: AppSettings;
}
```

## 5. Drag and Drop Implementation

### 5.1 DnD Architecture
- **@dnd-kit/core**: Primary drag-and-drop library
- **Multiple Drop Zones**: Input lists and main list as drop targets
- **Visual Feedback**: Custom drag overlays and drop indicators
- **Accessibility**: Keyboard navigation and screen reader support

### 5.2 Drag Operations
```typescript
interface DragEndEvent {
  active: { id: string; data: DragData };
  over: { id: string; data: DropData } | null;
}

interface DragData {
  type: 'input-item' | 'main-item' | 'tag';
  content: string;
  sourceId: string;
  isUsed?: boolean; // For input items
}

// Multi-select support for bulk operations integrated with SelectionManager
interface BulkOperation {
  type: 'ADD_TAGS' | 'REMOVE_TAGS' | 'DELETE_ITEMS' | 'REORDER_ITEMS';
  itemIds: string[];
  data: any;
}
```

## 6. File Processing

### 6.1 Supported Import Formats
- **CSV**: Single-row format where all entries are comma-separated values in one row
- **Plain Text**: Line-by-line format with each entry on a new line, empty lines ignored
- **JSON**: Application's export format containing complete project data with ranked lists and tags

### 6.2 Export Format
- **JSON**: Complete project export including all input lists, main ranked list, tags, and metadata
- **Structured Data**: Full project backup containing all user work
- **Reimport Capability**: Exported files can be imported to restore complete project state

## 7. Performance Considerations

### 7.1 Optimization Strategies
- **Virtual Scrolling**: For large lists (>1000 items)
- **Memoization**: React.memo for expensive components
- **Debounced Updates**: Prevent excessive re-renders during typing
- **Lazy Loading**: Code splitting for non-critical features

### 7.2 Memory Management
- **Cleanup**: Proper cleanup of event listeners and timers
- **Storage Monitoring**: Track localStorage usage
- **Garbage Collection**: Avoid memory leaks in drag operations

## 8. Error Handling

### 8.1 Error Boundaries
- **Component-Level**: Isolate errors to prevent full app crashes
- **Fallback UI**: User-friendly error displays
- **Error Reporting**: Console logging for debugging

### 8.2 Data Validation
- **Import Validation**: Schema validation for imported data
- **Storage Validation**: Corruption detection for stored data
- **User Input**: Client-side validation with clear error messages

## 9. Testing Strategy

### 9.1 Testing Approach
- **Unit Tests**: Jest for utility functions and reducers
- **Component Tests**: React Testing Library for UI components
- **Integration Tests**: E2E testing for critical user flows
- **Manual Testing**: Cross-browser compatibility testing

### 9.2 Test Coverage Areas
- **Drag and Drop**: Comprehensive testing of DnD interactions
- **Data Persistence**: LocalStorage operations and data integrity
- **File Processing**: Import/export functionality
- **State Management**: Reducer logic and state transitions

## 10. Deployment and Build

### 10.1 Build Configuration
- **Vite Configuration**: Optimized for production builds
- **Asset Optimization**: Image and CSS optimization
- **Bundle Analysis**: Monitoring bundle size and dependencies
- **Environment Variables**: Configuration for different environments

### 10.2 Deployment Options
- **Static Hosting**: Netlify, Vercel, or GitHub Pages
- **CDN Distribution**: Fast global content delivery
- **Progressive Web App**: PWA features for offline usage
- **Browser Compatibility**: Support for modern browsers (ES2020+)

## 11. Future Extensibility

### 11.1 Potential Enhancements
- **Cloud Sync**: Optional cloud storage integration
- **Collaboration**: Real-time collaborative editing
- **Advanced Filtering**: Complex query-based filtering
- **Plugin System**: Extensible architecture for custom features
- **Mobile App**: React Native version for mobile devices

### 11.2 Architecture Considerations
- **Modular Design**: Easy addition of new features
- **API Abstraction**: Storage layer abstraction for future backends
- **Configuration System**: Feature flags and user preferences
- **Internationalization**: Multi-language support preparation
