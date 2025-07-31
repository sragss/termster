import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {grayScale, blueScale} from './colors.js';

interface PromptPaneProps {
	notesText: string;
	isSelected: boolean;
	height: number;
	onCommand?: (command: string) => void;
	onTextChange: (text: string) => void;
}

const PromptPane = ({
	notesText,
	isSelected,
	height,
	onCommand,
	onTextChange,
}: PromptPaneProps) => {
	const [currentText, setCurrentText] = useState(notesText);
	const [commandBuffer, setCommandBuffer] = useState('');

	// Update current text when notesText prop changes
	useEffect(() => {
		setCurrentText(notesText);
	}, [notesText]);

	useInput((input, key) => {
		if (!isSelected) return;

		if (key.return) {
			// Check if we have a command to execute
			if (commandBuffer.startsWith('/')) {
				const command = commandBuffer.slice(1); // Remove the "/"
				if (onCommand) {
					onCommand(command);
				}
				setCommandBuffer('');
				const newText = currentText + '\n';
				setCurrentText(newText);
				onTextChange(newText);
			} else {
				const newText = currentText + '\n';
				setCurrentText(newText);
				onTextChange(newText);
				setCommandBuffer('');
			}
		} else if (key.backspace || key.delete) {
			if (commandBuffer.length > 0) {
				setCommandBuffer(prev => prev.slice(0, -1));
			} else {
				const newText = currentText.slice(0, -1);
				setCurrentText(newText);
				onTextChange(newText);
			}
		} else if (input) {
			// If we're starting a command with "/"
			if (commandBuffer === '' && input === '/') {
				setCommandBuffer('/');
			} else if (commandBuffer.startsWith('/')) {
				setCommandBuffer(prev => prev + input);
			} else {
				const newText = currentText + input;
				setCurrentText(newText);
				onTextChange(newText);
			}
		}
	});

	// Display the current text plus any command being typed
	const displayText = currentText + commandBuffer;

	return (
		<Box
			width="50%"
			height={height}
			borderStyle="round"
			borderColor={isSelected ? blueScale.base : grayScale.light}
			padding={1}
		>
			<Text wrap="wrap">{displayText}</Text>
		</Box>
	);
};

export default PromptPane;
