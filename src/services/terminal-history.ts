export interface TerminalCommand {
  input: string;
  output: string;
  timestamp: Date;
  exitCode?: number;
}

export class TerminalHistoryService {
  private history: TerminalCommand[] = [];
  private maxHistorySize = 100; // Keep last 100 commands

  addCommand(input: string, output: string, exitCode?: number): void {
    const command: TerminalCommand = {
      input: input.trim(),
      output: output.trim(),
      timestamp: new Date(),
      exitCode
    };

    this.history.push(command);

    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  getRecentCommands(count: number = 5, skip: number = 0): TerminalCommand[] {
    // Validate parameters
    const safeCount = Math.min(Math.max(1, count), 20);
    const safeSkip = Math.max(0, skip);

    // Get commands from the end (most recent first)
    const startIndex = Math.max(0, this.history.length - safeSkip - safeCount);
    const endIndex = Math.max(0, this.history.length - safeSkip);

    return this.history.slice(startIndex, endIndex).reverse(); // Most recent first
  }

  formatCommandsForLLM(commands: TerminalCommand[], noOutput: boolean = false): string {
    if (commands.length === 0) {
      return "No terminal commands found in history.";
    }

    const formatted = commands.map((cmd, index) => {
      const timeStr = cmd.timestamp.toLocaleTimeString();
      const exitInfo = cmd.exitCode !== undefined ? ` (exit: ${cmd.exitCode})` : '';
      
      if (noOutput) {
        return `Command ${index + 1} [${timeStr}${exitInfo}]: ${cmd.input}`;
      } else {
        return `Command ${index + 1} [${timeStr}${exitInfo}]:
Input: ${cmd.input}
Output: ${cmd.output.slice(0, 500)}${cmd.output.length > 500 ? '...[truncated]' : ''}
---`;
      }
    }).join('\n');

    return formatted;
  }

  clear(): void {
    this.history = [];
  }
}