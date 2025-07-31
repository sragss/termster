import { TERMINAL_HISTORY_TOOL, TerminalHistoryToolExecutor } from './terminal-history.js';
import { TerminalHistoryService } from '../services/terminal-history.js';
import { TermsterTool, OpenAI_FunctionTool } from './types.js';

// Export all Termster tools
export const ALL_TOOLS: TermsterTool[] = [TERMINAL_HISTORY_TOOL];

// Helper function to extract OpenAI tool definitions for API calls
export function getOpenAITools(): OpenAI_FunctionTool[] {
  return ALL_TOOLS.map(tool => tool.definition);
}

// Helper function to render a tool call
export function renderToolCall(name: string, args: Record<string, unknown>): string {
  const tool = ALL_TOOLS.find(t => t.definition.name === name);
  if (!tool) {
    return `Unknown tool: ${name}`;
  }
  return tool.render(args);
}

// Export tool executors
export { TerminalHistoryToolExecutor };

// Export shared types
export type { ToolExecutor, ToolExecutionResult } from './types.js';

// Export individual tools for direct import
export { TERMINAL_HISTORY_TOOL } from './terminal-history.js';

// Main tool registry class (replaces the old TerminalToolExecutor)
export class ToolRegistry {
  private terminalHistoryExecutor?: TerminalHistoryToolExecutor;

  constructor(historyService?: TerminalHistoryService) {
    if (historyService) {
      this.terminalHistoryExecutor = new TerminalHistoryToolExecutor(historyService);
    }
  }

  async execute(name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'read_terminal_history':
        if (!this.terminalHistoryExecutor) {
          return {
            success: false,
            output: '',
            error: 'Terminal history service not available'
          };
        }
        return this.terminalHistoryExecutor.execute(name, args);
      default:
        return {
          success: false,
          output: '',
          error: `Unknown tool: ${name}`
        };
    }
  }
}