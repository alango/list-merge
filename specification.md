# Functional Specification

## 1. Overview

List Merge is a web-based application that allows users to merge multiple input lists into a single, manually ranked output list. The application operates entirely in the browser with no backend database, using local storage for persistence.

## 2. Core Features

### 2.1 Project Management
- **Create New Project**: Users can start a new list combination project
- **Save Project**: Projects are automatically saved to browser local storage
- **Load Project**: Users can load previously saved projects from a dropdown/list interface
- **Export Project**: Complete projects can be exported as files for backup or sharing
- **Import Project**: Users can import previously exported project files

### 2.2 Input List Management
- **Add Input Lists**: Users can create multiple input lists within a project
- **Import Lists**: Support for importing lists from common formats (CSV, JSON, plain text)
- **Edit List Names**: Input lists can be renamed for better organization
- **Delete Lists**: Remove input lists that are no longer needed
- **List Content**: Each input list contains multiple text-based entries

### 2.3 Main List Creation
- **Drag and Drop Interface**: Primary method for moving items from input lists to the main ranked list
- **Manual Ordering**: Items in the main list can be reordered through drag and drop
- **Visual Feedback**: Clear visual indicators during drag operations
- **Item State Management**: Items are copied (not moved) from input lists, but source items are greyed out after being added to main list to prevent duplicates
- **List Completion Status**: Input lists show visual indication when all items have been processed

### 2.4 Tagging System
- **Source Tags**: Automatically applied tags showing which input list each item originated from
- **Custom Tags**: Users can create and manage freeform text tags with customizable colors
- **Tag Pool**: Dedicated area displaying all created tags that can be dragged onto items
- **Tag Assignment**: Tags can be applied by dragging from tag pool to items or through the properties panel
- **Multi-Select Tagging**: Users can select multiple items and apply tags to all selected items simultaneously
- **Visual Tag Display**: Tags are visually distinct with customizable colors and clearly labeled on items
- **Duplicate Prevention**: System prevents creation of duplicate tag names within a project
- **Auto-Suggestion**: When adding tags to items, existing tags are suggested with autocomplete functionality
- **Tag Color Customization**: Users can assign custom colors to tags for better visual organization

### 2.5 Import and Export Functionality
- **Import Formats**: 
  - CSV files with all entries in a single row
  - Plain text files with each entry on a new line
  - JSON files in the application's export format (includes ranked list with tags)
- **Export Format**: JSON format containing complete project data including ranked list, tags, and metadata
- **Include Metadata**: Exported data includes all tags and source information
- **Project Backup**: Full project export for backup and sharing purposes

## 3. User Interface Layout

### 3.1 Main Workspace
- **Four-Panel Layout**: 
  - Left panel: Input lists
  - Center panel: Main ranked list
  - Right panel: Properties/details for selected items
  - Bottom panel: Tag pool and multi-select controls
- **Responsive Design**: Interface adapts to different screen sizes
- **Collapsible Panels**: Panels can be minimized to focus on specific areas

### 3.2 Input Lists Panel
- **Tabbed Interface**: Each input list appears as a separate tab
- **Add New List Button**: Prominent button to create additional input lists
- **Import Options**: Easy access to import functionality for each list
- **Item Count Display**: Shows number of items in each list and completion status
- **Visual States**: Items are greyed out after being added to main list
- **List Completion Indicator**: Visual indication when all items from a list have been processed

### 3.3 Main List Panel
- **Drag Drop Zone**: Clear visual indication of drop-acceptable areas
- **Ranking Numbers**: Sequential numbering of items in their ranked order
- **Tag Display**: Compact view of tags associated with each item
- **Multi-Select**: Ability to select multiple items for bulk operations
- **Reordering Controls**: Visual handles for drag-and-drop reordering

### 3.4 Properties Panel
- **Selected Item Details**: Shows information about currently selected item
- **Tag Editor**: Interface for adding, editing, and removing tags
- **Source Information**: Display of which input list the item came from
- **Item Notes**: Optional field for additional item-specific notes

## 4. User Workflows

### 4.1 Creating a New Project
1. User clicks "New Project"
2. System creates empty project with default main list
3. User can immediately start adding input lists or importing data

### 4.2 Setting Up Input Lists
1. User clicks "Add Input List"
2. System creates new empty list with default name
3. User can rename the list
4. User adds items either by:
   - Typing directly into the list
   - Importing from supported file formats (CSV single-row, plain text line-by-line, or JSON)
   - Copying and pasting from external sources

### 4.3 Building the Main List
1. User selects an item from any input list (that hasn't been added yet)
2. User drags the item to the main list panel
3. System copies the item to the main list with automatic source tagging
4. Source item in input list becomes greyed out and non-draggable
5. User can reorder items in the main list by dragging
6. User can add additional tags by:
   - Dragging tags from the tag pool onto items
   - Selecting multiple items and applying tags through bulk actions
   - Using the properties panel for individual items

### 4.4 Tag Management Workflow
1. User creates new tags in the tag pool panel with duplicate name validation and color selection
2. User can customize tag colors during creation or later through tag management interface
3. Tags can be applied to items by:
   - Dragging tags from pool to individual items
   - Selecting multiple items and choosing tags for bulk application
   - Using the properties panel with autocomplete suggestions of existing tags
   - Typing tag names with auto-suggestion dropdown showing matching existing tags
4. System maintains a master list of all created tags for reuse and prevents duplicates
5. Tags can be edited (name and color) or deleted from the tag pool
6. When typing new tag names, system provides real-time suggestions from existing tags

### 3.5 Tag Pool Panel
- **Available Tags**: Display of all created tags in the project with their custom colors
- **Create New Tag**: Interface for adding new freeform text tags with color picker and duplicate validation
- **Drag Source**: Tags can be dragged from this panel onto items in the main list
- **Tag Management**: Edit tag names and colors, delete existing tags with confirmation
- **Visual Organization**: Tags displayed with their assigned colors for easy identification
- **Multi-Select Actions**: Controls for applying tags to multiple selected items# List Merge -

### 4.5 Finalizing and Exporting
1. User reviews the completed main list
2. User selects export option
3. System generates JSON file containing complete project data
4. User can save project for future editing

### 4.6 Loading Existing Projects
1. User selects "Load Project" from menu
2. System displays list of saved projects
3. User selects desired project
4. System loads all input lists, main list, and associated metadata

## 5. Data Management

### 5.1 Data Structure
- **Projects**: Top-level containers with unique identifiers
- **Input Lists**: Named collections of text items
- **Main List**: Ordered collection of items with associated metadata
- **Items**: Text content with optional tags and source information
- **Tags**: Text labels associated with items

### 5.2 Persistence
- **Automatic Saving**: Projects are saved continuously as user makes changes
- **Local Storage**: All data stored in browser's local storage
- **Export Backup**: Users encouraged to export projects for external backup

## 6. Error Handling and Edge Cases

### 6.1 Data Validation
- **Duplicate Items**: System allows duplicates but provides visual indication
- **Empty Items**: Blank entries are prevented or filtered out
- **Invalid Imports**: Clear error messages for malformed import files

### 6.2 User Experience
- **Undo Functionality**: Recent actions can be undone
- **Confirmation Dialogs**: Destructive actions require user confirmation
- **Progress Indicators**: Long operations show progress feedback

## 7. Accessibility and Usability

### 7.1 Accessibility
- **Keyboard Navigation**: Full functionality available via keyboard
- **Screen Reader Support**: Proper labeling and semantic HTML
- **High Contrast**: Support for high contrast display modes

### 7.2 Usability
- **Intuitive Interface**: Common UI patterns and clear visual hierarchy
- **Help Documentation**: Built-in help system explaining key features
- **Error Recovery**: Clear paths to recover from mistakes or errors
