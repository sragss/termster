import {useState, useRef, useCallback} from 'react';
import {ChatLoop} from '../services/llm.js';
import {StreamingChatCallback} from '../types/llm.js';
import {TerminalHistoryService} from '../services/terminal-history.js';
import {renderToolCall} from '../tools/index.js';
import {UI} from '../constants.js';

interface CommandEntry {
	command: string;
	timestamp: string;
	type: 'command' | 'text' | 'assistant' | 'thinking' | 'tool_call';
}

interface UseLLMChatOptions {
	historyService?: TerminalHistoryService;
}

interface UseLLMChatResult {
	history: CommandEntry[];
	isLoading: boolean;
	sendMessage: (message: string) => Promise<void>;
	addCommand: (command: string) => void;
}

const formatTimestamp = (): string => {
	const now = new Date();
	return now.toLocaleTimeString('en-US', UI.TIMESTAMP_FORMAT);
};

export const useLLMChat = ({
	historyService,
}: UseLLMChatOptions = {}): UseLLMChatResult => {
	const [history, setHistory] = useState<CommandEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const chatService = useRef<ChatLoop | null>(null);

	// Initialize chat service
	if (!chatService.current && historyService) {
		chatService.current = new ChatLoop(historyService);
	}

	const addCommand = useCallback((command: string) => {
		const timestamp = formatTimestamp();
		setHistory(prev => [
			...prev,
			{command, timestamp, type: 'command'},
		]);
	}, []);

	const sendMessage = useCallback(async (userInput: string) => {
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
				// Add tool call to history, move thinking below it
				const toolTimestamp = formatTimestamp();
				const renderedCall = renderToolCall(toolCall.name, toolCall.args);
				
				setHistory(prev => {
					const withoutThinking = prev.filter(entry => entry.type !== 'thinking');
					return [
						...withoutThinking,
						{command: renderedCall, timestamp: toolTimestamp, type: 'tool_call'},
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
			},
			onComplete: (message: string) => {
				const responseTimestamp = formatTimestamp();
				setHistory(prev => {
					const withoutThinking = prev.filter(entry => entry.type !== 'thinking');
					return [
						...withoutThinking,
						{command: message, timestamp: responseTimestamp, type: 'assistant'},
					];
				});
				setIsLoading(false);
			},
			onError: (error: Error) => {
				const errorTimestamp = formatTimestamp();
				setHistory(prev => {
					const withoutThinking = prev.filter(entry => entry.type !== 'thinking');
					return [
						...withoutThinking,
						{command: `Error: ${error.message}`, timestamp: errorTimestamp, type: 'assistant'},
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
	}, [isLoading]);

	return {
		history,
		isLoading,
		sendMessage,
		addCommand,
	};
};