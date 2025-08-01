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

	return (
		<>
			<Box width="100%" height={dimensions.paneHeight}>
				<TerminalPane
					isSelected={selectedPane === 'terminal'}
					height={dimensions.paneHeight}
					totalCols={dimensions.totalCols}
					onPtyReady={onPtyReady}
					historyService={historyService}
				/>
				<PromptPane
					isSelected={selectedPane === 'prompt'}
					height={dimensions.paneHeight}
				/>
			</Box>

			{/* Input Box - only shown when prompt pane is selected */}
			<InputBox
				isSelected={selectedPane === 'prompt'}
				height={dimensions.inputBoxHeight}
			/>
		</>
	);
};

export default MainContent;