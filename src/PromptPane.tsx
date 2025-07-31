import React, {useState, useCallback, useMemo} from 'react';
import {Box, Text, useInput} from 'ink';
import {grayScale, blueScale, whiteScale, redScale} from './colors.js';
import {TerminalHistoryService} from './services/terminal-history.js';
import {useLLMChat} from './hooks/useLLMChat.js';
import {PATTERNS, UI} from './constants.js';
import {TerminalExecutor} from './tools/mutable-execution.js';
import ThinkingAnimation from './components/ThinkingAnimation.js';

interface PromptPaneProps {
	isSelected: boolean;
	height: number;
	onCommand?: (command: string) => void;
	historyService?: TerminalHistoryService;
	terminalExecutor?: TerminalExecutor;
}

const PromptPane = ({
	isSelected,
	height,
	onCommand,
	historyService,
	terminalExecutor,
}: PromptPaneProps) => {
	const [currentInput, setCurrentInput] = useState('');
	const {history, pendingApproval, sendMessage, addCommand, approveToolCall, rejectToolCall} = useLLMChat({
		historyService,
		terminalExecutor,
	});

	// Memoize viewport calculations to prevent re-renders
	const visibleLines = useMemo(() => Math.max(5, height - 4), [height]);
	
	// Get recent history entries that fit (same approach as TerminalPane)
	const visibleHistory = useMemo(() => {
		return history.slice(-visibleLines);
	}, [history, visibleLines]);
	
	const hiddenCount = useMemo(() => history.length - visibleHistory.length, [history.length, visibleHistory.length]);
	const hasMoreHistory = useMemo(() => hiddenCount > 0, [hiddenCount]);

	// Component to render tool calls with brand colors
	const renderToolCallWithColors = useCallback((toolCallText: string) => {
		// Parse tool call format: "History(5, skip=0, no_output) → 5 lines"
		const match = toolCallText.match(PATTERNS.TOOL_CALL);
		if (!match) {
			return <Text color={blueScale.light}>{toolCallText}</Text>;
		}

		const [, toolName, params, result] = match;

		// Render as single inline text to prevent wrapping
		return (
			<Text>
				<Text color={grayScale.light}>↳ </Text>
				<Text color={redScale.dark}>{toolName}</Text>
				<Text color={grayScale.light}>(</Text>
				<Text color={whiteScale.light}>{params}</Text>
				<Text color={grayScale.light}>) → </Text>
				<Text color={redScale.base}>{result}</Text>
			</Text>
		);
	}, []);

	// Create a stable timestamp for the current input session
	const [currentTimestamp] = useState(() => {
		const now = new Date();
		return now.toLocaleTimeString('en-US', UI.TIMESTAMP_FORMAT);
	});
	

	useInput((input, key) => {
		if (!isSelected) return;

		// Handle approval flow
		if (pendingApproval) {
			if (key.return) {
				approveToolCall();
				return;
			} else if (key.escape) {
				rejectToolCall();
				return;
			}
			// Block all other input during approval
			return;
		}

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
			<Box flexDirection="column" flexGrow={1} overflow="hidden">
				{hasMoreHistory && (
					<Text dimColor>⋮ ({hiddenCount} more entries above)</Text>
				)}
				{visibleHistory.map((entry, index) => (
					<Box key={index} marginBottom={0}>
						<Text dimColor>[{entry.timestamp}] </Text>
						{entry.type === 'thinking' ? (
							<ThinkingAnimation />
						) : entry.type === 'tool_call' ? (
							renderToolCallWithColors(entry.command)
						) : entry.type === 'approval_pending' ? (
							<Text color={redScale.base} wrap="wrap">
								{entry.command}
							</Text>
						) : entry.type === 'approval_granted' ? (
							<Text color="green" wrap="wrap">
								✓ {entry.command}
							</Text>
						) : entry.type === 'approval_denied' ? (
							<Text color="red" wrap="wrap">
								✗ {entry.command}
							</Text>
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
			<Box width="100%">
				{pendingApproval ? (
					<Text wrap="wrap" color={blueScale.base}>
						<Text dimColor>[{currentTimestamp}] </Text>
						Waiting for approval... [Enter=Yes, Esc=No]{isSelected && <Text inverse> </Text>}
					</Text>
				) : (
					<Text wrap="wrap">
						<Text dimColor>[{currentTimestamp}] </Text>
						<Text color={currentInput.startsWith('/') ? 'green' : 'white'}>
							{currentInput}{isSelected && <Text inverse> </Text>}
						</Text>
					</Text>
				)}
			</Box>
		</Box>
	);
};

export default PromptPane;
