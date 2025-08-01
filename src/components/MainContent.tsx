import React from 'react';
import {Box, useInput} from 'ink';
import TerminalPane from '../TerminalPane.js';
import PromptPane from '../PromptPane.js';
import InputBox from './InputBox.js';
import {usePromptContext} from '../contexts/PromptContext.js';

interface MainContentProps {
	selectedPane: 'terminal' | 'prompt';
	setSelectedPane: (pane: 'terminal' | 'prompt') => void;
	dimensions: {
		paneHeight: number;
		totalCols: number;
		inputBoxHeight: number;
		availableHeight: number;
	};
	onPtyReady: (pty: any) => void;
	historyService: any;
}

const MainContent = ({
	selectedPane,
	setSelectedPane,
	dimensions,
	onPtyReady,
	historyService,
}: MainContentProps) => {
	const {handleInput} = usePromptContext();

	useInput((input, key) => {
		// Handle pane switching
		if (key.shift && key.tab) {
			setSelectedPane(selectedPane === 'terminal' ? 'prompt' : 'terminal');
			return;
		}

		// Delegate input to prompt handler when prompt pane is selected
		if (selectedPane === 'prompt') {
			handleInput(input, key);
		}
		// Terminal input is handled by TerminalPane component
	});

	// Use the full available height for the main content area
	const terminalHeight = dimensions.availableHeight;
	const promptHeight = dimensions.paneHeight;

	return (
		<Box width="100%" height={terminalHeight}>
			{/* Left side: Terminal pane (full height) */}
			<TerminalPane
				isSelected={selectedPane === 'terminal'}
				height={terminalHeight}
				totalCols={dimensions.totalCols}
				onPtyReady={onPtyReady}
				historyService={historyService}
			/>
			
			{/* Right side: PromptPane + InputBox */}
			<Box width="50%" height={terminalHeight} flexDirection="column">
				<PromptPane
					isSelected={selectedPane === 'prompt'}
					height={promptHeight}
				/>
				
				{/* Input Box - always shown, only interactive when prompt pane is selected */}
				<InputBox
					isSelected={selectedPane === 'prompt'}
					height={dimensions.inputBoxHeight}
				/>
			</Box>
		</Box>
	);
};

export default MainContent;