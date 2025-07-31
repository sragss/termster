import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class XTermSessionLogger {
	private logBuffer: string[] = [];
	private logFile: string;
	private flushInterval: NodeJS.Timeout;
	private isInitialized = false;

	constructor() {
		// Use same log directory as other services
		const logsDir = path.join(os.homedir(), '.termster', 'logs');
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
		this.logFile = path.join(logsDir, `terminal-session-${timestamp}.log`);
		
		// Flush buffer every 2 seconds for session logging
		this.flushInterval = setInterval(() => {
			this.flush();
		}, 2000);
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			// Ensure logs directory exists
			const logsDir = path.dirname(this.logFile);
			await fs.mkdir(logsDir, { recursive: true });
			
			// Initialize log file with session header
			const sessionStart = new Date().toISOString();
			await fs.writeFile(this.logFile, `# Terminal Session - ${sessionStart}\n`);
			this.isInitialized = true;
		} catch (error) {
			console.error('Failed to initialize terminal session logger:', error);
		}
	}

	// Log terminal commands and output (like shell history)
	logCommand(command: string): void {
		if (!command.trim()) return;
		
		const timestamp = new Date().toISOString();
		this.logBuffer.push(`${timestamp} $ ${command}`);
	}

	// Log terminal output for command
	logOutput(output: string): void {
		if (!output.trim()) return;
		
		// Clean output - remove ANSI codes for clean session log
		const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
		this.logBuffer.push(cleanOutput);
	}

	// Async flush method - writes buffer to file
	private async flush(): Promise<void> {
		if (this.logBuffer.length === 0 || !this.isInitialized) return;

		const messages = [...this.logBuffer]; // Copy the buffer
		this.logBuffer.length = 0; // Clear the buffer

		try {
			const content = messages.join('\n') + '\n';
			await fs.appendFile(this.logFile, content);
		} catch (error) {
			console.error('Failed to flush terminal session log buffer:', error);
			// Re-add messages to buffer on failure (simple retry)
			this.logBuffer.unshift(...messages);
		}
	}

	// Clean shutdown - flush remaining logs
	async shutdown(): Promise<void> {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
		}
		await this.flush();
	}

	// Get current log file path for debugging
	getLogPath(): string {
		return this.logFile;
	}
}

// Singleton instance
export const xtermSessionLogger = new XTermSessionLogger();