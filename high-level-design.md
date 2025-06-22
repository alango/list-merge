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
- **Workspace**: Main three-panel layout component
- **InputListPanel**: Container for all input lists with tab interface and full tag management functionality
- **MainListPanel**: Drag-drop target for building the ranked list with inline tag management
- **TagPoolPanel**: Tag creation and management interface

### 2.2 Specialized Components
- **DraggableItem**: Reusable component for draggable list items with state management
- **SelectableItem**: Component supporting multi-select functionality with SelectionManager integration
- **DropZone**: Designated areas that accept dropped items
- **TagChip**: Individual tag display component with hover remove actions and color display
- **TagInput**: Inline tag autocomplete and creation component with fuzzy matching
- **TagCreationDialog**: Modal for creating new tags with color picker and duplicate validation
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
│   │   │   └── DraggableItem[] (with greyed-out state, tag display, and inline tag management)
│   │   └── AddListButton
│   ├── MainListPanel
│   │   ├── DropZone
│   │   ├── SelectableItem[] (with multi-select and inline tag management)
│   │   │   ├── TagChip[] (with hover remove actions)
│   │   │   └── TagInput (when adding tags)
│   │   ├── SelectionIndicator
│   │   └── BulkActionBar
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

### 3.1 Tag Management System

#### 3.1.1 Tag Service Architecture
```typescript
class TagService {
  private tags: Map<string, Tag> = new Map();
  
  // Core tag operations
  createTag(name: string, color: string): Tag | null; // Returns null if duplicate
  updateTag(id: string, updates: Partial<Tag>): boolean;
  deleteTag(id: string): boolean;
  
  // Tag queries and validation
  getAllTags(): Tag[];
  findTagByName(name: string): Tag | null;
  isTagNameAvailable(name: string): boolean;
  
  // Auto-suggestion functionality
  getSuggestedTags(query: string): Tag[]; // Fuzzy match + usage frequency
  incrementTagUsage(tagId: string): void;
  
  // Color management
  generateDefaultColor(): string; // Auto-assign colors for new tags
  validateColor(color: string): boolean;
}
```

#### 3.1.2 Tag Validation Rules
- **Name Uniqueness**: Case-insensitive duplicate prevention within project
- **Name Length**: 1-50 characters, trimmed whitespace
- **Color Format**: Hex color codes (#RRGGBB) with validation
- **Reserved Names**: Source list names cannot be used as custom tag names

#### 3.1.3 Auto-Suggestion Algorithm
```typescript
interface TagSuggestion {
  tag: Tag;
  relevanceScore: number; // Combination of fuzzy match + usage frequency
}

// Suggestion ranking factors:
// 1. Fuzzy string matching score (primary)
// 2. Usage frequency (secondary) 
// 3. Recent usage (tertiary)
// 4. Exact match boost (highest priority)
```

### 3.2 Multi-Select System

#### 3.2.1 Selection Manager Service
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

#### 3.2.2 Selection Modes
- **Single Select**: Click to select single item
- **Multi-Select Toggle**: Ctrl+Click to toggle individual items
- **Range Select**: Shift+Click to select range from anchor to clicked item
- **Select All**: Ctrl+A to select all items in current context
- **Lasso Select**: Optional drag-to-select multiple items

#### 3.2.3 Visual Selection Feedback
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
  tags: string[]; // Tags associated with this item
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
  color: string; // Required for visual organization
  createdAt: Date;
  usageCount: number; // For auto-suggestion ordering
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

## 4. Component Communication

### 4.1 Communication Architecture

#### 4.1.1 Event System
```typescript
interface ComponentEvent<T = any> {
  type: string;
  source: string;
  target?: string;
  data: T;
  timestamp: Date;
}

class EventBus {
  private listeners: Map<string, Set<(event: ComponentEvent) => void>> = new Map();
  
  // Event subscription
  subscribe<T>(eventType: string, handler: (event: ComponentEvent<T>) => void): () => void;
  unsubscribe(eventType: string, handler: Function): void;
  
  // Event emission
  emit<T>(eventType: string, data: T, source: string, target?: string): void;
  
  // Scoped events for component isolation
  createScope(scopeId: string): ScopedEventBus;
}
```

#### 4.1.2 Cross-Panel Communication Patterns
```typescript
// Selection synchronization across panels
interface SelectionEvent {
  selectedItems: string[];
  selectionType: 'main-list' | 'input-list';
  source: 'user-interaction' | 'programmatic';
}

// Tag operation coordination
interface TagOperationEvent {
  operation: 'ADD' | 'REMOVE' | 'UPDATE';
  itemIds: string[];
  tagIds: string[];
  success: boolean;
  errors?: string[];
}

// Drag and drop coordination
interface DragEvent {
  phase: 'start' | 'over' | 'end' | 'cancel';
  itemId: string;
  sourceType: 'input-list' | 'main-list' | 'tag-pool';
  targetType?: 'input-list' | 'main-list' | 'tag-pool';
  data: any;
}
```

### 4.2 Panel Communication Patterns

#### 4.2.1 Inline Tag Management Integration
- **Real-time Synchronization**: Tag changes in main list items immediately update tag pool usage counts
- **Auto-suggestion Coordination**: Inline tag inputs receive live suggestions from tag pool
- **Validation Feedback**: Immediate validation of tag names and duplicate prevention
- **State Consistency**: Tag creation automatically updates both tag pool and item tags

```typescript
// Inline tag management coordination
interface TagManagementEvent {
  itemId: string;
  operation: 'ADD_TAG' | 'REMOVE_TAG' | 'CREATE_AND_ADD';
  tagId?: string;
  tagData?: { name: string; color: string };
  success: boolean;
}

// Tag input components coordinate with tag pool for suggestions
const handleTagCreation = (name: string, color: string) => {
  const newTagId = createTag(name, color);
  if (newTagId) {
    addTagToItem(itemId, newTagId);
    updateTagPoolUsage(newTagId);
  }
};
```

#### 4.2.2 Tag Pool Integration
- **Tag Usage Updates**: Real-time updates when tags are applied/removed
- **Color Synchronization**: Immediate color changes reflected across all components
- **Auto-suggestion Coordination**: Tag input components receive live suggestions
- **Bulk Operation Feedback**: Progress and completion status for multi-select operations

### 4.3 State Synchronization Mechanisms

#### 4.3.1 Optimistic Updates
```typescript
interface OptimisticUpdate<T> {
  id: string;
  operation: string;
  optimisticData: T;
  rollbackData: T;
  confirmed: boolean;
}

class OptimisticUpdateManager {
  private pendingUpdates: Map<string, OptimisticUpdate<any>> = new Map();
  
  // Apply optimistic update immediately
  applyOptimistic<T>(id: string, operation: string, data: T, rollback: T): void;
  
  // Confirm or rollback based on operation result
  confirmUpdate(id: string): void;
  rollbackUpdate(id: string): void;
  
  // Bulk operations support
  applyBulkOptimistic(updates: OptimisticUpdate<any>[]): void;
}
```

#### 4.3.2 Conflict Resolution
- **Last-Writer-Wins**: Simple conflict resolution for most operations
- **User Confirmation**: Prompt user for conflicts that can't be auto-resolved
- **Merge Strategies**: Intelligent merging for compatible concurrent changes
- **Rollback Coordination**: Coordinated rollback when operations fail

### 4.4 Command Coordination

#### 4.4.1 Undo/Redo Communication
```typescript
interface CommandCoordinator {
  // Command execution with component coordination
  executeCommand(command: UndoableAction): Promise<void>;
  
  // Undo with affected component notification
  undoCommand(commandId: string): Promise<void>;
  
  // Redo with state synchronization
  redoCommand(commandId: string): Promise<void>;
  
  // Bulk command coordination
  executeBulkCommands(commands: UndoableAction[]): Promise<void>;
}

// Components register for command lifecycle events
eventBus.subscribe('COMMAND_EXECUTED', (event) => {
  // Update component state based on command execution
});

eventBus.subscribe('COMMAND_UNDONE', (event) => {
  // Revert component changes
});
```

#### 4.4.2 Bulk Operation Coordination
- **Progress Tracking**: Real-time progress updates for long-running operations
- **Partial Success Handling**: Graceful handling when some operations succeed/fail
- **User Feedback**: Loading states and completion notifications
- **Cancellation Support**: Ability to cancel long-running bulk operations

### 4.5 Error Propagation and Handling

#### 4.5.1 Error Communication Channels
```typescript
interface ComponentError {
  id: string;
  component: string;
  type: 'validation' | 'operation' | 'system';
  message: string;
  details?: any;
  recoverable: boolean;
}

class ErrorCoordinator {
  // Error reporting from components
  reportError(error: ComponentError): void;
  
  // Error subscription for interested components
  subscribeToErrors(filter: (error: ComponentError) => boolean, handler: (error: ComponentError) => void): void;
  
  // Recovery action coordination
  triggerRecovery(errorId: string, recoveryAction: string): void;
}
```

#### 4.5.2 User Feedback Coordination
- **Toast Notifications**: Centralized toast management for operation feedback
- **Error Boundaries**: Graceful degradation with user-friendly fallbacks
- **Validation Feedback**: Real-time validation with clear error messaging
- **Recovery Suggestions**: Actionable suggestions for error resolution

### 4.6 Performance Communication

#### 4.6.1 Debounced Operations Coordination
```typescript
class DebounceCoordinator {
  private debouncedOperations: Map<string, NodeJS.Timeout> = new Map();
  
  // Coordinate debounced updates across components
  scheduleUpdate(operationId: string, operation: () => void, delay: number): void;
  
  // Cancel pending operations when components unmount
  cancelOperation(operationId: string): void;
  
  // Force immediate execution of pending operations
  flushOperation(operationId: string): void;
}
```

#### 4.6.2 Virtual Scrolling Communication
- **Viewport Coordination**: Components notify scrolling containers of size changes
- **Item Measurement**: Dynamic height calculation communication
- **Focus Management**: Keyboard navigation across virtualized lists
- **Render Optimization**: Coordinate which items are actually rendered

### 4.7 Testing Communication Patterns

#### 4.7.1 Component Communication Testing
```typescript
// Test utilities for component communication
class CommunicationTestHelper {
  // Mock event bus for isolated testing
  createMockEventBus(): EventBus;
  
  // Verify event emissions
  expectEventEmitted(eventType: string, data?: any): void;
  
  // Simulate cross-component interactions
  simulateSelectionChange(items: string[]): void;
  simulateTagOperation(operation: TagOperationEvent): void;
  
  // Test error propagation
  simulateError(error: ComponentError): void;
}
```

## 5. Data Flow and Storage

### 5.1 Data Persistence Strategy
- **Automatic Saves**: Debounced saves after state changes
- **Storage Keys**: Structured key naming for easy data retrieval
- **Data Versioning**: Schema versioning for future compatibility
- **Storage Limits**: Monitoring and handling of localStorage quotas

### 5.2 File Import/Export Flow
```
Import Flow:
File Selection → File Parsing → Data Validation → State Update

Export Flow:
State Extraction → Format Conversion → File Generation → Download
```

### 5.3 Storage Schema
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

## 6. Drag and Drop Implementation

### 6.1 DnD Architecture
- **@dnd-kit/core**: Primary drag-and-drop library
- **Multiple Drop Zones**: Input lists and main list as drop targets
- **Visual Feedback**: Custom drag overlays and drop indicators
- **Accessibility**: Keyboard navigation and screen reader support

### 6.2 Drag Operations
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

## 7. Tag Management Implementation

### 7.1 Tag Creation Workflow
```typescript
// Tag creation with validation
interface CreateTagRequest {
  name: string;
  color?: string; // Optional, auto-generated if not provided
}

interface CreateTagResponse {
  success: boolean;
  tag?: Tag;
  error?: 'DUPLICATE_NAME' | 'INVALID_COLOR' | 'INVALID_NAME';
}
```

### 7.2 Autocomplete Integration
- **Input Components**: TagEditor and bulk tagging interfaces include autocomplete
- **Debounced Search**: 300ms delay for real-time suggestions without performance impact
- **Keyboard Navigation**: Arrow keys for suggestion navigation, Enter to select, Escape to dismiss
- **Visual Feedback**: Highlighted matching text in suggestions, tag colors preview

### 7.3 Tag Color System
- **Default Palette**: Predefined set of accessible, distinct colors
- **Custom Colors**: Color picker with validation for accessibility contrast
- **Auto-Assignment**: New tags automatically assigned colors from unused palette
- **Color Persistence**: Tag colors maintained across sessions and export/import

## 8. Inline Tag Management Implementation

### 8.1 Tag Display and Interaction
```typescript
interface TagChipProps {
  tag: Tag;
  onRemove: (tagId: string) => void;
  isHoverable?: boolean;
}

const TagChip: React.FC<TagChipProps> = ({ tag, onRemove, isHoverable = true }) => (
  <span className="group/tag relative inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: tag.color }}>
    {tag.name}
    {isHoverable && (
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(tag.id); }}
        className="absolute -top-1 -right-1 opacity-0 group-hover/tag:opacity-100 
                   hover:bg-black hover:bg-opacity-40 rounded-full w-4 h-4 
                   flex items-center justify-center text-xs transition-opacity bg-gray-600"
        title="Remove tag"
      >
        ×
      </button>
    )}
  </span>
);
```

### 8.2 Inline Tag Input Component
```typescript
interface TagInputProps {
  availableTags: Tag[];
  onAddTag: (tagId: string) => void;
  onCreateAndAddTag: (name: string, color: string) => void;
  onClose: () => void;
}

// Features:
// - Fuzzy search autocomplete with ranking by relevance and usage
// - Real-time tag creation with automatic application to current item
// - Keyboard navigation (Arrow keys, Enter, Escape)
// - Click outside to close
// - Automatic focus on mount
```

### 8.3 Tag Management Workflow Integration
- **Contextual Creation**: Tags created inline are immediately applied to the current item
- **Smart Defaults**: New tags get auto-assigned colors from the default palette
- **Multi-select Awareness**: Add tag UI hidden when multiple items are selected to prevent confusion
- **Consistent Validation**: Same duplicate prevention and validation as tag pool creation
- **Usage Tracking**: Tag usage counts updated automatically for autocomplete ranking
- **Bidirectional Synchronization**: Tags added to items in either input lists or main list are automatically synchronized using shared item IDs
- **Input List Integration**: Full tag management functionality available on input list items with feature parity to main list items

### 8.4 Performance Optimizations
- **Debounced Search**: 300ms delay for autocomplete to prevent excessive filtering
- **Memoized Suggestions**: Fuzzy matching results cached based on query and available tags
- **Event Bubbling**: Proper event handling to prevent conflicts with item selection
- **Minimal Re-renders**: Tag state changes isolated to prevent unnecessary component updates

## 9. File Processing

### 9.1 Supported Import Formats
- **CSV**: Single-row format where all entries are comma-separated values in one row
- **Plain Text**: Line-by-line format with each entry on a new line, empty lines ignored
- **JSON**: Application's export format containing complete project data with ranked lists and tags

### 9.2 Export Format
- **JSON**: Complete project export including all input lists, main ranked list, tags, and metadata
- **Structured Data**: Full project backup containing all user work
- **Reimport Capability**: Exported files can be imported to restore complete project state

## 10. Performance Considerations

### 10.1 Optimization Strategies
- **Virtual Scrolling**: For large lists (>1000 items)
- **Memoization**: React.memo for expensive components
- **Debounced Updates**: Prevent excessive re-renders during typing
- **Lazy Loading**: Code splitting for non-critical features

### 10.2 Memory Management
- **Cleanup**: Proper cleanup of event listeners and timers
- **Storage Monitoring**: Track localStorage usage
- **Garbage Collection**: Avoid memory leaks in drag operations

## 11. Error Handling

### 11.1 Error Boundaries
- **Component-Level**: Isolate errors to prevent full app crashes
- **Fallback UI**: User-friendly error displays
- **Error Reporting**: Console logging for debugging

### 11.2 Data Validation
- **Import Validation**: Schema validation for imported data
- **Storage Validation**: Corruption detection for stored data
- **User Input**: Client-side validation with clear error messages

## 12. Testing Strategy

### 12.1 Testing Approach
- **Unit Tests**: Jest for utility functions and reducers
- **Component Tests**: React Testing Library for UI components
- **Integration Tests**: E2E testing for critical user flows
- **Manual Testing**: Cross-browser compatibility testing

### 12.2 Test Coverage Areas
- **Drag and Drop**: Comprehensive testing of DnD interactions
- **Data Persistence**: LocalStorage operations and data integrity
- **File Processing**: Import/export functionality
- **State Management**: Reducer logic and state transitions

## 13. Deployment and Build

### 13.1 Build Configuration
- **Vite Configuration**: Optimized for production builds
- **Asset Optimization**: Image and CSS optimization
- **Bundle Analysis**: Monitoring bundle size and dependencies
- **Environment Variables**: Configuration for different environments

### 13.2 Deployment Options
- **Static Hosting**: Netlify, Vercel, or GitHub Pages
- **CDN Distribution**: Fast global content delivery
- **Progressive Web App**: PWA features for offline usage
- **Browser Compatibility**: Support for modern browsers (ES2020+)

## 14. Future Extensibility

### 14.1 Potential Enhancements
- **Cloud Sync**: Optional cloud storage integration
- **Collaboration**: Real-time collaborative editing
- **Advanced Filtering**: Complex query-based filtering
- **Plugin System**: Extensible architecture for custom features
- **Mobile App**: React Native version for mobile devices

### 14.2 Architecture Considerations
- **Modular Design**: Easy addition of new features
- **API Abstraction**: Storage layer abstraction for future backends
- **Configuration System**: Feature flags and user preferences
- **Internationalization**: Multi-language support preparation
