import React, {useMemo} from 'react';
import {Box, Text} from 'ink';
import {blueScale} from '../colors.js';
import {usePromptContext} from '../contexts/PromptContext.js';
import {UI} from '../constants.js';

interface InputBoxProps {
	isSelected: boolean;
	height: number;
}

const InputBox = ({isSelected, height}: InputBoxProps) => {
	const {currentInput, pendingApproval} = usePromptContext();

	// Generate timestamp dynamically - updates when currentInput changes from empty to non-empty
	const currentTimestamp = useMemo(() => {
		const now = new Date();
		return now.toLocaleTimeString('en-US', UI.TIMESTAMP_FORMAT);
	}, [currentInput.length === 0]); // Regenerate when input starts fresh
	
	if (!isSelected) {
		return null; // Only show when prompt pane is selected
	}

	return (
		<Box
			width="100%"
			height={height}
			borderStyle="round"
			borderColor={blueScale.base}
			padding={1}
			flexDirection="column"
			justifyContent="center"
		>
			{pendingApproval ? (
				<Text wrap="wrap" color={blueScale.base}>
					<Text dimColor>[{currentTimestamp}] </Text>
					Waiting for approval... [Enter=Yes, Esc=No]{<Text inverse> </Text>}
				</Text>
			) : (
				<Text wrap="wrap">
					<Text dimColor>[{currentTimestamp}] </Text>
					<Text color={currentInput.startsWith('/') ? 'green' : 'white'}>
						{currentInput}{<Text inverse> </Text>}
					</Text>
				</Text>
			)}
		</Box>
	);
};

export default InputBox;