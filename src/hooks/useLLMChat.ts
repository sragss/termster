import {useState, useRef, useCallback, useEffect} from 'react';
import {ChatLoop} from '../services/llm.js';
import {StreamingChatCallback} from '../types/llm.js';
import {TerminalHistoryService} from '../services/terminal-history.js';
import {renderToolCall, renderToolApproval, toolRequiresApproval} from '../tools/index.js';
import {UI} from '../constants.js';
import {TerminalExecutor} from '../tools/mutable-execution.js';
import {Logger} from '../services/logger.js';

interface CommandEntry {
	command: string;
	timestamp: string;
	type:
		| 'command'
		| 'text'
		| 'assistant'
		| 'thinking'
		| 'tool_call'
		| 'approval_pending'
		| 'approval_granted'
		| 'approval_denied';
}

interface UseLLMChatOptions {
	historyService?: TerminalHistoryService;
	terminalExecutor?: TerminalExecutor;
}

interface UseLLMChatResult {
	history: CommandEntry[];
	isLoading: boolean;
	pendingApproval: {toolCall: any; renderedApproval: string} | null;
	sendMessage: (message: string) => Promise<void>;
	addCommand: (command: string) => void;
	approveToolCall: () => void;
	rejectToolCall: () => void;
}

const formatTimestamp = (): string => {
	const now = new Date();
	return now.toLocaleTimeString('en-US', UI.TIMESTAMP_FORMAT);
};

export const useLLMChat = ({
	historyService,
	terminalExecutor,
}: UseLLMChatOptions = {}): UseLLMChatResult => {
	const [history, setHistory] = useState<CommandEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [pendingApproval, setPendingApproval] = useState<{toolCall: any; renderedApproval: string} | null>(null);
	const chatService = useRef<ChatLoop | null>(null);
	const pendingToolExecuteResolve = useRef<((result: string) => void) | null>(null);

	// Initialize chat service when historyService or terminalExecutor changes
	useEffect(() => {
		if (historyService) {
			chatService.current = new ChatLoop(historyService, terminalExecutor);
		}
	}, [historyService, terminalExecutor]);

	const addCommand = useCallback((command: string) => {
		const timestamp = formatTimestamp();
		setHistory(prev => [...prev, {command, timestamp, type: 'command'}]);
	}, []);

	const approveToolCall = useCallback(() => {
		if (!pendingApproval || !pendingToolExecuteResolve.current) return;
		
		Logger.info(`APPROVAL: ${pendingApproval.toolCall.name} -> GRANTED`);
		
		const timestamp = formatTimestamp();
		setHistory(prev => {
			const withoutPending = prev.filter(entry => entry.type !== 'approval_pending');
			return [
				...withoutPending,
				{command: 'Approved', timestamp, type: 'approval_granted'},
				{command: '', timestamp, type: 'thinking'},
			];
		});

		// Execute the tool and show the normal render output
		if (chatService.current?.toolExecutor) {
			chatService.current.toolExecutor.execute(
				pendingApproval.toolCall.name,
				pendingApproval.toolCall.args,
			).then(result => {
				const executionResult = result.success ? result.output : `Error: ${result.error}`;
				
				// Add the executed tool call to history
				const renderedCall = renderToolCall(pendingApproval.toolCall.name, pendingApproval.toolCall.args);
				const timestamp = formatTimestamp();
				setHistory(prev => {
					const withoutThinking = prev.filter(entry => entry.type !== 'thinking');
					return [
						...withoutThinking,
						{command: renderedCall, timestamp, type: 'tool_call'},
					];
				});
				
				pendingToolExecuteResolve.current?.(executionResult);
				pendingToolExecuteResolve.current = null;
			});
		} else {
			pendingToolExecuteResolve.current('Tool execution not available');
			pendingToolExecuteResolve.current = null;
		}
		
		setPendingApproval(null);
	}, [pendingApproval]);

	const rejectToolCall = useCallback(() => {
		if (!pendingApproval || !pendingToolExecuteResolve.current) return;
		
		Logger.info(`APPROVAL: ${pendingApproval.toolCall.name} -> DENIED`);
		
		const timestamp = formatTimestamp();
		setHistory(prev => {
			const withoutPending = prev.filter(entry => entry.type !== 'approval_pending');
			return [
				...withoutPending,
				{command: 'Rejected', timestamp, type: 'approval_denied'},
			];
		});

		pendingToolExecuteResolve.current('Tool execution was rejected by user');
		pendingToolExecuteResolve.current = null;
		setPendingApproval(null);
	}, [pendingApproval]);

	const sendMessage = useCallback(
		async (userInput: string) => {
			if (!chatService.current || isLoading) return;

			const timestamp = formatTimestamp();

			// Add user message and thinking indicator
			setHistory(prev => [
				...prev,
				{command: userInput, timestamp, type: 'text'},
				{command: '', timestamp, type: 'thinking'},
			]);

			setIsLoading(true);

			const callbacks: StreamingChatCallback = {
				onToolCall: async toolCall => {
					const toolTimestamp = formatTimestamp();
					
					// Check if tool requires approval
					if (toolRequiresApproval(toolCall.name)) {
						Logger.info(`APPROVAL: ${toolCall.name} -> PENDING`, { args: toolCall.args });
						
						const renderedApproval = renderToolApproval(toolCall.name, toolCall.args);
						
						// Add approval request to history
						setHistory(prev => {
							const withoutThinking = prev.filter(
								entry => entry.type !== 'thinking',
							);
							return [
								...withoutThinking,
								{
									command: renderedApproval,
									timestamp: toolTimestamp,
									type: 'approval_pending',
								},
							];
						});
						
						// Set pending approval state and wait for user decision
						setPendingApproval({toolCall, renderedApproval});
						
						return new Promise<string>((resolve) => {
							pendingToolExecuteResolve.current = resolve;
						});
					} else {
						// Non-approval tool - execute immediately
						const renderedCall = renderToolCall(toolCall.name, toolCall.args);
						
						setHistory(prev => {
							const withoutThinking = prev.filter(
								entry => entry.type !== 'thinking',
							);
							return [
								...withoutThinking,
								{
									command: renderedCall,
									timestamp: toolTimestamp,
									type: 'tool_call',
								},
								{command: '', timestamp: toolTimestamp, type: 'thinking'},
							];
						});

						if (chatService.current?.toolExecutor) {
							const result = await chatService.current.toolExecutor.execute(
								toolCall.name,
								toolCall.args,
							);
							return result.success ? result.output : `Error: ${result.error}`;
						}
						return 'Tool execution not available';
					}
				},
				onComplete: (message: string) => {
					const responseTimestamp = formatTimestamp();
					setHistory(prev => {
						const withoutThinking = prev.filter(
							entry => entry.type !== 'thinking',
						);
						return [
							...withoutThinking,
							{
								command: message,
								timestamp: responseTimestamp,
								type: 'assistant',
							},
						];
					});
					setIsLoading(false);
				},
				onError: (error: Error) => {
					const errorTimestamp = formatTimestamp();
					setHistory(prev => {
						const withoutThinking = prev.filter(
							entry => entry.type !== 'thinking',
						);
						return [
							...withoutThinking,
							{
								command: `Error: ${error.message}`,
								timestamp: errorTimestamp,
								type: 'assistant',
							},
						];
					});
					setIsLoading(false);
				},
			};

			try {
				await chatService.current.chat(userInput, callbacks);
			} catch (error) {
				callbacks.onError?.(error as Error);
			}
		},
		[isLoading],
	);

	return {
		history,
		isLoading,
		pendingApproval,
		sendMessage,
		addCommand,
		approveToolCall,
		rejectToolCall,
	};
};
