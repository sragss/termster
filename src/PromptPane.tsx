import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {grayScale, blueScale} from './colors.js';

interface CommandEntry {
	command: string;
	timestamp: string;
	type: 'command' | 'text';
}

interface PromptPaneProps {
	isSelected: boolean;
	height: number;
	onCommand?: (command: string) => void;
}

const PromptPane = ({
	isSelected,
	height,
	onCommand,
}: PromptPaneProps) => {
	const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);
	const [currentInput, setCurrentInput] = useState('');

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
					// It's regular text
					setCommandHistory(prev => [
						...prev,
						{command: currentInput, timestamp, type: 'text'},
					]);
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
						<Text
							color={entry.type === 'command' ? 'green' : 'white'}
							wrap="wrap"
						>
							{entry.command}
						</Text>
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
