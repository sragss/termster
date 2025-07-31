import React, {useState, useRef, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {grayScale, blueScale} from './colors.js';
import {ChatLoop} from './services/llm.js';
import {StreamingChatCallback} from './types/llm.js';
import ThinkingAnimation from './components/ThinkingAnimation.js';
import {TerminalHistoryService} from './services/terminal-history.js';

interface CommandEntry {
	command: string;
	timestamp: string;
	type: 'command' | 'text' | 'assistant' | 'thinking';
}

interface PromptPaneProps {
	isSelected: boolean;
	height: number;
	onCommand?: (command: string) => void;
	historyService?: TerminalHistoryService;
}

const PromptPane = ({
	isSelected,
	height,
	onCommand,
	historyService,
}: PromptPaneProps) => {
	const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);
	const [currentInput, setCurrentInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const chatService = useRef<ChatLoop | null>(null);

	useEffect(() => {
		chatService.current = new ChatLoop(historyService);
	}, [historyService]);

	const formatTimestamp = () => {
		const now = new Date();
		return now.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	};

	useInput((input, key) => {
		if (!isSelected) return;

		if (key.return) {
			if (currentInput.trim()) {
				const timestamp = formatTimestamp();
				
				if (currentInput.startsWith('/')) {
					// It's a command
					const command = currentInput.slice(1); // Remove the "/"
					setCommandHistory(prev => [
						...prev,
						{command: currentInput, timestamp, type: 'command'},
					]);
					
					if (onCommand) {
						onCommand(command);
					}
				} else {
					// It's regular text - send to LLM
					setCommandHistory(prev => [
						...prev,
						{command: currentInput, timestamp, type: 'text'},
						{command: '', timestamp, type: 'thinking'},
					]);
					
					// Send to LLM
					handleLLMRequest(currentInput);
				}
				
				setCurrentInput('');
			}
		} else if (key.backspace || key.delete) {
			setCurrentInput(prev => prev.slice(0, -1));
		} else if (input) {
			setCurrentInput(prev => prev + input);
		}
	});

	const handleLLMRequest = async (userInput: string) => {
		if (!chatService.current || isLoading) return;
		
		setIsLoading(true);
		
		const callbacks: StreamingChatCallback = {
			onToolCall: async (toolCall) => {
				if (chatService.current?.toolExecutor) {
					const result = await chatService.current.toolExecutor.execute(
						toolCall.name, 
						toolCall.args
					);
					return result.success ? result.output : `Error: ${result.error}`;
				}
				return 'Tool execution not available';
			},
			onComplete: (message: string) => {
				const timestamp = formatTimestamp();
				setCommandHistory(prev => {
					// Remove the 'thinking...' entry and add the assistant response
					const withoutThinking = prev.filter(entry => entry.type !== 'thinking');
					return [
						...withoutThinking,
						{command: message, timestamp, type: 'assistant'},
					];
				});
				setIsLoading(false);
			},
			onError: (error: Error) => {
				const timestamp = formatTimestamp();
				setCommandHistory(prev => {
					// Remove the 'thinking...' entry and add error message
					const withoutThinking = prev.filter(entry => entry.type !== 'thinking');
					return [
						...withoutThinking,
						{command: `Error: ${error.message}`, timestamp, type: 'assistant'},
					];
				});
				setIsLoading(false);
			}
		};
		
		try {
			await chatService.current.chat(userInput, callbacks);
		} catch (error) {
			callbacks.onError?.(error as Error);
		}
	};

	return (
		<Box
			width="50%"
			height={height}
			borderStyle="round"
			borderColor={isSelected ? blueScale.base : grayScale.light}
			padding={1}
			flexDirection="column"
		>
			{/* Command history */}
			<Box flexDirection="column" flexGrow={1}>
				{commandHistory.map((entry, index) => (
					<Box key={index} marginBottom={0}>
						<Text dimColor>[{entry.timestamp}] </Text>
						{entry.type === 'thinking' ? (
							<ThinkingAnimation />
						) : (
							<Text
								color={
									entry.type === 'command' ? 'green' :
									entry.type === 'assistant' ? blueScale.base :
									'white'
								}
								wrap="wrap"
							>
								{entry.command}
							</Text>
						)}
					</Box>
				))}
			</Box>
			
			{/* Current input line */}
			<Box>
				<Text dimColor>[{formatTimestamp()}] </Text>
				<Text
					color={currentInput.startsWith('/') ? 'green' : 'white'}
				>
					{currentInput}
					{isSelected && <Text inverse> </Text>}
				</Text>
			</Box>
		</Box>
	);
};

export default PromptPane;
