import React, {useState, useCallback} from 'react';
import {Box, Text, useInput} from 'ink';
import {grayScale, blueScale, whiteScale, redScale} from './colors.js';
import ThinkingAnimation from './components/ThinkingAnimation.js';
import {TerminalHistoryService} from './services/terminal-history.js';
import {useLLMChat} from './hooks/useLLMChat.js';
import {PATTERNS, UI} from './constants.js';

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
	const [currentInput, setCurrentInput] = useState('');
	const {history, sendMessage, addCommand} = useLLMChat({historyService});

	// Component to render tool calls with brand colors
	const renderToolCallWithColors = useCallback((toolCallText: string) => {
		// Parse tool call format: "History(5, skip=0, no_output) → 5 lines"
		const match = toolCallText.match(PATTERNS.TOOL_CALL);
		if (!match) {
			return <Text color={blueScale.light}>{toolCallText}</Text>;
		}

		const [, toolName, params, result] = match;

		return (
			<>
				<Text color={grayScale.light}>↳ </Text>
				<Text color={redScale.dark}>{toolName}</Text>
				<Text color={grayScale.light}>(</Text>
				<Text color={whiteScale.light}>{params}</Text>
				<Text color={grayScale.light}>) </Text>
				<Text color={grayScale.light}>→ </Text>
				<Text color={redScale.base}>{result}</Text>
			</>
		);
	}, []);

	const formatTimestamp = useCallback(() => {
		const now = new Date();
		return now.toLocaleTimeString('en-US', UI.TIMESTAMP_FORMAT);
	}, []);

	useInput((input, key) => {
		if (!isSelected) return;

		if (key.return) {
			if (currentInput.trim()) {
				if (currentInput.startsWith('/')) {
					// It's a command
					const command = currentInput.slice(1); // Remove the "/"
					addCommand(currentInput);
					
					if (onCommand) {
						onCommand(command);
					}
				} else {
					// It's regular text - send to LLM
					sendMessage(currentInput);
				}

				setCurrentInput('');
			}
		} else if (key.backspace || key.delete) {
			setCurrentInput(prev => prev.slice(0, -1));
		} else if (input) {
			setCurrentInput(prev => prev + input);
		}
	});


	return (
		<Box
			width={UI.PANE_WIDTH}
			height={height}
			borderStyle="round"
			borderColor={isSelected ? blueScale.base : grayScale.light}
			padding={1}
			flexDirection="column"
		>
			{/* Command history */}
			<Box flexDirection="column" flexGrow={1}>
				{history.map((entry, index) => (
					<Box key={index} marginBottom={0}>
						<Text dimColor>[{entry.timestamp}] </Text>
						{entry.type === 'thinking' ? (
							<ThinkingAnimation />
						) : entry.type === 'tool_call' ? (
							renderToolCallWithColors(entry.command)
						) : (
							<Text
								color={
									entry.type === 'command'
										? 'green'
										: entry.type === 'assistant'
										? blueScale.base
										: 'white'
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
				<Text color={currentInput.startsWith('/') ? 'green' : 'white'}>
					{currentInput}
					{isSelected && <Text inverse> </Text>}
				</Text>
			</Box>
		</Box>
	);
};

export default PromptPane;
