import {TerminalHistoryService} from '../services/terminal-history.js';
import {TermsterTool} from './types.js';

// Tool execution result interface
export interface ToolExecutionResult {
	success: boolean;
	output: string;
	error?: string;
}

// Tool executor interface
export interface ToolExecutor {
	execute(
		name: string,
		args: Record<string, unknown>,
	): Promise<ToolExecutionResult>;
}

// Enhanced Termster Tool Definition
export const TERMINAL_HISTORY_TOOL: TermsterTool = {
	definition: {
		type: 'function',
		name: 'read_terminal_history',
		description:
			'Reads the inputs and outputs of recent terminal commands. Useful for understanding what commands were run and their results. For efficient searching, first use no_output=true to scan through command history quickly, then zero in on specific commands with full output.',
		strict: false,
		parameters: {
			type: 'object',
			properties: {
				count: {
					type: 'number',
					description:
						'Number of recent commands to retrieve (default: 5, max: 20)',
					minimum: 1,
					maximum: 20,
				},
				skip: {
					type: 'number',
					description: 'Number of most recent commands to skip (default: 0)',
					minimum: 0,
				},
				no_output: {
					type: 'boolean',
					description:
						'If true, only show command inputs without outputs for efficient scanning (default: false)',
				},
			},
			additionalProperties: false,
		},
	},
	requires_approval: false, // Read-only tool, no approval needed
	render: args => {
		const count = (args['count'] as number) || 5;
		const skip = (args['skip'] as number) || 0;
		const noOutput = (args['no_output'] as boolean) || false;

		// Plain text format for React component styling
		const skipStr = skip > 0 ? `, skip=${skip}` : '';
		const outputStr = noOutput ? ', no_output' : '';

		return `History(${count}${skipStr}${outputStr}) → ${count} lines`;
	},
};

// Tool Executor Implementation
export class TerminalHistoryToolExecutor implements ToolExecutor {
	constructor(private historyService: TerminalHistoryService) {}

	async execute(
		name: string,
		args: Record<string, unknown>,
	): Promise<ToolExecutionResult> {
		switch (name) {
			case 'read_terminal_history':
				return this.readTerminalHistory(args);
			default:
				return {
					success: false,
					output: '',
					error: `Unknown tool: ${name}`,
				};
		}
	}

	private async readTerminalHistory(
		args: Record<string, unknown>,
	): Promise<ToolExecutionResult> {
		try {
			const count = (args['count'] as number) || 5;
			const skip = (args['skip'] as number) || 0;
			const noOutput = (args['no_output'] as boolean) || false;

			const commands = this.historyService.getRecentCommands(count, skip);
			const formattedOutput = this.historyService.formatCommandsForLLM(
				commands,
				noOutput,
			);

			return {
				success: true,
				output: formattedOutput,
			};
		} catch (error) {
			return {
				success: false,
				output: '',
				error: `Failed to read terminal history: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	}
}
