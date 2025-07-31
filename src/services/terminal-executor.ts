import type {IPty} from 'node-pty';
import {TerminalExecutor} from '../tools/mutable-execution.js';

/**
 * Terminal executor that executes commands through the existing PTY process
 */
export class PTYTerminalExecutor implements TerminalExecutor {
	constructor(private pty: IPty) {
	}

	async executeCommand(command: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let output = '';
			let hasResolved = false;

			// Set up timeout
			const timeoutId = setTimeout(() => {
				if (!hasResolved) {
					hasResolved = true;
					reject(new Error(`Command '${command}' timed out after 30 seconds`));
				}
			}, 30000);

			// Listen for data from the PTY
			const disposable = this.pty.onData(data => {
				output += data;

				// Simple heuristic: if we see a prompt pattern, the command is likely done
				// This is not perfect but works for most commands
				if (data.includes('$ ') || data.includes('% ') || data.includes('> ')) {
					if (!hasResolved) {
						hasResolved = true;
						clearTimeout(timeoutId);
						disposable.dispose();
						resolve(output.trim());
					}
				}
			});

			// Execute the command
			this.pty.write(command + '\r');
		});
	}
}
