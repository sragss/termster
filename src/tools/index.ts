import {
	TERMINAL_HISTORY_TOOL,
	TerminalHistoryToolExecutor,
} from './terminal-history.js';
import {
	MUTABLE_EXECUTION_TOOL,
	MutableExecutionToolExecutor,
} from './mutable-execution.js';
import {TerminalHistoryService} from '../services/terminal-history.js';
import {TermsterTool, OpenAI_FunctionTool} from './types.js';
import {TerminalExecutor} from './mutable-execution.js';
import {Logger} from '../services/logger.js';
import {ConfigService} from '../services/config.js';

// Export all Termster tools
export const ALL_TOOLS: TermsterTool[] = [
	TERMINAL_HISTORY_TOOL,
	MUTABLE_EXECUTION_TOOL,
];

// Helper function to extract OpenAI tool definitions for API calls
export function getOpenAITools(): OpenAI_FunctionTool[] {
	return ALL_TOOLS.map(tool => tool.definition);
}

// Helper function to render a tool call
export function renderToolCall(
	name: string,
	args: Record<string, unknown>,
): string {
	const tool = ALL_TOOLS.find(t => t.definition.name === name);
	if (!tool) {
		return `Unknown tool: ${name}`;
	}
	return tool.render(args);
}

// Helper function to render tool approval prompt
export function renderToolApproval(
	name: string,
	args: Record<string, unknown>,
): string {
	const tool = ALL_TOOLS.find(t => t.definition.name === name);
	if (!tool) {
		return `Unknown tool: ${name}`;
	}
	if (!tool.render_approval) {
		return `Tool '${name}' requires approval but has no approval renderer`;
	}
	return tool.render_approval(args);
}

// Helper function to check if a tool requires approval
export function toolRequiresApproval(name: string): boolean {
	const tool = ALL_TOOLS.find(t => t.definition.name === name);
	return tool?.requires_approval ?? false;
}

// Export tool executors
export {TerminalHistoryToolExecutor, MutableExecutionToolExecutor};

// Export shared types
export type {ToolExecutor, ToolExecutionResult} from './types.js';

// Export individual tools for direct import
export {TERMINAL_HISTORY_TOOL} from './terminal-history.js';
export {MUTABLE_EXECUTION_TOOL} from './mutable-execution.js';

// Main tool registry class (replaces the old TerminalToolExecutor)
export class ToolRegistry {
	private terminalHistoryExecutor?: TerminalHistoryToolExecutor;
	private mutableExecutionExecutor: MutableExecutionToolExecutor;

	constructor(
		historyService?: TerminalHistoryService,
		terminalExecutor?: TerminalExecutor,
	) {
		const configService = new ConfigService();
		
		// Initialize logger based on config
		Logger.setEnabled(configService.isLoggingEnabled());
		
		if (historyService) {
			this.terminalHistoryExecutor = new TerminalHistoryToolExecutor(
				historyService,
			);
		}
		this.mutableExecutionExecutor = new MutableExecutionToolExecutor(
			terminalExecutor,
		);
		
	}

	async execute(name: string, args: Record<string, unknown>) {
		const startTime = Date.now();
		
		// Log the tool call
		Logger.info(`TOOL_CALL: ${name}`, { args });
		
		let result;
		
		switch (name) {
			case 'read_terminal_history':
				if (!this.terminalHistoryExecutor) {
					result = {
						success: false,
						output: '',
						error: 'Terminal history service not available',
					};
				} else {
					result = await this.terminalHistoryExecutor.execute(name, args);
				}
				break;
			case 'execute_mutable_command':
				result = await this.mutableExecutionExecutor.execute(name, args);
				break;
			default:
				result = {
					success: false,
					output: '',
					error: `Unknown tool: ${name}`,
				};
		}
		
		// Log the result
		const duration = Date.now() - startTime;
		Logger.info(`TOOL_RESULT: ${name}`, {
			success: result.success,
			result: result.success ? 
				(result.output.length > 200 ? result.output.substring(0, 200) + '...' : result.output) :
				result.error,
			duration: `${duration}ms`,
		});
		
		return result;
	}
}
