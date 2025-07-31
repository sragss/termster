import { ToolExecutor, ToolExecutionResult } from '../types/tools.js';
import { TerminalHistoryService } from './terminal-history.js';

export class TerminalToolExecutor implements ToolExecutor {
  constructor(private historyService: TerminalHistoryService) {}

  async execute(name: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
    switch (name) {
      case 'read_terminal_history':
        return this.readTerminalHistory(args);
      default:
        return {
          success: false,
          output: '',
          error: `Unknown tool: ${name}`
        };
    }
  }

  private async readTerminalHistory(args: Record<string, unknown>): Promise<ToolExecutionResult> {
    try {
      const count = (args['count'] as number) || 5;
      const skip = (args['skip'] as number) || 0;
      const noOutput = (args['no_output'] as boolean) || false;

      const commands = this.historyService.getRecentCommands(count, skip);
      const formattedOutput = this.historyService.formatCommandsForLLM(commands, noOutput);

      return {
        success: true,
        output: formattedOutput
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to read terminal history: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}