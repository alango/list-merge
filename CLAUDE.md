# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The main application is located in the `app/` directory. All development commands should be run from this directory:

```bash
cd app/
npm run dev      # Start development server
npm run build    # Build for production (TypeScript compile + Vite build)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Project Architecture

This is a React-based list merging application that allows users to combine multiple input lists into a single ranked output list with tagging capabilities.

### Core Architecture
- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 with Vite plugin
- **Drag & Drop**: @dnd-kit/core for accessible drag-and-drop functionality
- **State Management**: React Context API with useReducer pattern
- **Storage**: Browser localStorage for data persistence
- **Build Tool**: Vite

### Component Structure
The application follows a three-panel layout managed by the main `Workspace` component:

1. **InputListPanel** (left): Manages multiple input lists with tagging support
2. **MainListPanel** (center): Primary ranked list with drag-drop and inline tag management
3. **TagPoolPanel** (right): Tag creation, management, and bulk operations

### Data Flow
- **AppState**: Global state containing current project, saved projects, tag pool, and UI state
- **Project**: Contains input lists and main ranked list
- **Tags**: Bidirectional synchronization between input list items and main list items using shared item IDs
- **Selection**: Multi-select support with keyboard shortcuts (Ctrl+click, Shift+click)

### Key Features
- **Drag & Drop**: Items can be dragged from input lists to main list
- **Tagging System**: Custom tags with colors, autocomplete, and bulk operations
- **Multi-Select**: Select multiple items for bulk tag operations
- **Import/Export**: CSV, plain text, and JSON format support
- **Local Storage**: Automatic project persistence

### File Structure
- `src/components/`: React components (Workspace, InputListPanel, MainListPanel, TagPoolPanel, ProjectManager)
- `src/types/index.ts`: TypeScript type definitions for all data structures
- Core types: `AppState`, `Project`, `InputList`, `MainListItem`, `Tag`

### Development Notes
- The app operates entirely client-side with no backend dependencies
- State changes trigger automatic saves to localStorage
- Tags are synchronized bidirectionally between input items and main list items
- Items maintain unique IDs for proper synchronization across panels