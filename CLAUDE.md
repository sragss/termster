# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to `dist/` directory
- **Development**: `npm run dev` - Runs TypeScript compiler in watch mode
- **Test**: `npm run test` - Runs prettier, xo linter, and ava tests
- **Individual commands**:
  - Format check: `prettier --check .`
  - Lint: `xo`
  - Run tests only: `ava`

## Architecture Overview

Termster is a terminal emulator with split-pane functionality built using React and Ink. The application creates a CLI interface with two panes: a terminal emulator and a notes section.

### Core Components

- **App (`src/app.tsx`)**: Main application component that manages global state and input handling

  - Manages PTY process for terminal interaction
  - Handles pane switching (Shift+Tab)
  - Controls input routing between terminal and notes panes
  - Implements terminal output sanitization and history management

- **TerminalPane (`src/TerminalPane.tsx`)**: Left pane displaying terminal output

  - Shows sanitized terminal output with ANSI color support
  - Visual feedback for unsupported key presses (arrow keys flash red)
  - Border color indicates active pane

- **NotesPane (`src/NotesPane.tsx`)**: Right pane for user notes

  - Simple text editor functionality
  - Supports basic text input, backspace, and enter

- **Terminal Sanitizer (`src/terminal-sanitizer.ts`)**: Core utility for processing terminal output
  - Removes problematic control characters while preserving ANSI colors
  - Handles clear screen commands, cursor positioning, and backspace sequences
  - Limits output lines to prevent memory issues

### Key Technical Details

- Uses `node-pty` for spawning and communicating with shell processes
- Terminal output is sanitized to work properly with Ink's text rendering
- PTY process configuration: 40 columns (half-width), 24 rows
- Debugging output written to `pty-debug.log` for troubleshooting
- Shell selection: `zsh` on Unix systems, `powershell.exe` on Windows

### Input Handling

- **Global**: Ctrl+C or Ctrl+D exits application
- **Shift+Tab**: Switches between terminal and notes panes
- **Terminal pane**: Input passed directly to PTY process
- **Notes pane**: Basic text editing (input, backspace, enter)
- **Unsupported**: Arrow keys are blocked in terminal (flashes error)

### Build System

- TypeScript compilation using `@sindresorhus/tsconfig`
- ESM modules (`"type": "module"`)
- Output compiled to `dist/` directory
- CLI entry point: `dist/cli.js`

## Debugging Notes

- Remember to use xterm-debug.log to see what xterm is seeing
