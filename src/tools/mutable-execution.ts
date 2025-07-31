import {TermsterTool} from './types.js';
import {ToolExecutor, ToolExecutionResult} from './terminal-history.js';
import {Logger} from '../services/logger.js';

// Maximum characters to include in LLM context (most recent output)
const MAX_COMMAND_OUTPUT_LENGTH = 500;

// Interface for terminal command execution
export interface TerminalExecutor {
	executeCommand(command: string): Promise<string>;
}

// Enhanced Termster Tool Definition for Mutable Execution
export const MUTABLE_EXECUTION_TOOL: TermsterTool = {
	definition: {
		type: 'function',
		name: 'execute_mutable_command',
		description:
			'Executes commands that may mutate the terminal or system state. Use this for commands like file creation, deletion, system changes, installations, etc. This tool requires user approval before execution.',
		strict: false,
		parameters: {
			type: 'object',
			properties: {
				command: {
					type: 'string',
					description:
						'The shell command to execute (e.g., "npm install", "rm file.txt", "git commit -m \\"message\\"")',
				},
				reason: {
					type: 'string',
					description:
						'Brief explanation of why this command needs to be run and what it will do',
				},
			},
			required: ['command', 'reason'],
			additionalProperties: false,
		},
	},
	requires_approval: true, // This tool requires user approval
	render: args => {
		const command = args['command'] as string;
		const reason = args['reason'] as string;

		return `Execute(${command}) → ${reason}`;
	},
	render_approval: args => {
		const command = args['command'] as string;
		const reason = args['reason'] as string;

		return `Execute '${command}'? (${reason}) [Enter=Yes, Esc=No]`;
	},
};

// Tool Executor Implementation
export class MutableExecutionToolExecutor implements ToolExecutor {
	constructor(private terminalExecutor?: TerminalExecutor) {
	}

	async execute(
		name: string,
		args: Record<string, unknown>,
	): Promise<ToolExecutionResult> {
		switch (name) {
			case 'execute_mutable_command':
				return this.executeMutableCommand(args);
			default:
				return {
					success: false,
					output: '',
					error: `Unknown tool: ${name}`,
				};
		}
	}

	private async executeMutableCommand(
		args: Record<string, unknown>,
	): Promise<ToolExecutionResult> {
		const command = args['command'] as string;
		
		try {

			if (!command) {
				Logger.error('Command is required but not provided', args);
				return {
					success: false,
					output: '',
					error: 'Command is required',
				};
			}

			if (!this.terminalExecutor) {
				Logger.error('Terminal executor not available', {
					command,
					terminalExecutorExists: !!this.terminalExecutor,
				});
				return {
					success: false,
					output: '',
					error: 'Terminal executor not available',
				};
			}


			// Execute the command in the terminal context
			const result = await this.terminalExecutor.executeCommand(command);

			// Truncate to most recent characters for LLM context
			const truncatedResult = result.length > MAX_COMMAND_OUTPUT_LENGTH 
				? '...' + result.slice(-MAX_COMMAND_OUTPUT_LENGTH)
				: result;

			return {
				success: true,
				output: truncatedResult,
			};
		} catch (error) {
			const errorMessage = `Failed to execute command: ${
				error instanceof Error ? error.message : String(error)
			}`;
			
			Logger.error('Command execution failed', {
				command,
				error: errorMessage,
				errorType: error instanceof Error ? error.constructor.name : typeof error,
			});

			return {
				success: false,
				output: '',
				error: errorMessage,
			};
		}
	}
}
