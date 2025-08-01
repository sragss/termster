import React, {useCallback, useMemo} from 'react';
import {Box, Text} from 'ink';
import {grayScale, blueScale, whiteScale, redScale} from './colors.js';
import {PATTERNS, UI} from './constants.js';
import {usePromptContext} from './contexts/PromptContext.js';
import ThinkingAnimation from './components/ThinkingAnimation.js';
import ExecutingAnimation from './components/ExecutingAnimation.js';

interface PromptPaneProps {
	isSelected: boolean;
	height: number;
}

const PromptPane = ({isSelected, height}: PromptPaneProps) => {
	const {history} = usePromptContext();

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
						) : entry.type === 'executing' ? (
							<ExecutingAnimation />
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

		</Box>
	);
};

export default PromptPane;
